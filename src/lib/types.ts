export const WORD_LENGTH = 7;
export const MAX_GUESSES = 8;
export const MAX_PLAYERS = 12;
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export type Mark = "correct" | "present" | "absent";
export type PlayerStatus = "playing" | "solved" | "failed";

export type Guess = {
  word: string;
  marks: Mark[];
};

export type PublicPlayer = {
  id: string;
  name: string;
  status: PlayerStatus;
  solvedIn: number | null;
  guessCount: number;
  isHost: boolean;
  isYou: boolean;
};

export type Standings = {
  decided: boolean;
  best: number | null;
  leaderIds: string[];
  canCatchIds: string[];
};

export type PublicYou = {
  id: string;
  name: string;
  isHost: boolean;
  status: PlayerStatus;
  solvedIn: number | null;
  guesses: Guess[];
};

export type PublicRoom = {
  code: string;
  round: number;
  revision: number;
  answer: string | null;
  you: PublicYou;
  players: PublicPlayer[];
  standings: Standings;
};
