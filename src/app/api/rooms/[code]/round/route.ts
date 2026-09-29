import { badRequest, readJson, roomJson } from "@/lib/http";
import { startNextRound } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const body = await readJson(request);
  if (!body) return badRequest("Invalid request.");
  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  return roomJson(startNextRound(code, playerId));
}
