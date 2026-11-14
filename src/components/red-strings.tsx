"use client";

import { useEffect, useState, type RefObject } from "react";

interface Link {
  /** Ruled-out hypothesis id. */
  from: string;
  /** Id of the clue that rules it out. */
  to: string;
}

interface Drawn {
  id: string;
  d: string;
  start: [number, number];
  end: [number, number];
}

/**
 * Desktop only: red string from each ruled-out theory to the clue that refutes it, pinned at both
 * ends. Positions are measured from the cards, so it follows the layout as cards open.
 */
export function RedStrings({ boardRef, links, freshIds }: { boardRef: RefObject<HTMLElement | null>; links: Link[]; freshIds: ReadonlySet<string> }) {
  const [drawn, setDrawn] = useState<Drawn[]>([]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const box = board.getBoundingClientRect();
      setDrawn(
        links.flatMap(({ from, to }) => {
          const suspect = document.getElementById(`suspect-${from}`)?.getBoundingClientRect();
          const clue = document.getElementById(`clue-${to}`)?.getBoundingClientRect();
          if (!suspect || !clue) return [];
          const start: [number, number] = [suspect.left - box.left + 6, suspect.top - box.top + 22];
          const end: [number, number] = [clue.right - box.left - 6, clue.top - box.top + 22];
          const sag = Math.min(90, Math.abs(end[1] - start[1]) / 5 + 36);
          const d = `M ${start[0]} ${start[1]} Q ${(start[0] + end[0]) / 2} ${Math.max(start[1], end[1]) + sag} ${end[0]} ${end[1]}`;
          return [{ id: from, d, start, end }];
        }),
      );
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => requestAnimationFrame(measure));
    observer.observe(board);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [boardRef, links]);

  if (drawn.length === 0) return null;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible lg:block">
      {drawn.map(({ id, d, start, end }) => (
        <g key={id}>
          <path
            d={d}
            pathLength={100}
            className={freshIds.has(id) ? "draw-line" : ""}
            style={{ ["--line-length" as string]: 100 }}
            stroke="var(--string-red)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {[start, end].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#c62f25" stroke="#15110d" strokeWidth="1.5" />
          ))}
        </g>
      ))}
    </svg>
  );
}
