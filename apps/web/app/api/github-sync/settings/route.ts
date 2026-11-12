import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { GithubInstallationDocument, GithubSyncSettingsDocument } from "@/lib/db/models";
import { listInstallationRepositories } from "@/lib/github/app";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const [installation, settings] = await Promise.all([
    db.collection<GithubInstallationDocument>("githubInstallations").findOne({ userId: user.id }),
    db.collection<GithubSyncSettingsDocument>("githubSyncSettings").findOne({ userId: user.id })
  ]);

  return NextResponse.json({
    installation: installation ? {
      installationId: installation.installationId,
      accountLogin: installation.accountLogin,
      accountType: installation.accountType
    } : null,
    settings: settings ? {
      repositoryId: settings.repositoryId,
      repositoryFullName: settings.repositoryFullName,
      branch: settings.branch,
      folderPath: settings.folderPath,
      enabled: settings.enabled
    } : null
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const value = body as Record<string, unknown>;
  const repositoryId = Number(value.repositoryId);
  const repositoryFullName = typeof value.repositoryFullName === "string" ? value.repositoryFullName.trim() : "";
  const branch = typeof value.branch === "string" ? value.branch.trim() : "";
  const folderPath = typeof value.folderPath === "string" ? value.folderPath.trim().replace(/^\/+|\/+$/g, "") : "";
  const enabled = value.enabled === true;

  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0 ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repositoryFullName)) {
    return NextResponse.json({ error: "Choose a valid repository from the connected installation." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9._/-]{1,120}$/.test(branch) || branch.includes("..") || branch.startsWith("/") || branch.endsWith("/")) {
    return NextResponse.json({ error: "Branch name contains unsupported characters." }, { status: 400 });
  }
  if (folderPath && (!/^[A-Za-z0-9._/-]{1,180}$/.test(folderPath) || folderPath.split("/").some((part) => !part || part === "." || part === ".."))) {
    return NextResponse.json({ error: "Folder path contains unsupported segments." }, { status: 400 });
  }

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const installation = await db.collection<GithubInstallationDocument>("githubInstallations").findOne({ userId: user.id });
  if (!installation) return NextResponse.json({ error: "Connect your GitHub App installation first." }, { status: 409 });

  try {
    const repositories = await listInstallationRepositories(installation.installationId);
    const selected = repositories.find((repository) =>
      repository.id === repositoryId && repository.full_name.toLowerCase() === repositoryFullName.toLowerCase()
    );
    if (!selected) return NextResponse.json({ error: "The selected repository is not available to this installation." }, { status: 403 });

    const now = new Date();
    await db.collection<GithubSyncSettingsDocument>("githubSyncSettings").updateOne(
      { userId: user.id },
      {
        $set: {
          installationId: installation.installationId,
          repositoryId: selected.id,
          repositoryFullName: selected.full_name,
          branch,
          folderPath,
          enabled,
          updatedAt: now
        },
        $setOnInsert: { userId: user.id }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      settings: {
        repositoryId: selected.id,
        repositoryFullName: selected.full_name,
        branch,
        folderPath,
        enabled
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not validate repository settings."
    }, { status: 502 });
  }
}
