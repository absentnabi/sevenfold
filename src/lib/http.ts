import { NextResponse } from "next/server";

import type { RoomResult } from "./rooms";

const noStore = { "Cache-Control": "no-store" };

export function roomJson(result: RoomResult) {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore });
  }
  return NextResponse.json(
    { playerId: result.playerId, room: result.room },
    { headers: noStore },
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400, headers: noStore });
}

export function serverError(error: string) {
  return NextResponse.json({ error }, { status: 500, headers: noStore });
}
