/** Detective ranks, earned with finished cases and lifetime points (a case lost on lives scores 0). */
export const RANKS = [
  { name: "Rookie", cases: 0, points: 0 },
  { name: "Investigator", cases: 1, points: 0 },
  { name: "Detective", cases: 3, points: 1_500 },
  { name: "Inspector", cases: 7, points: 4_000 },
  { name: "Chief", cases: 15, points: 9_000 },
] as const;

export type RankName = (typeof RANKS)[number]["name"];

export interface PlayerRecord {
  /** Finished plays, solved or failed. */
  cases: number;
  /** Sum of final scores. */
  points: number;
}

export interface Rank {
  name: RankName;
  /** 1 (Rookie) to 5 (Chief). */
  level: number;
  cases: number;
  points: number;
  /** What the next rank needs beyond the current record; null at the top. */
  next: { name: RankName; casesToGo: number; pointsToGo: number } | null;
}

export function rankFor(record: PlayerRecord): Rank {
  const cases = wholeOrZero(record.cases);
  const points = wholeOrZero(record.points);
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (cases >= rank.cases && points >= rank.points) index = i;
  });
  const following = RANKS[index + 1];
  return {
    name: RANKS[index].name,
    level: index + 1,
    cases,
    points,
    next: following
      ? { name: following.name, casesToGo: Math.max(0, following.cases - cases), pointsToGo: Math.max(0, following.points - points) }
      : null,
  };
}

/** The rank a just-finished play earned, or null when it didn't change the rank. */
export function promotionFor(after: PlayerRecord, finishedScore: number): Rank | null {
  const now = rankFor(after);
  const before = rankFor({ cases: after.cases - 1, points: after.points - finishedScore });
  return now.level > before.level ? now : null;
}

function wholeOrZero(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
