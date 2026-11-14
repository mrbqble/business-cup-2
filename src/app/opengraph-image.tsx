import { ImageResponse } from "next/og";

export const alt = "Daily Case: a real history or science mystery every day, with every clue checked against its source";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview image for the home page link. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#2b221c", color: "#f4ecdc" }}>
        <div style={{ display: "flex", fontSize: 40, color: "#e3c58b", fontWeight: 700 }}>Daily Case</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, background: "#f8f2e4", color: "#1f1a14", padding: 48, borderRadius: 8 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>A real mystery to solve every day</div>
          <div style={{ display: "flex", fontSize: 32, color: "#5c5144" }}>Every clue quotes a real source, and code checks each quote.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#cdbfa6" }}>No sign-up. Free daily case. Challenge a friend.</div>
      </div>
    ),
    size,
  );
}
