import { Crown } from "lucide-react";

import { standingsHeadline } from "@/lib/standings";
import { MAX_GUESSES, type PublicPlayer, type PublicRoom } from "@/lib/types";

function scoreLabel(player: PublicPlayer) {
  if (player.status === "solved" && player.solvedIn) return `${player.solvedIn}/${MAX_GUESSES}`;
  if (player.status === "failed") return "Out";
  return `${player.guessCount}/${MAX_GUESSES}`;
}

function sorted(players: PublicPlayer[]) {
  const group = { solved: 0, playing: 1, failed: 2 };
  return [...players].sort((a, b) => {
    const byStatus = group[a.status] - group[b.status];
    if (byStatus) return byStatus;
    if (a.status === "solved" && b.status === "solved") {
      const byScore = (a.solvedIn ?? 9) - (b.solvedIn ?? 9);
      if (byScore) return byScore;
    }
    return a.name.localeCompare(b.name);
  });
}

function Pips({ player }: { player: PublicPlayer }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: MAX_GUESSES }, (_, index) => {
        const used = index < player.guessCount;
        const tone = !used ? "empty" : player.status === "failed" ? "bad" : player.status === "solved" ? "good" : "mid";
        return <span key={index} className={`pip pip-${tone}`} />;
      })}
    </span>
  );
}

export function Standings({ room, compact = false }: { room: PublicRoom; compact?: boolean }) {
  const players = sorted(room.players);
  const headline = standingsHeadline(
    room.players.map((player) => ({
      id: player.id,
      name: player.name,
      status: player.status,
      solvedIn: player.solvedIn,
      guessCount: player.guessCount,
    })),
    room.standings,
    room.you.id,
  );

  const ranks = new Map<string, number>();
  let placed = 0;
  let currentRank = 0;
  let lastScore = -1;
  for (const player of players) {
    if (player.status !== "solved" || player.solvedIn == null) continue;
    placed += 1;
    if (player.solvedIn !== lastScore) {
      currentRank = placed;
      lastScore = player.solvedIn;
    }
    ranks.set(player.id, currentRank);
  }

  if (compact) {
    return (
      <section className="space-y-2" aria-label="Standings">
        <p className="text-sm leading-5 text-muted-foreground" aria-live="polite">
          {headline}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {players.map((player) => (
            <div key={player.id} className="player-chip">
              <span className="max-w-28 truncate">{player.isYou ? `${player.name} (you)` : player.name}</span>
              <span className="text-muted-foreground">{scoreLabel(player)}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="standings-card" aria-label="Standings">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl italic leading-none">Standings</h2>
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Round {room.round}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground/90" aria-live="polite">
        {headline}
      </p>
      <ol className="mt-4 space-y-2">
        {players.map((player) => {
          const champion = room.standings.decided && room.standings.leaderIds.includes(player.id);
          const rank = ranks.get(player.id);
          return (
            <li key={player.id} className={player.isYou ? "standing standing-you" : "standing"}>
              <span className="w-5 text-center text-sm text-muted-foreground tabular-nums">
                {rank ?? "·"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium">
                    {player.name}
                    {player.isYou ? " (you)" : ""}
                  </span>
                  {player.isHost && <span className="host-pill">Host</span>}
                  {champion && <Crown className="size-3.5 text-primary" aria-label="Winner" />}
                </span>
                <Pips player={player} />
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">{scoreLabel(player)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
