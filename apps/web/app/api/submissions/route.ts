import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { SubmissionDocument } from "@/lib/db/models";
import { getDatabase } from "@/lib/mongodb";
import { validateNewSubmission } from "@/lib/submissions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: number }).code === 11000;
}

function serializeSubmission(submission: SubmissionDocument) {
  return {
    id: submission._id?.toString(),
    platform: submission.platform,
    externalSubmissionId: submission.externalSubmissionId,
    problemId: submission.problemId,
    title: submission.title,
    problemUrl: submission.problemUrl,
    status: submission.status,
    language: submission.language ?? null,
    difficulty: submission.difficulty ?? null,
    topics: submission.topics,
    submittedAt: submission.submittedAt.toISOString(),
    createdAt: submission.createdAt.toISOString()
  };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawPage = Number(url.searchParams.get("page") ?? "1");
  const rawLimit = Number(url.searchParams.get("limit") ?? "20");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isSafeInteger(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const collection = db.collection<SubmissionDocument>("submissions");
  const filter = { userId: user.id };

  const [total, items] = await Promise.all([
    collection.countDocuments(filter),
    collection.find(filter)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()
  ]);

  return NextResponse.json({
    items: items.map(serializeSubmission),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 16_384) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validation = validateNewSubmission(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const db = await getDatabase();
  await ensureDataIndexes(db);
  const collection = db.collection<SubmissionDocument>("submissions");
  const document: SubmissionDocument = {
    userId: user.id,
    ...validation.data,
    createdAt: new Date()
  };

  try {
    const result = await collection.insertOne(document);
    return NextResponse.json(
      { success: true, duplicate: false, id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }
    throw error;
  }
}
