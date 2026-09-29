import { badRequest, roomJson } from "@/lib/http";
import { getRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const playerId = new URL(request.url).searchParams.get("playerId") ?? "";
  if (!playerId) return badRequest("Missing player.");
  return roomJson(getRoom(code, playerId));
}
