import { randomUUID } from "node:crypto";

import { normalizeCode, sanitizeName } from "./names";
import { scoreGuess } from "./score";
import { computeStandings } from "./standings";
import {
  MAX_GUESSES,
  MAX_PLAYERS,
  CODE_ALPHABET,
  type PlayerStatus,
  type PublicRoom,
  type Guess,
} from "./types";
import { isAllowedGuess, randomAnswer } from "./words";

const ROOM_TTL_MS = 1000 * 60 * 60 * 12;

type Player = {
  id: string;
  name: string;
  guesses: Guess[];
  status: PlayerStatus;
  solvedIn: number | null;
  joinedAt: number;
};

type Room = {
  code: string;
  hostId: string;
  answer: string;
  round: number;
  revision: number;
  createdAt: number;
  touchedAt: number;
  players: Player[];
};

type Store = {
  rooms: Map<string, Room>;
  clock: number;
};

const globalStore = globalThis as unknown as { __sevenfold?: Store };
const store: Store = (globalStore.__sevenfold ??= { rooms: new Map(), clock: 0 });

export type RoomFailure = { ok: false; status: number; error: string };
export type RoomSuccess = { ok: true; playerId: string; room: PublicRoom };
export type RoomResult = RoomFailure | RoomSuccess;

function fail(status: number, error: string): RoomFailure {
  return { ok: false, status, error };
}

function touch(room: Room) {
  store.clock += 1;
  room.revision = store.clock;
  room.touchedAt = Date.now();
}

function sweep() {
  const now = Date.now();
  for (const [code, room] of store.rooms) {
    if (now - room.touchedAt > ROOM_TTL_MS) store.rooms.delete(code);
  }
}

function makeCode(): string {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    let code = "";
    for (let i = 0; i < 4; i += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!store.rooms.has(code)) return code;
  }
  throw new Error("Could not allocate a room code.");
}

function toPublic(room: Room, playerId: string): PublicRoom {
  const you = room.players.find((player) => player.id === playerId);
  if (!you) throw new Error("Player missing from room.");
  const reveal = you.status !== "playing";
  return {
    code: room.code,
    round: room.round,
    revision: room.revision,
    answer: reveal ? room.answer : null,
    you: {
      id: you.id,
      name: you.name,
      isHost: room.hostId === you.id,
      status: you.status,
      solvedIn: you.solvedIn,
      guesses: you.guesses,
    },
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      status: player.status,
      solvedIn: player.solvedIn,
      guessCount: player.guesses.length,
      isHost: player.id === room.hostId,
      isYou: player.id === playerId,
    })),
    standings: computeStandings(
      room.players.map((player) => ({
        id: player.id,
        name: player.name,
        status: player.status,
        solvedIn: player.solvedIn,
        guessCount: player.guesses.length,
      })),
    ),
  };
}

function addPlayer(room: Room, name: string): Player {
  const player: Player = {
    id: randomUUID(),
    name,
    guesses: [],
    status: "playing",
    solvedIn: null,
    joinedAt: Date.now(),
  };
  room.players.push(player);
  return player;
}

export function resetRoomsForTests() {
  store.rooms.clear();
}

/** Test-only. Not exposed over HTTP. */
export function peekAnswerForTests(code: string): string | undefined {
  return store.rooms.get(code)?.answer;
}

export function createRoom(name: string, answerOverride?: string): RoomResult {
  const clean = sanitizeName(name);
  if (!clean) return fail(400, "Enter a display name (1–18 characters).");
  sweep();
  const answer = (answerOverride ?? randomAnswer()).toLowerCase();
  if (!/^[a-z]{7}$/.test(answer)) return fail(500, "Couldn't choose a word.");
  const room: Room = {
    code: makeCode(),
    hostId: "",
    answer,
    round: 1,
    revision: 0,
    createdAt: Date.now(),
    touchedAt: Date.now(),
    players: [],
  };
  const player = addPlayer(room, clean);
  room.hostId = player.id;
  touch(room);
  store.rooms.set(room.code, room);
  return { ok: true, playerId: player.id, room: toPublic(room, player.id) };
}

export function joinRoom(rawCode: string, name: string): RoomResult {
  const clean = sanitizeName(name);
  if (!clean) return fail(400, "Enter a display name (1–18 characters).");
  const code = normalizeCode(rawCode);
  if (!code) return fail(400, "Enter a 4-character room code.");
  const room = store.rooms.get(code);
  if (!room) return fail(404, "No room with that code.");
  if (room.players.length >= MAX_PLAYERS) return fail(409, "That room is full.");
  const player = addPlayer(room, clean);
  touch(room);
  return { ok: true, playerId: player.id, room: toPublic(room, player.id) };
}

export function getRoom(rawCode: string, playerId: string): RoomResult {
  const code = normalizeCode(rawCode);
  if (!code) return fail(400, "That code doesn't look right.");
  const room = store.rooms.get(code);
  if (!room) return fail(404, "No room with that code.");
  if (!room.players.some((player) => player.id === playerId)) {
    return fail(401, "Join this room first.");
  }
  room.touchedAt = Date.now();
  return { ok: true, playerId, room: toPublic(room, playerId) };
}

export function submitGuess(rawCode: string, playerId: string, rawGuess: string): RoomResult {
  const code = normalizeCode(rawCode);
  if (!code) return fail(400, "That code doesn't look right.");
  const room = store.rooms.get(code);
  if (!room) return fail(404, "No room with that code.");
  const player = room.players.find((entry) => entry.id === playerId);
  if (!player) return fail(401, "Join this room first.");
  if (player.status !== "playing") return fail(400, "You're done with this word.");

  const guess = rawGuess.trim().toLowerCase();
  if (!/^[a-z]{7}$/.test(guess)) return fail(400, "Enter a 7-letter word.");
  if (!isAllowedGuess(guess)) return fail(400, "Not in word list.");
  if (player.guesses.some((entry) => entry.word === guess)) return fail(400, "Already guessed.");

  const marks = scoreGuess(guess, room.answer);
  player.guesses.push({ word: guess, marks });
  if (marks.every((mark) => mark === "correct")) {
    player.status = "solved";
    player.solvedIn = player.guesses.length;
  } else if (player.guesses.length >= MAX_GUESSES) {
    player.status = "failed";
  }
  touch(room);
  return { ok: true, playerId, room: toPublic(room, playerId) };
}

export function startNextRound(rawCode: string, playerId: string): RoomResult {
  const code = normalizeCode(rawCode);
  if (!code) return fail(400, "That code doesn't look right.");
  const room = store.rooms.get(code);
  if (!room) return fail(404, "No room with that code.");
  if (!room.players.some((player) => player.id === playerId)) {
    return fail(401, "Join this room first.");
  }
  if (room.hostId !== playerId) return fail(403, "Only the host can start a new word.");

  room.answer = randomAnswer(room.answer);
  room.round += 1;
  for (const player of room.players) {
    player.guesses = [];
    player.status = "playing";
    player.solvedIn = null;
  }
  touch(room);
  return { ok: true, playerId, room: toPublic(room, playerId) };
}
