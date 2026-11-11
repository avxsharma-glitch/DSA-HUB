import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { ensureDataIndexes } from "@/lib/db/indexes";
import type { ExtensionTokenDocument, SubmissionDocument } from "@/lib/db/models";
import { getDatabase } from "@/lib/mongodb";
import { validateNewSubmission } from "@/lib/submissions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: number }).code === 11000;
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]{40,64})$/);
  if (!match) {
    return NextResponse.json({ error: "A valid DSAHub extension key is required." }, { status: 401 });
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

  const tokenHash = createHash("sha256").update(match[1]).digest("hex");
  const db = await getDatabase();
  await ensureDataIndexes(db);

  const token = await db.collection<ExtensionTokenDocument>("extensionTokens").findOne({ tokenHash });
  if (!token) {
    return NextResponse.json({ error: "Extension key is invalid or has been revoked. Generate a new key from your DSAHub dashboard." }, { status: 401 });
  }

  const document: SubmissionDocument = {
    userId: token.userId,
    ...validation.data,
    createdAt: new Date()
  };

  try {
    const result = await db.collection<SubmissionDocument>("submissions").insertOne(document);
    return NextResponse.json({ success: true, duplicate: false, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
    }
    throw error;
  }
}
