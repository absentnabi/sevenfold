import type { PlayerStatus, Standings } from "./types";

export type StandingInput = {
  id: string;
  name: string;
  status: PlayerStatus;
  solvedIn: number | null;
  guessCount: number;
};

export function computeStandings(players: StandingInput[]): Standings {
  const solved = players.filter((player) => player.status === "solved" && player.solvedIn != null);
  const best = solved.length ? Math.min(...solved.map((player) => player.solvedIn as number)) : null;
  const leaderIds =
    best == null ? [] : solved.filter((player) => player.solvedIn === best).map((player) => player.id);
  const canCatchIds =
    best == null
      ? players.filter((player) => player.status === "playing").map((player) => player.id)
      : players
          .filter((player) => player.status === "playing" && player.guessCount < best)
          .map((player) => player.id);

  const anyonePlaying = players.some((player) => player.status === "playing");
  const decided = players.length > 0 && !anyonePlaying ? true : best != null && canCatchIds.length === 0;

  return { decided, best, leaderIds, canCatchIds };
}

function listNames(names: string[]): string {
  if (names.length === 0) return "Someone";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function guessLabel(count: number): string {
  return count === 1 ? "1 guess" : `${count} guesses`;
}

export function standingsHeadline(
  players: StandingInput[],
  standings: Standings,
  viewerId?: string,
): string {
  const nameOf = (id: string) => players.find((player) => player.id === id)?.name ?? "Someone";
  const playingLeft = players.some((player) => player.status === "playing");
  const viewerIsLeader = Boolean(viewerId && standings.leaderIds.includes(viewerId));
  const otherLeaderNames = standings.leaderIds
    .filter((id) => id !== viewerId)
    .map(nameOf)
    .sort((a, b) => a.localeCompare(b));
  const leaderNames = standings.leaderIds.map(nameOf).sort((a, b) => a.localeCompare(b));

  if (!standings.decided && standings.best == null) {
    return players.length < 2
      ? "Share the code, or play this one yourself."
      : "No one has solved it yet.";
  }

  if (!standings.decided && standings.best != null) {
    const still =
      standings.canCatchIds.length === 1
        ? "1 player is still in it."
        : `${standings.canCatchIds.length} players are still in it.`;
    let who: string;
    if (viewerIsLeader && otherLeaderNames.length === 0) who = "You lead";
    else if (viewerIsLeader) who = `${listNames(["You", ...otherLeaderNames])} lead`;
    else if (leaderNames.length === 1) who = `${leaderNames[0]} leads`;
    else who = `${listNames(leaderNames)} lead`;
    return `${who} with ${guessLabel(standings.best)}. ${still}`;
  }

  if (standings.best == null) {
    return players.length < 2 ? "You didn't get this one." : "No one solved this word.";
  }

  let phrase: string;
  if (viewerIsLeader && otherLeaderNames.length === 0) phrase = "You win";
  else if (viewerIsLeader) phrase = `${listNames(["You", ...otherLeaderNames])} share the win`;
  else if (leaderNames.length === 1) phrase = `${leaderNames[0]} wins`;
  else phrase = `${listNames(leaderNames)} share the win`;

  const base = `${phrase} in ${guessLabel(standings.best)}.`;
  if (!playingLeft) return base;
  return standings.leaderIds.length > 1
    ? `${base} No one else can match it.`
    : `${base} No one else can catch that.`;
}
