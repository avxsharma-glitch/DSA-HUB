import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { SubmissionDocument } from "@/lib/db/models";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const collection = db.collection<SubmissionDocument>("submissions");
  const match = { userId: user.id };
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalSolved, lastSevenDays, byPlatform, byDifficulty] = await Promise.all([
    collection.countDocuments(match),
    collection.countDocuments({ ...match, submittedAt: { $gte: since } }),
    collection.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: "$platform", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray(),
    collection.aggregate<{ _id: string | null; count: number }>([
      { $match: match },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray()
  ]);

  return NextResponse.json({
    totalSolved,
    lastSevenDays,
    byPlatform: byPlatform.map((item) => ({ platform: item._id, count: item.count })),
    byDifficulty: byDifficulty.map((item) => ({ difficulty: item._id ?? "Unspecified", count: item.count }))
  });
}
