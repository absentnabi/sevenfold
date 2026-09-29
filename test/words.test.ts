import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function load(file: string): string[] {
  const text = readFileSync(path.join(process.cwd(), "data", file), "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

const blocked = ["darkies", "faggots", "fuckwit", "niggers", "rapists", "retards", "wetback", "shouldn"];

describe("word lists", () => {
  const answers = load("answers.txt");
  const guesses = new Set(load("guesses.txt"));

  it("keeps a playable set of 7-letter answers and guesses", () => {
    assert.ok(answers.length >= 800, `expected at least 800 answers, got ${answers.length}`);
    assert.ok(guesses.size >= 4000, `expected at least 4000 guesses, got ${guesses.size}`);
    assert.ok(answers.length < 2500);
    assert.ok(guesses.size < 12000);
  });

  it("only contains lowercase 7-letter words, with every answer guessable", () => {
    const seen = new Set<string>();
    for (const word of answers) {
      assert.match(word, /^[a-z]{7}$/);
      assert.equal(seen.has(word), false);
      seen.add(word);
      assert.equal(guesses.has(word), true);
    }
    for (const word of guesses) assert.match(word, /^[a-z]{7}$/);
  });

  it("leaves slurs and truncated fragments out of both lists", () => {
    for (const word of blocked) {
      assert.equal(answers.includes(word), false);
      assert.equal(guesses.has(word), false);
    }
  });
});
