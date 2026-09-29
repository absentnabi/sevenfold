import { readFileSync } from "node:fs";
import path from "node:path";

type Lists = {
  answers: string[];
  guesses: Set<string>;
};

const globalLists = globalThis as unknown as { __sevenfoldLists?: Lists };

function readList(file: string): string[] {
  const text = readFileSync(path.join(process.cwd(), "data", file), "utf8");
  const words: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const word = line.trim().toLowerCase();
    if (!word || word.startsWith("#")) continue;
    words.push(word);
  }
  return words;
}

function lists(): Lists {
  if (!globalLists.__sevenfoldLists) {
    const answers = readList("answers.txt");
    const guesses = new Set(readList("guesses.txt"));
    for (const answer of answers) guesses.add(answer);
    globalLists.__sevenfoldLists = { answers, guesses };
  }
  return globalLists.__sevenfoldLists;
}

export function randomAnswer(except?: string): string {
  const { answers } = lists();
  if (answers.length === 0) throw new Error("Answer list is empty.");
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const word = answers[Math.floor(Math.random() * answers.length)]!;
    if (word !== except) return word;
  }
  return answers.find((word) => word !== except) ?? answers[0]!;
}

export function isAllowedGuess(word: string): boolean {
  return lists().guesses.has(word);
}
