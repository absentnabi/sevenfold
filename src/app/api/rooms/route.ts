import { badRequest, readJson, roomJson, serverError } from "@/lib/http";
import { createRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return badRequest("Invalid request.");
  const name = typeof body.name === "string" ? body.name : "";
  try {
    return roomJson(createRoom(name));
  } catch (error) {
    console.error("create room failed", error instanceof Error ? error.message : "unknown");
    return serverError("Couldn't start a room.");
  }
}
