import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keyboardMarks, scoreGuess } from "../src/lib/score";

describe("scoreGuess", () => {
  it("marks an exact match as all correct", () => {
    assert.deepEqual(scoreGuess("problem", "problem"), [
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("marks letters that do not appear as absent", () => {
    assert.deepEqual(scoreGuess("abcdefg", "hijklmn"), [
      "absent",
      "absent",
      "absent",
      "absent",
      "absent",
      "absent",
      "absent",
    ]);
  });

  it("claims greens before yellows when letters repeat", () => {
    assert.deepEqual(scoreGuess("sassess", "success"), [
      "correct",
      "absent",
      "absent",
      "absent",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("gives only one yellow for one leftover copy of a letter", () => {
    assert.deepEqual(scoreGuess("balloon", "booklet"), [
      "correct",
      "absent",
      "present",
      "absent",
      "present",
      "present",
      "absent",
    ]);
    assert.deepEqual(scoreGuess("letters", "monster"), [
      "absent",
      "present",
      "present",
      "absent",
      "absent",
      "present",
      "present",
    ]);
  });

  it("keeps an anagram's greens and marks the rest present", () => {
    assert.deepEqual(scoreGuess("settler", "letters"), [
      "present",
      "correct",
      "correct",
      "correct",
      "present",
      "present",
      "present",
    ]);
  });
});

describe("keyboardMarks", () => {
  it("keeps the strongest mark for each letter", () => {
    const marks = keyboardMarks([
      { word: "balloon", marks: scoreGuess("balloon", "booklet") },
      { word: "booklet", marks: scoreGuess("booklet", "booklet") },
    ]);
    assert.equal(marks.b, "correct");
    assert.equal(marks.a, "absent");
    assert.equal(marks.l, "correct");
    assert.equal(marks.o, "correct");
  });
});
