import { badRequest, readJson, roomJson } from "@/lib/http";
import { submitGuess } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const body = await readJson(request);
  if (!body) return badRequest("Invalid request.");
  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  const guess = typeof body.guess === "string" ? body.guess : "";
  return roomJson(submitGuess(code, playerId, guess));
}
