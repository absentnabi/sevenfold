import { Delete } from "lucide-react";

import type { Mark } from "@/lib/types";

const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"] as const;

type KeyboardProps = {
  marks: Record<string, Mark | undefined>;
  disabled: boolean;
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
};

export function Keyboard({ marks, disabled, onKey, onBackspace, onEnter }: KeyboardProps) {
  return (
    <div className="keyboard" aria-label="Keyboard">
      {rows.map((row, index) => (
        <div key={row} className="keyboard-row">
          {index === 2 && (
            <button type="button" className="key key-wide" onClick={onEnter} disabled={disabled}>
              Enter
            </button>
          )}
          {row.split("").map((letter) => {
            const mark = marks[letter];
            return (
              <button
                key={letter}
                type="button"
                className="key"
                data-mark={mark ?? "unused"}
                onClick={() => onKey(letter)}
                disabled={disabled}
                aria-label={mark ? `${letter.toUpperCase()}, ${mark}` : letter.toUpperCase()}
              >
                {letter}
              </button>
            );
          })}
          {index === 2 && (
            <button
              type="button"
              className="key key-wide"
              onClick={onBackspace}
              disabled={disabled}
              aria-label="Backspace"
            >
              <Delete />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
