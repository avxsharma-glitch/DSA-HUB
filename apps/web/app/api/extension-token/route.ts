import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { ensureDataIndexes } from "@/lib/db/indexes";
import type { ExtensionTokenDocument } from "@/lib/db/models";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function isSameOrigin(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return false;

  try {
    const origin = new URL(originHeader);
    const requestUrl = new URL(request.url);

    // Next.js may see an internal URL behind a reverse proxy. Prefer the
    // public forwarded host/protocol, then fall back to the actual Host header.
    const expectedHost =
      firstHeaderValue(request.headers.get("x-forwarded-host")) ??
      firstHeaderValue(request.headers.get("host")) ??
      requestUrl.host;
    const expectedProtocol =
      firstHeaderValue(request.headers.get("x-forwarded-proto")) ??
      requestUrl.protocol.replace(":", "");

    return (
      (origin.protocol === "http:" || origin.protocol === "https:") &&
      origin.host.toLowerCase() === expectedHost.toLowerCase() &&
      origin.protocol === expectedProtocol.toLowerCase() + ":"
    );
  } catch {
    return false;
  }
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
