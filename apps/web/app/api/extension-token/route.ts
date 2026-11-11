import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { ExtensionTokenDocument } from "@/lib/db/models";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const db = await getDatabase();
  await ensureDataIndexes(db);
  await db.collection<ExtensionTokenDocument>("extensionTokens").updateOne(
    { userId: user.id },
    {
      $set: { tokenHash, updatedAt: now },
      $setOnInsert: { userId: user.id, createdAt: now }
    },
    { upsert: true }
  );

  // The raw token is returned once. Only its SHA-256 hash is stored in MongoDB.
  return NextResponse.json({ token });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const db = await getDatabase();
  await ensureDataIndexes(db);
  await db.collection<ExtensionTokenDocument>("extensionTokens").deleteOne({ userId: user.id });

  return NextResponse.json({ success: true });
}
