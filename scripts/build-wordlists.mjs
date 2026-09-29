/**
 * Rebuild data/answers.txt and data/guesses.txt.
 *
 * Sources (downloaded into the OS temp dir, not committed):
 * - Google 10k English, USA, no swears (common answer candidates)
 * - dwyl english-words alpha (public-domain dictionary check)
 * - Hermit Dave frequency words (which dictionary words people actually use)
 * - US first-name list (given names are kept out of the secret-word pool)
 *
 * Run: npm run words
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const cacheDir = path.join(tmpdir(), "sevenfold-word-sources");
mkdirSync(cacheDir, { recursive: true });

const sources = {
  alpha: "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
  google:
    "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt",
  freq: "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt",
  first:
    "https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/first%20names/us.txt",
};

/** Real words that also show up in name lists and should still be secrets. */
const keepAsAnswers = new Set([
  "america",
  "beloved",
  "charity",
  "crystal",
  "destiny",
  "diamond",
  "emerald",
  "english",
  "freedom",
  "genesis",
  "griffin",
  "harmony",
  "hopeful",
  "january",
  "justice",
  "liberty",
  "numbers",
  "trinity",
  "warrior",
]);

/** Secrets that are technically words but make poor puzzles. */
const denyAnswers = new Set([
  "adapter",
  "adaptor",
  "airfare",
  "anaheim",
  "andorra",
  "armenia",
  "boolean",
  "domains",
  "erotica",
  "formats",
  "grenada",
  "headers",
  "indexed",
  "indexes",
  "indices",
  "integer",
  "keyword",
  "liberia",
  "modular",
  "modules",
  "numeric",
  "outputs",
  "reprint",
  "routers",
  "runtime",
  "senegal",
  "siemens",
  "toolkit",
]);

const blocked = new Set([
  "darkies",
  "faggots",
  "fuckwit",
  "niggers",
  "rapists",
  "retards",
  "wetback",
]);

const fragments = new Set(["shouldn"]);

async function load(name, url) {
  const file = path.join(cacheDir, name);
  if (!existsSync(file)) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${name}: ${response.status}`);
    }
    writeFileSync(file, await response.text());
  }
  return readFileSync(file, "utf8");
}

function words(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

function isSeven(word) {
  return /^[a-z]{7}$/.test(word) && /[aeiouy]/.test(word);
}

const [alphaText, googleText, freqText, firstText] = await Promise.all([
  load("alpha.txt", sources.alpha),
  load("google.txt", sources.google),
  load("freq.txt", sources.freq),
  load("first.txt", sources.first),
]);

const dictionary = new Set(words(alphaText).filter(isSeven));
const names = new Set(words(firstText).filter(isSeven));
const frequent = [];
for (const line of freqText.split(/\r?\n/)) {
  const word = line.split(/\s+/)[0]?.trim().toLowerCase() ?? "";
  if (isSeven(word) && dictionary.has(word)) frequent.push(word);
}

const google = words(googleText).filter((word) => isSeven(word) && dictionary.has(word));
const frequentSet = new Set(frequent);

const answers = [...new Set(google)]
  .filter((word) => frequentSet.has(word))
  .filter((word) => !blocked.has(word) && !denyAnswers.has(word))
  .filter((word) => keepAsAnswers.has(word) || !names.has(word))
  .sort();

const guesses = [...new Set([...frequent, ...answers])]
  .filter((word) => !blocked.has(word) && !fragments.has(word))
  .sort();

const removedNames = [...new Set(google)]
  .filter((word) => frequentSet.has(word) && names.has(word) && !keepAsAnswers.has(word))
  .sort();

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const answerHeader = `# Sevenfold secret words. One lowercase 7-letter word per line.
# Common English from the Google 10k no-swears list, checked against a public-domain
# dictionary and a frequency list. Person names and a short blocklist are removed.
# Regenerate with: npm run words
`;

const guessHeader = `# Sevenfold accepted guesses. One lowercase 7-letter word per line.
# Dictionary words that also show up in everyday frequency data, plus every answer.
# Regenerate with: npm run words
`;

writeFileSync(path.join(dataDir, "answers.txt"), `${answerHeader}${answers.join("\n")}\n`);
writeFileSync(path.join(dataDir, "guesses.txt"), `${guessHeader}${guesses.join("\n")}\n`);

console.log(`answers ${answers.length}`);
console.log(`guesses ${guesses.length}`);
console.log(`name-like secrets removed ${removedNames.length}`);
console.log(removedNames.join(", "));
