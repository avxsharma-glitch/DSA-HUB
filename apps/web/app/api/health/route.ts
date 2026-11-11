import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ status: "error", database: "disconnected", message }, { status: 503 });
  }
}
