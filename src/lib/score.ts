import { WORD_LENGTH, type Guess, type Mark } from "./types";

const rank: Record<Mark, number> = { absent: 1, present: 2, correct: 3 };

/** Classic Wordle marks, including duplicate letters. Greens are claimed first. */
export function scoreGuess(guess: string, answer: string): Mark[] {
  if (guess.length !== WORD_LENGTH || answer.length !== WORD_LENGTH) {
    throw new Error(`Both words must be ${WORD_LENGTH} letters.`);
  }

  const marks: Mark[] = Array.from({ length: WORD_LENGTH }, () => "absent");
  const remaining = new Map<string, number>();

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guess[i] === answer[i]) {
      marks[i] = "correct";
    } else {
      remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1);
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (marks[i] === "correct") continue;
    const left = remaining.get(guess[i]) ?? 0;
    if (left > 0) {
      marks[i] = "present";
      remaining.set(guess[i], left - 1);
    }
  }

  return marks;
}

/** Best mark seen for each letter. Correct beats present, present beats absent. */
export function keyboardMarks(guesses: Guess[]): Record<string, Mark> {
  const marks: Record<string, Mark> = {};
  for (const guess of guesses) {
    for (let i = 0; i < guess.word.length; i += 1) {
      const letter = guess.word[i];
      const mark = guess.marks[i];
      const previous = marks[letter];
      if (!previous || rank[mark] > rank[previous]) marks[letter] = mark;
    }
  }
  return marks;
}
