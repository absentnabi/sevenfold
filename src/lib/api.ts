import type { PublicRoom } from "./types";

export type ApiSuccess = { playerId: string; room: PublicRoom };

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(url: string, init?: RequestInit): Promise<ApiSuccess> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  let data: { error?: string; playerId?: string; room?: PublicRoom } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    data = {};
  }
  if (!res.ok || !data.room || !data.playerId) {
    throw new ApiError(data.error || "Something went wrong.", res.status);
  }
  return { playerId: data.playerId, room: data.room };
}

export function createRoomRequest(name: string) {
  return request("/api/rooms", { method: "POST", body: JSON.stringify({ name }) });
}

export function joinRoomRequest(code: string, name: string) {
  return request("/api/rooms/join", { method: "POST", body: JSON.stringify({ code, name }) });
}

export function getRoomRequest(code: string, playerId: string) {
  const query = new URLSearchParams({ playerId });
  return request(`/api/rooms/${code}?${query.toString()}`);
}

export function guessRequest(code: string, playerId: string, guess: string) {
  return request(`/api/rooms/${code}/guess`, {
    method: "POST",
    body: JSON.stringify({ playerId, guess }),
  });
}

export function nextRoundRequest(code: string, playerId: string) {
  return request(`/api/rooms/${code}/round`, {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
}
