import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { z } from "zod";

import { getSharedResult } from "@/lib/play/service";

export const alt = "A Daily Case result: the case question and a spoiler-free grid";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS: Record<string, string> = { "🔎": "#1f4fd1", "⬛": "#3a3833", "❌": "#b42318", "✅": "#15803d" };

/** Preview image for shared links: the question, the grid as colored squares and the score. Never the answer. */
export default async function Image({ params }: { params: Promise<{ playId: string }> }) {
  await connection();
  const { playId } = await params;
  const result = z.uuid().safeParse(playId).success ? await getSharedResult(playId) : null;

  const label = result?.case.kind === "daily" && result.case.number ? `Daily Case #${result.case.number}` : "Daily Case";
  const squares = result ? [...result.grid].filter((symbol) => symbol in COLORS) : [];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#121110", color: "#f1eee8" }}>
        <div style={{ display: "flex", fontSize: 34, color: "#a8a197" }}>{label}</div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 700, lineHeight: 1.15 }}>
          {result ? result.case.title : "Solve today's real mystery"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {squares.map((symbol, index) => (
            <div key={index} style={{ width: 64, height: 64, borderRadius: 12, background: COLORS[symbol] }} />
          ))}
          {result && <div style={{ display: "flex", marginLeft: 24, fontSize: 56, fontWeight: 700 }}>{result.score}</div>}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#a8a197" }}>Every clue quotes a real source, checked by code.</div>
      </div>
    ),
    size,
  );
}
