import { ImageResponse } from "next/og";
import { connection } from "next/server";

import { getChallengeCard, isChallengeSlug } from "@/lib/challenge/service";

export const alt = "A Daily Case challenge: the case question and who sent it, never a result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview for challenge links: the challenger and the question. No score, no grid, no answer. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const card = isChallengeSlug(slug) ? await getChallengeCard(slug) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#2b221c", color: "#f4ecdc" }}>
        <div style={{ display: "flex", fontSize: 34, color: "#cdbfa6" }}>{card ? `${card.label} · challenge` : "Daily Case"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, background: "#f8f2e4", color: "#1f1a14", padding: 48, borderRadius: 8 }}>
          <div style={{ display: "flex", fontSize: 36, color: "#b3261e", fontWeight: 700 }}>
            {card ? `${card.challenger} challenges you` : "You've been challenged"}
          </div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>{card ? card.title : "Solve a real mystery"}</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#cdbfa6" }}>No sign-up. Results stay sealed until you finish.</div>
      </div>
    ),
    size,
  );
}
