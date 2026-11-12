import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { GithubSyncRecordDocument } from "@/lib/db/models";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const records = await db.collection<GithubSyncRecordDocument>("githubSyncRecords")
    .find({ userId: user.id })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(30)
    .toArray();

  return NextResponse.json({
    items: records.map((record) => ({
      id: record._id?.toString(),
      submissionId: record.submissionId,
      repositoryFullName: record.repositoryFullName,
      branch: record.branch,
      filePath: record.filePath,
      status: record.status,
      syncedAt: record.syncedAt?.toISOString() ?? null,
      errorCode: record.errorCode ?? null
    }))
  });
}
