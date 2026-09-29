"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";

import { Board } from "@/components/board";
import { FoldMark } from "@/components/fold-mark";
import { Keyboard } from "@/components/keyboard";
import { RulesDialog } from "@/components/rules-dialog";
import { Standings } from "@/components/standings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiError, getRoomRequest, guessRequest, joinRoomRequest, nextRoundRequest } from "@/lib/api";
import { keyboardMarks } from "@/lib/score";
import { normalizeCode, sanitizeName } from "@/lib/names";
import {
  STORAGE_PENDING,
  clearPlayerId,
  saveName,
  savePlayerId,
  useStoredName,
  useStoredPlayerId,
} from "@/lib/storage";
import { MAX_GUESSES, WORD_LENGTH, type PublicRoom } from "@/lib/types";

const flipMs = 120 * (WORD_LENGTH - 1) + 560 + 40;

export function RoomScreen({ code }: { code: string }) {
  const normalized = normalizeCode(code);
  if (!normalized) return <Unavailable title="That code doesn't look right." body="Room codes are 4 characters and skip I, O, 0, and 1." />;
  return <LiveRoom code={normalized} />;
}

function LiveRoom({ code }: { code: string }) {
  const storedId = useStoredPlayerId(code);
  const storedName = useStoredName();
  const clientReady = storedId !== STORAGE_PENDING;
  const playerId = clientReady ? storedId : "";
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [problem, setProblem] = useState<{ kind: "missing" } | { kind: "error"; message: string } | null>(null);
  const [name, setName] = useState("");
  const [appliedName, setAppliedName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<{ id: number; text: string } | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [copied, setCopied] = useState<"link" | "grid" | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [animatingRow, setAnimatingRow] = useState<number | null>(null);
  const [seen, setSeen] = useState({ round: -1, guesses: 0 });

  const guessLock = useRef(false);
  const confirmRef = useRef(false);
  const roomRef = useRef<PublicRoom | null>(null);
  const handlers = useRef<{
    submit: () => void;
    typeLetter: (letter: string) => void;
    backspace: () => void;
  }>({
    submit: () => undefined,
    typeLetter: () => undefined,
    backspace: () => undefined,
  });

  if (storedName !== STORAGE_PENDING && appliedName !== storedName) {
    setAppliedName(storedName);
    setName(storedName);
  }

  if (room && (seen.round !== room.round || seen.guesses !== room.you.guesses.length)) {
    const previous = seen;
    const nextGuesses = room.you.guesses.length;
    setSeen({ round: room.round, guesses: nextGuesses });
    if (previous.round === room.round && nextGuesses > previous.guesses) {
      setAnimatingRow(nextGuesses - 1);
    } else if (previous.round !== -1 && previous.round !== room.round) {
      setDraft("");
      setAnimatingRow(null);
    }
  }

  function showNote(text: string) {
    setNote({ id: Date.now(), text });
  }

  const applyRoom = useCallback((next: PublicRoom) => {
    setRoom((current) => {
      if (!current) return next;
      if (next.revision < current.revision) return current;
      if (next.round < current.round) return current;
      if (next.round === current.round && next.you.guesses.length < current.you.guesses.length) return current;
      return next;
    });
  }, []);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    confirmRef.current = confirmNew;
  }, [confirmNew]);

  useEffect(() => {
    if (!playerId) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.hidden || guessLock.current) return;
      try {
        const data = await getRoomRequest(code, playerId);
        if (stopped) return;
        applyRoom(data.room);
        setOffline(false);
      } catch (error: unknown) {
        if (stopped) return;
        const status = error instanceof ApiError ? error.status : 0;
        if (status === 404) {
          clearPlayerId(code);
          setRoom(null);
          setProblem({ kind: "missing" });
          return;
        }
        if (status === 401) {
          clearPlayerId(code);
          setRoom(null);
          setProblem(null);
          return;
        }
        if (!roomRef.current) {
          setProblem({
            kind: "error",
            message: error instanceof Error ? error.message : "Couldn't open this room.",
          });
        } else {
          setOffline(true);
        }
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1200);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [playerId, code, applyRoom]);

  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(null), 2200);
    return () => window.clearTimeout(timer);
  }, [note]);

  useEffect(() => {
    if (!shake) return;
    const timer = window.setTimeout(() => setShake(false), 420);
    return () => window.clearTimeout(timer);
  }, [shake]);

  useEffect(() => {
    if (animatingRow == null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setAnimatingRow(null), reduce ? 0 : flipMs);
    return () => window.clearTimeout(timer);
  }, [animatingRow]);

  const typeLetter = (letter: string) => {
    if (!room || room.you.status !== "playing" || busy || animatingRow !== null || confirmRef.current) return;
    setDraft((current) => (current.length >= WORD_LENGTH ? current : current + letter.toLowerCase()));
  };

  const backspace = () => {
    if (busy || animatingRow !== null || confirmRef.current) return;
    setDraft((current) => current.slice(0, -1));
  };

  const submit = async () => {
    if (!room || !playerId || room.you.status !== "playing" || busy || animatingRow !== null || confirmRef.current) {
      return;
    }
    if (draft.length < WORD_LENGTH) {
      showNote("Not enough letters");
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      return;
    }
    setBusy(true);
    guessLock.current = true;
    try {
      const data = await guessRequest(code, playerId, draft);
      setDraft("");
      setNote(null);
      applyRoom(data.room);
    } catch (error: unknown) {
      showNote(error instanceof Error ? error.message : "Couldn't submit that guess.");
      setShake(false);
      requestAnimationFrame(() => setShake(true));
    } finally {
      guessLock.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    handlers.current.submit = () => {
      void submit();
    };
    handlers.current.typeLetter = typeLetter;
    handlers.current.backspace = backspace;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (confirmRef.current) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") {
        event.preventDefault();
        handlers.current.submit();
      } else if (event.key === "Backspace") {
        event.preventDefault();
        handlers.current.backspace();
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        handlers.current.typeLetter(event.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function join(event: FormEvent) {
    event.preventDefault();
    const clean = sanitizeName(name);
    if (!clean) {
      setJoinError("Enter a display name (1–18 characters).");
      return;
    }
    setBusy(true);
    setJoinError(null);
    try {
      const data = await joinRoomRequest(code, clean);
      saveName(clean);
      savePlayerId(code, data.playerId);
      setSeen({ round: data.room.round, guesses: data.room.you.guesses.length });
      setDraft("");
      setProblem(null);
      setRoom(data.room);
    } catch (error: unknown) {
      setJoinError(error instanceof ApiError ? error.message : "Couldn't join that room.");
    } finally {
      setBusy(false);
    }
  }

  async function startNext(force: boolean) {
    if (!room || !playerId) return;
    const anyonePlaying = room.players.some((player) => player.status === "playing");
    if (anyonePlaying && !force) {
      setConfirmNew(true);
      return;
    }
    setConfirmNew(false);
    setBusy(true);
    try {
      const data = await nextRoundRequest(code, playerId);
      setDraft("");
      setNote(null);
      applyRoom(data.room);
    } catch (error: unknown) {
      showNote(error instanceof Error ? error.message : "Couldn't start a new word.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string, kind: "link" | "grid") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1600);
    } catch {
      showNote("Couldn't copy. The code is on screen.");
    }
  }

  const screen = !clientReady
    ? "boot"
    : problem?.kind === "missing"
      ? "missing"
      : problem?.kind === "error" && !room
        ? "error"
        : playerId && !room
          ? "boot"
          : !playerId
            ? "join"
            : "play";

  if (screen === "boot") {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <FoldMark className="mx-auto size-12 text-primary" />
          <p className="mt-4 text-muted-foreground">Setting the table…</p>
        </div>
      </main>
    );
  }

  if (screen === "missing") {
    return (
      <Unavailable
        title="This room isn't open."
        body="The code is wrong, or the server restarted and cleared its rooms. Start a new one."
      />
    );
  }

  if (screen === "error") {
    return (
      <Unavailable
        title="Couldn't reach the room."
        body={problem?.kind === "error" ? problem.message : "Couldn't open this room."}
      />
    );
  }

  if (screen === "join" || !room) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-primary">
          <FoldMark className="size-7" />
          <span className="font-display text-2xl italic text-foreground">Sevenfold</span>
        </Link>
        <form onSubmit={(event) => void join(event)} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">Join room</p>
          <p className="font-display mt-2 text-4xl tracking-[0.28em]">{code}</p>
          <label className="mt-5 block text-sm font-medium" htmlFor="join-name">
            Display name
          </label>
          <Input
            id="join-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={18}
            autoComplete="nickname"
            placeholder="Ada"
            className="mt-2 h-11 px-3 text-base md:text-base"
          />
          {joinError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {joinError}
            </p>
          )}
          <Button type="submit" className="mt-4 h-11 w-full text-base" disabled={busy || !name.trim()}>
            {busy ? "Joining…" : "Join room"}
          </Button>
        </form>
      </main>
    );
  }

  const locked = busy || animatingRow !== null || room.you.status !== "playing";
  const statusText =
    note?.text ??
    (room.you.status === "playing" && room.you.guesses.length === 0 ? "Guess a seven-letter word." : "");
  const grid =
    room.you.status === "playing"
      ? ""
      : `Sevenfold ${room.you.status === "solved" ? room.you.solvedIn : "X"}/${MAX_GUESSES}\n${room.you.guesses
          .map((guess) =>
            guess.marks.map((mark) => (mark === "correct" ? "🟩" : mark === "present" ? "🟨" : "⬛")).join(""),
          )
          .join("\n")}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 py-3 sm:px-5 sm:py-5">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2">
          <FoldMark className="size-8 shrink-0 text-primary" />
          <span className="font-display truncate text-2xl italic sm:text-3xl">Sevenfold</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {offline && <span className="text-xs text-destructive">Reconnecting…</span>}
          <button
            type="button"
            className="code-chip"
            onClick={() => void copyText(`${window.location.origin}/room/${room.code}`, "link")}
            aria-label="Copy room link"
          >
            <span>{room.code}</span>
            {copied === "link" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
          <RulesDialog />
        </div>
      </header>

      <div className="mt-4 grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-full max-w-xl lg:hidden">
            <Standings room={room} compact />
          </div>
          {room.answer && (
            <div className="result-banner">
              <p className="text-sm text-muted-foreground">
                {room.you.status === "solved" ? `Solved in ${room.you.solvedIn}.` : "Out of guesses."}
              </p>
              <p className="font-display text-3xl tracking-[0.22em] uppercase">{room.answer}</p>
              <Button
                type="button"
                variant="secondary"
                className="h-9"
                onClick={() => void copyText(grid, "grid")}
              >
                {copied === "grid" ? "Copied" : "Copy grid"}
              </Button>
            </div>
          )}
          <Board guesses={room.you.guesses} draft={draft} shake={shake} animatingRow={animatingRow} />
          <p className="status-line" aria-live="polite">
            {statusText || "\u00a0"}
          </p>
          <Keyboard
            marks={keyboardMarks(room.you.guesses)}
            disabled={locked}
            onKey={typeLetter}
            onBackspace={backspace}
            onEnter={() => void submit()}
          />
          <div className="w-full max-w-xl lg:hidden">
            <RoomActions room={room} busy={busy} onNext={() => void startNext(false)} />
          </div>
        </div>
        <aside className="hidden lg:block">
          <Standings room={room} />
          <RoomActions room={room} busy={busy} onNext={() => void startNext(false)} />
        </aside>
      </div>

      <Dialog open={confirmNew} onOpenChange={setConfirmNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl italic">Start a new word?</DialogTitle>
            <DialogDescription>
              Anyone still guessing will lose this word. The whole room gets a fresh secret.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmNew(false)}>
              Keep this word
            </Button>
            <Button type="button" onClick={() => void startNext(true)} disabled={busy}>
              New word
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function RoomActions({
  room,
  busy,
  onNext,
}: {
  room: PublicRoom;
  busy: boolean;
  onNext: () => void;
}) {
  if (!room.you.isHost) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        {room.players.length === 1
          ? "You're the host. Share the code when a friend wants in."
          : `${room.players.find((player) => player.isHost)?.name ?? "The host"} can start the next word.`}
      </p>
    );
  }
  return (
    <div className="mt-4">
      <Button type="button" className="h-11 w-full text-base" onClick={onNext} disabled={busy}>
        New word
      </Button>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {room.players.length === 1
          ? "You're playing alone. Share the code to make it a race."
          : "Ends the current word for everyone and deals a new one."}
      </p>
    </div>
  );
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <FoldMark className="mx-auto size-12 text-primary" />
        <h1 className="font-display mt-4 text-4xl italic">{title}</h1>
        <p className="mt-3 text-muted-foreground">{body}</p>
        <Button asChild className="mt-6 h-11 px-5">
          <Link href="/">Back to the lobby</Link>
        </Button>
      </div>
    </main>
  );
}
