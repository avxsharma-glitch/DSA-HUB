import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { SubmissionDocument, UserProfileDocument } from "@/lib/db/models";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RangeKey = "7d" | "30d" | "90d" | "365d";

function utcKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function getCurrentStreak(activeDays: Set<string>, today: Date): number {
  let cursor = utcKey(today);
  if (!activeDays.has(cursor)) {
    cursor = utcKey(addUtcDays(today, -1));
    if (!activeDays.has(cursor)) return 0;
  }

  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    const parsed = new Date(cursor + "T00:00:00.000Z");
    cursor = utcKey(addUtcDays(parsed, -1));
  }
  return streak;
}

function getLongestStreak(activeDays: Set<string>): number {
  const sorted = [...activeDays].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const key of sorted) {
    const date = new Date(key + "T00:00:00.000Z");
    if (previous && utcKey(addUtcDays(previous, 1)) === key) current += 1;
    else current = 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return longest;
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const url = new URL(request.url);
  const requestedRange = url.searchParams.get("range") ?? "30d";
  const range: RangeKey = requestedRange === "7d" || requestedRange === "90d" || requestedRange === "365d"
    ? requestedRange
    : "30d";
  const requestedPlatform = url.searchParams.get("platform") ?? "all";
  const platformFilter = requestedPlatform === "leetcode" || requestedPlatform === "geeksforgeeks"
    ? requestedPlatform
    : "all";
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Number(range.slice(0, -1));
  const rangeStart = addUtcDays(today, -(days - 1));
  const heatmapStart = addUtcDays(today, -364);

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const submissions = db.collection<SubmissionDocument>("submissions");
  const profiles = db.collection<UserProfileDocument>("profiles");
  const [allRows, profile] = await Promise.all([
    submissions.find({ userId: user.id }, {
      projection: {
        platform: 1,
        problemId: 1,
        title: 1,
        difficulty: 1,
        language: 1,
        topics: 1,
        submittedAt: 1
      }
    }).sort({ submittedAt: 1 }).toArray(),
    profiles.findOne({ userId: user.id })
  ]);

  const matchesPlatform = (item: SubmissionDocument) =>
    platformFilter === "all" || item.platform === platformFilter;
  const filtered = allRows.filter(matchesPlatform);
  const selected = filtered.filter((item) => item.submittedAt >= rangeStart);
  const allActiveDays = new Set(filtered.map((item) => utcKey(item.submittedAt)));
  const selectedActiveDays = new Set(selected.map((item) => utcKey(item.submittedAt)));
  const uniqueAll = new Set(filtered.map((item) => item.platform + ":" + item.problemId));
  const uniqueSelected = new Set(selected.map((item) => item.platform + ":" + item.problemId));

  const dailyCounts = new Map<string, number>();
  for (const item of selected) {
    const key = utcKey(item.submittedAt);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }

  const difficultyCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  for (const item of selected) {
    const difficulty = item.difficulty ?? "Unspecified";
    difficultyCounts.set(difficulty, (difficultyCounts.get(difficulty) ?? 0) + 1);
    platformCounts.set(item.platform, (platformCounts.get(item.platform) ?? 0) + 1);
    if (item.language) languageCounts.set(item.language, (languageCounts.get(item.language) ?? 0) + 1);
    for (const topic of item.topics ?? []) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const activity = Array.from({ length: days }, (_, index) => {
    const date = addUtcDays(rangeStart, index);
    const key = utcKey(date);
    return { date: key, count: dailyCounts.get(key) ?? 0 };
  });

  const heatmapCounts = new Map<string, number>();
  for (const item of filtered) {
    const key = utcKey(item.submittedAt);
    heatmapCounts.set(key, (heatmapCounts.get(key) ?? 0) + 1);
  }
  const heatmap = Array.from({ length: 365 }, (_, index) => {
    const date = addUtcDays(heatmapStart, index);
    const key = utcKey(date);
    return { date: key, count: heatmapCounts.get(key) ?? 0 };
  });

  const todayKey = utcKey(today);
  const todayCount = dailyCounts.get(todayKey) ?? 0;
  const lastSevenDays = filtered.filter((item) => item.submittedAt >= addUtcDays(today, -6)).length;
  const activeDays = selectedActiveDays.size;

  const asSortedRows = (map: Map<string, number>) =>
    [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    range,
    platform: platformFilter,
    summary: {
      acceptedSubmissions: selected.length,
      uniqueProblems: uniqueSelected.size,
      allTimeUniqueProblems: uniqueAll.size,
      activeDays,
      currentStreak: getCurrentStreak(allActiveDays, today),
      longestStreak: getLongestStreak(allActiveDays),
      todayCount,
      lastSevenDays,
      averagePerActiveDay: activeDays ? Number((selected.length / activeDays).toFixed(1)) : 0
    },
    goals: {
      daily: profile?.preferences?.dailyGoal ?? 1,
      weekly: profile?.preferences?.weeklyGoal ?? 5
    },
    activity,
    heatmap,
    breakdowns: {
      difficulty: asSortedRows(difficultyCounts),
      platform: asSortedRows(platformCounts),
      language: asSortedRows(languageCounts).slice(0, 8),
      topics: asSortedRows(topicCounts).slice(0, 10)
    }
  });
}
