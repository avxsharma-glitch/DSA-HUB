import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { GithubInstallationDocument } from "@/lib/db/models";
import { listInstallationRepositories } from "@/lib/github/app";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const installation = await db.collection<GithubInstallationDocument>("githubInstallations")
    .findOne({ userId: user.id });

  if (!installation) {
    return NextResponse.json({ error: "Connect your GitHub App installation first." }, { status: 409 });
  }

  try {
    const repositories = await listInstallationRepositories(installation.installationId);
    return NextResponse.json({
      repositories: repositories.map((repository) => ({
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        private: repository.private,
        defaultBranch: repository.default_branch,
        url: repository.html_url
      }))
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not load repositories from GitHub."
    }, { status: 502 });
  }
}
