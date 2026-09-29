"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FoldMark } from "@/components/fold-mark";
import { RulesDialog } from "@/components/rules-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, createRoomRequest, joinRoomRequest } from "@/lib/api";
import { normalizeCode } from "@/lib/names";
import { STORAGE_PENDING, saveName, savePlayerId, useStoredName } from "@/lib/storage";

export function Lobby() {
  const router = useRouter();
  const storedName = useStoredName();
  const [name, setName] = useState("");
  const [appliedName, setAppliedName] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  if (storedName !== STORAGE_PENDING && appliedName !== storedName) {
    setAppliedName(storedName);
    setName(storedName);
  }

  async function createRoom() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy("create");
    setError(null);
    try {
      const data = await createRoomRequest(trimmed);
      saveName(trimmed);
      savePlayerId(data.room.code, data.playerId);
      router.push(`/room/${data.room.code}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't create a room.");
      setBusy(null);
    }
  }

  async function joinRoom() {
    const trimmed = name.trim();
    const roomCode = normalizeCode(code);
    if (!trimmed || busy) return;
    if (!roomCode) {
      setError("Enter the 4-character room code. It skips I, O, 0, and 1.");
      return;
    }
    setBusy("join");
    setError(null);
    try {
      const data = await joinRoomRequest(roomCode, trimmed);
      saveName(trimmed);
      savePlayerId(data.room.code, data.playerId);
      router.push(`/room/${data.room.code}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't join that room.");
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-12">
      <div className="mb-8">
        <p className="flex items-center gap-2 text-xs tracking-[0.28em] text-primary uppercase">
          <FoldMark className="size-7 text-primary" />
          A room word game
        </p>
        <h1 className="font-display mt-3 text-6xl leading-none italic sm:text-7xl">Sevenfold</h1>
        <p className="mt-4 max-w-md text-lg leading-7 text-muted-foreground">
          Seven letters. Eight tries. Everyone in the room chases the same secret word.
        </p>
      </div>

      <form
        className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim()) void joinRoom();
          else void createRoom();
        }}
      >
        <label className="text-sm font-medium" htmlFor="display-name">
          Display name
        </label>
        <Input
          id="display-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={18}
          autoComplete="nickname"
          autoCapitalize="words"
          placeholder="Ada"
          className="mt-2 h-11 px-3 text-base md:text-base"
        />

        <Button
          type="button"
          className="mt-4 h-11 w-full text-base"
          disabled={!name.trim() || busy !== null}
          onClick={() => void createRoom()}
        >
          {busy === "create" ? "Creating…" : "Create a room"}
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs tracking-[0.18em] text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          or join
          <span className="h-px flex-1 bg-border" />
        </div>

        <label className="text-sm font-medium" htmlFor="room-code">
          Room code
        </label>
        <div className="mt-2 flex gap-2">
          <Input
            id="room-code"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))
            }
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="K7MQ"
            aria-describedby="code-hint"
            className="h-11 px-3 text-center text-base tracking-[0.35em] uppercase md:text-base"
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-11 px-5 text-base"
            disabled={!name.trim() || busy !== null}
          >
            {busy === "join" ? "Joining…" : "Join"}
          </Button>
        </div>
        <p id="code-hint" className="mt-2 text-xs text-muted-foreground">
          Four characters. The code skips I, O, 0, and 1.
        </p>
        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </form>

      <ul className="mt-6 space-y-2.5 text-sm leading-6 text-muted-foreground">
        <li className="flex gap-3">
          <Legend swatch="correct" />
          Green: right letter, right place.
        </li>
        <li className="flex gap-3">
          <Legend swatch="present" />
          Marigold: the letter is in the word, wrong place.
        </li>
        <li className="flex gap-3">
          <Legend swatch="absent" />
          Slate: that letter is not in the word.
        </li>
        <li className="flex gap-3">
          <span className="mt-1 size-3 shrink-0 rounded-full bg-primary" />
          Fewest guesses wins. The same score shares the win.
        </li>
      </ul>
      <div className="mt-4">
        <RulesDialog triggerClassName="px-0 text-muted-foreground" />
      </div>
    </main>
  );
}

function Legend({ swatch }: { swatch: "correct" | "present" | "absent" }) {
  return <span className={`legend legend-${swatch}`} aria-hidden="true" />;
}
