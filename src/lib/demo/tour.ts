import "server-only";

import { buildPlayView, type PlayView } from "@/lib/case/view";
import { findDemoCase } from "@/lib/db/cases";
import { replay, rulesFor, type GameAction } from "@/lib/game/engine";
import { rankFor, type Rank } from "@/lib/game/rank";

/** The guided demo: views of one sample case after a scripted set of moves. Nothing is stored. */
export interface DemoTour {
  initial: PlayView;
  opened: PlayView;
  openedClueId: string;
  ruled: PlayView;
  ruledHypothesisId: string;
  solved: PlayView;
  promotion: Rank;
}

export async function buildDemoTour(): Promise<DemoTour | null> {
  const record = await findDemoCase();
  if (!record) return null;
  const rules = rulesFor(record.content);
  const sealed = record.content.clues.find((clue) => !rules.openingClueIds.includes(clue.id));
  const decoy = record.content.hypotheses.find((h) => !h.correct);
  const answer = record.content.hypotheses.find((h) => h.correct);
  if (!sealed || !decoy || !answer) return null;

  const script: GameAction[] = [
    { type: "open", clueId: sealed.id },
    { type: "accuse", hypothesisId: decoy.id },
    { type: "accuse", hypothesisId: answer.id },
  ];
  const [initial, opened, ruled, solved] = [0, 1, 2, 3].map((moves) => {
    const replayed = replay(rules, script.slice(0, moves));
    if (!replayed.ok) throw new Error(`Demo script no longer replays: ${replayed.error}`);
    return buildPlayView(record, replayed.state);
  });
  return {
    initial,
    opened,
    openedClueId: sealed.id,
    ruled,
    ruledHypothesisId: decoy.id,
    solved,
    promotion: rankFor({ cases: 1, points: solved.score }),
  };
}
