import { MAX_GUESSES, WORD_LENGTH, type Guess, type Mark } from "@/lib/types";

const markLabel: Record<Mark, string> = {
  correct: "correct",
  present: "wrong spot",
  absent: "not in the word",
};

type BoardProps = {
  guesses: Guess[];
  draft: string;
  shake: boolean;
  animatingRow: number | null;
};

export function Board({ guesses, draft, shake, animatingRow }: BoardProps) {
  return (
    <div className="board" role="grid" aria-label="Guesses">
      {Array.from({ length: MAX_GUESSES }, (_, row) => {
        const guess = guesses[row];
        const isDraft = !guess && row === guesses.length;
        const letters = guess
          ? guess.word.split("")
          : isDraft
            ? draft.padEnd(WORD_LENGTH).split("")
            : Array.from({ length: WORD_LENGTH }, () => "");
        return (
          <div
            key={row}
            role="row"
            className="board-row"
            data-shake={isDraft && shake ? "1" : "0"}
          >
            {letters.map((letter, column) => {
              const mark = guess?.marks[column];
              const flipping = Boolean(guess) && animatingRow === row;
              const label = guess
                ? `${letter.toUpperCase()}, ${markLabel[guess.marks[column]]}`
                : letter.trim()
                  ? letter.toUpperCase()
                  : "empty";
              return (
                <div
                  key={column}
                  role="gridcell"
                  aria-label={label}
                  data-mark={mark ?? (letter.trim() ? "typed" : "empty")}
                  data-flip={flipping ? "1" : "0"}
                  data-pop={isDraft && letter.trim() && column === draft.length - 1 ? "1" : "0"}
                  className="tile"
                  style={flipping ? { animationDelay: `${column * 120}ms` } : undefined}
                >
                  {letter.trim() ? letter : ""}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
