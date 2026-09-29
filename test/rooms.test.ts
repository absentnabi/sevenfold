import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";

import {
  createRoom,
  getRoom,
  joinRoom,
  peekAnswerForTests,
  resetRoomsForTests,
  startNextRound,
  submitGuess,
} from "../src/lib/rooms";
import { MAX_PLAYERS } from "../src/lib/types";

function guessesExcept(answer: string): string[] {
  const text = readFileSync(path.join(process.cwd(), "data", "guesses.txt"), "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line !== answer);
}

function unwrap<T extends { ok: true }>(result: { ok: boolean }): T {
  assert.equal(result.ok, true);
  return result as T;
}

describe("rooms", () => {
  beforeEach(() => {
    resetRoomsForTests();
  });

  it("hides the shared answer until a player finishes", () => {
    const created = unwrap<ReturnType<typeof createRoom> & { ok: true }>(createRoom("Ada", "booklet"));
    const code = created.room.code;
    assert.equal(created.room.answer, null);
    assert.equal(JSON.stringify(created.room).includes("booklet"), false);
    assert.equal(peekAnswerForTests(code), "booklet");

    const joined = unwrap<ReturnType<typeof joinRoom> & { ok: true }>(joinRoom(code, "Bo"));
    assert.equal(peekAnswerForTests(code), "booklet");
    assert.equal(joined.room.answer, null);

    const marked = unwrap<ReturnType<typeof submitGuess> & { ok: true }>(
      submitGuess(code, created.playerId, "balloon"),
    );
    assert.deepEqual(marked.room.you.guesses[0]?.marks, [
      "correct",
      "absent",
      "present",
      "absent",
      "present",
      "present",
      "absent",
    ]);
    assert.equal(marked.room.answer, null);

    const solved = unwrap<ReturnType<typeof submitGuess> & { ok: true }>(
      submitGuess(code, joined.playerId, "booklet"),
    );
    assert.equal(solved.room.answer, "booklet");
    assert.equal(solved.room.you.solvedIn, 1);

    const stillPlaying = unwrap<ReturnType<typeof getRoom> & { ok: true }>(getRoom(code, created.playerId));
    assert.equal(stillPlaying.room.answer, null);
    assert.equal(JSON.stringify(stillPlaying.room).includes("booklet"), false);
  });

  it("shares a win when two players solve in the same number of guesses", () => {
    const created = unwrap<ReturnType<typeof createRoom> & { ok: true }>(createRoom("Ada", "cabbage"));
    const joined = unwrap<ReturnType<typeof joinRoom> & { ok: true }>(joinRoom(created.room.code, "Bo"));
    unwrap(submitGuess(created.room.code, created.playerId, "cabbage"));
    const second = unwrap<ReturnType<typeof submitGuess> & { ok: true }>(
      submitGuess(created.room.code, joined.playerId, "cabbage"),
    );
    assert.equal(second.room.standings.decided, true);
    assert.equal(second.room.standings.best, 1);
    assert.deepEqual(
      [...second.room.standings.leaderIds].sort(),
      [created.playerId, joined.playerId].sort(),
    );
  });

  it("rejects unknown, short, and repeated guesses without spending a turn", () => {
    const created = unwrap<ReturnType<typeof createRoom> & { ok: true }>(createRoom("Ada", "booklet"));
    const code = created.room.code;
    const unknown = submitGuess(code, created.playerId, "zzzzzzz");
    assert.equal(unknown.ok, false);
    if (!unknown.ok) assert.match(unknown.error, /word list/i);

    const view = unwrap<ReturnType<typeof getRoom> & { ok: true }>(getRoom(code, created.playerId));
    assert.equal(view.room.you.guesses.length, 0);

    unwrap(submitGuess(code, created.playerId, "problem"));
    const again = submitGuess(code, created.playerId, "PROBLEM");
    assert.equal(again.ok, false);
    if (!again.ok) assert.match(again.error, /already/i);
    const after = unwrap<ReturnType<typeof getRoom> & { ok: true }>(getRoom(code, created.playerId));
    assert.equal(after.room.you.guesses.length, 1);
  });

  it("knocks a player out after eight misses and reveals the word only to them", () => {
    const created = unwrap<ReturnType<typeof createRoom> & { ok: true }>(createRoom("Ada", "booklet"));
    const joined = unwrap<ReturnType<typeof joinRoom> & { ok: true }>(joinRoom(created.room.code, "Bo"));
    const words = guessesExcept("booklet").slice(0, 8);
    let latest = created;
    for (const word of words) {
      latest = unwrap(submitGuess(created.room.code, created.playerId, word));
    }
    assert.equal(latest.room.you.status, "failed");
    assert.equal(latest.room.you.solvedIn, null);
    assert.equal(latest.room.answer, "booklet");

    const extra = submitGuess(created.room.code, created.playerId, "cabbage");
    assert.equal(extra.ok, false);

    const other = unwrap<ReturnType<typeof getRoom> & { ok: true }>(getRoom(created.room.code, joined.playerId));
    assert.equal(other.room.answer, null);
    const ada = other.room.players.find((player) => player.id === created.playerId);
    assert.equal(ada?.status, "failed");
    assert.equal(ada?.guessCount, 8);
  });

  it("lets only the host deal a new shared word", () => {
    const created = unwrap<ReturnType<typeof createRoom> & { ok: true }>(createRoom("Ada", "booklet"));
    const joined = unwrap<ReturnType<typeof joinRoom> & { ok: true }>(joinRoom(created.room.code, "Bo"));
    unwrap(submitGuess(created.room.code, created.playerId, "problem"));

    const denied = startNextRound(created.room.code, joined.playerId);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.status, 403);

    const next = unwrap<ReturnType<typeof startNextRound> & { ok: true }>(
      startNextRound(created.room.code, created.playerId),
    );
    assert.equal(next.room.round, 2);
    assert.equal(next.room.you.guesses.length, 0);
    assert.equal(next.room.you.status, "playing");
    assert.equal(next.room.answer, null);
    assert.equal(next.room.you.isHost, true);

    const guest = unwrap<ReturnType<typeof getRoom> & { ok: true }>(getRoom(created.room.code, joined.playerId));
    assert.equal(guest.room.round, 2);
    assert.equal(guest.room.you.guesses.length, 0);
    assert.equal(guest.room.answer, null);
    const nextAnswer = peekAnswerForTests(created.room.code);
    assert.equal(typeof nextAnswer, "string");
    assert.notEqual(nextAnswer, "booklet");
  });

  it("rejects a missing room, a bad name, and a 13th player", () => {
    const missing = joinRoom("ZZZZ", "Ada");
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.status, 404);

    const nameless = createRoom("   ");
    assert.equal(nameless.ok, false);

    const created = unwrap<ReturnType<typeof createRoom> & { ok: true }>(createRoom("Host"));
    for (let index = 0; index < MAX_PLAYERS - 1; index += 1) {
      const joined = joinRoom(created.room.code, `P${index}`);
      assert.equal(joined.ok, true);
    }
    const overflow = joinRoom(created.room.code, "Extra");
    assert.equal(overflow.ok, false);
    if (!overflow.ok) assert.equal(overflow.status, 409);
  });
});
