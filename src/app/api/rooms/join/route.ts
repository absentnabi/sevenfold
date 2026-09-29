import { badRequest, readJson, roomJson } from "@/lib/http";
import { joinRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest("Invalid request.");
  const name = typeof body.name === "string" ? body.name : "";
  const code = typeof body.code === "string" ? body.code : "";
  return roomJson(joinRoom(code, name));
}
