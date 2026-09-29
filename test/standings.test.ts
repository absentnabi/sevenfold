import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeStandings, standingsHeadline, type StandingInput } from "../src/lib/standings";

function player(
  id: string,
  name: string,
  status: StandingInput["status"],
  solvedIn: number | null,
  guessCount: number,
): StandingInput {
  return { id, name, status, solvedIn, guessCount };
}

describe("computeStandings", () => {
  it("stays open while someone can still match the lead", () => {
    const players = [
      player("a", "Ada", "solved", 3, 3),
      player("b", "Bo", "playing", null, 2),
    ];
    const standings = computeStandings(players);
    assert.equal(standings.decided, false);
    assert.equal(standings.best, 3);
    assert.deepEqual(standings.canCatchIds, ["b"]);
  });

  it("decides the round when nobody left can match the lead", () => {
    const players = [
      player("a", "Ada", "solved", 3, 3),
      player("b", "Bo", "playing", null, 3),
    ];
    const standings = computeStandings(players);
    assert.equal(standings.decided, true);
    assert.deepEqual(standings.leaderIds, ["a"]);
    assert.deepEqual(standings.canCatchIds, []);
  });

  it("shares the lead when two players solve in the same number", () => {
    const players = [
      player("a", "Ada", "solved", 4, 4),
      player("b", "Bo", "solved", 4, 4),
      player("c", "Cam", "failed", null, 8),
    ];
    const standings = computeStandings(players);
    assert.equal(standings.decided, true);
    assert.deepEqual(standings.leaderIds, ["a", "b"]);
  });

  it("has no winner when everyone misses", () => {
    const players = [
      player("a", "Ada", "failed", null, 8),
      player("b", "Bo", "failed", null, 8),
    ];
    const standings = computeStandings(players);
    assert.equal(standings.decided, true);
    assert.equal(standings.best, null);
    assert.deepEqual(standings.leaderIds, []);
  });
});

describe("standingsHeadline", () => {
  it("talks to a solo player who has not started", () => {
    const players = [player("a", "Ada", "playing", null, 0)];
    assert.equal(
      standingsHeadline(players, computeStandings(players), "a"),
      "Share the code, or play this one yourself.",
    );
  });

  it("names a shared win, including the viewer", () => {
    const players = [
      player("a", "Ada", "solved", 5, 5),
      player("b", "Bo", "solved", 5, 5),
      player("c", "Cam", "solved", 5, 5),
    ];
    assert.equal(
      standingsHeadline(players, computeStandings(players), "a"),
      "You, Bo, and Cam share the win in 5 guesses.",
    );
  });

  it("tells the leader when the rest of the room is locked out", () => {
    const players = [
      player("a", "Ada", "solved", 2, 2),
      player("b", "Bo", "playing", null, 2),
    ];
    assert.equal(
      standingsHeadline(players, computeStandings(players), "a"),
      "You win in 2 guesses. No one else can catch that.",
    );
  });

  it("says when a whole room misses the word", () => {
    const players = [
      player("a", "Ada", "failed", null, 8),
      player("b", "Bo", "failed", null, 8),
    ];
    assert.equal(
      standingsHeadline(players, computeStandings(players), "a"),
      "No one solved this word.",
    );
  });
});
