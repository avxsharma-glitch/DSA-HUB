import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { GithubInstallationDocument } from "@/lib/db/models";
import { getGithubInstallation, isGithubAppConfigured } from "@/lib/github/app";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const installation = await db.collection<GithubInstallationDocument>("githubInstallations")
    .findOne({ userId: user.id }, { projection: { _id: 0, userId: 0 } });

  return NextResponse.json({
    configured: isGithubAppConfigured(),
    installation: installation ? {
      installationId: installation.installationId,
      accountLogin: installation.accountLogin,
      accountType: installation.accountType
    } : null
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isGithubAppConfigured()) {
    return NextResponse.json({ error: "GitHub App is not configured on this DSAHub server. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const installationId = typeof body === "object" && body !== null && "installationId" in body
    ? Number((body as { installationId: unknown }).installationId)
    : NaN;
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    return NextResponse.json({ error: "Enter a valid GitHub App installation ID." }, { status: 400 });
  }

  try {
    const installation = await getGithubInstallation(installationId);
    if (installation.app_id !== Number(process.env.GITHUB_APP_ID)) {
      return NextResponse.json({ error: "This installation belongs to a different GitHub App." }, { status: 403 });
    }

    // Bind a personal installation to the GitHub identity that authenticated
    // this DSAHub session. This prevents another DSAHub user from claiming a
    // guessed installation ID that belongs to someone else.
    const db = await getDatabase();
    await ensureDataIndexes(db);
    const githubAccount = await db.collection<{ providerAccountId: string; provider: string; userId: string }>("accounts")
      .findOne({ userId: user.id, provider: "github" });
    if (!githubAccount || installation.account.type !== "User" ||
        String(installation.account.id) !== String(githubAccount.providerAccountId)) {
      return NextResponse.json({
        error: "For security, this version supports personal GitHub App installations belonging to the GitHub account you used to sign in. Organization installations are not supported yet."
      }, { status: 403 });
    }
    if (!installation.account?.login) {
      return NextResponse.json({ error: "GitHub did not return a supported installation account." }, { status: 422 });
    }

    const now = new Date();
    await db.collection<GithubInstallationDocument>("githubInstallations").updateOne(
      { userId: user.id },
      {
        $set: {
          installationId,
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          updatedAt: now
        },
        $setOnInsert: { userId: user.id, createdAt: now }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      installation: {
        installationId,
        accountLogin: installation.account.login,
        accountType: installation.account.type
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not verify this GitHub App installation."
    }, { status: 400 });
  }
}

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDatabase();
  await ensureDataIndexes(db);
  await db.collection("githubInstallations").deleteOne({ userId: user.id });
  await db.collection("githubSyncSettings").deleteOne({ userId: user.id });
  return NextResponse.json({ success: true });
}
