"use client";

import qrcode from "qrcode-generator";
import { useMemo } from "react";

/** A QR code for a link, drawn as SVG in the browser (no third-party service sees the link). */
export function QrCode({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const svg = useMemo(() => {
    const code = qrcode(0, "M");
    code.addData(value);
    code.make();
    return code.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [value]);

  // The SVG is built locally from our own link: rects and paths only, no markup from outside.
  return <div role="img" aria-label={label} className={`bg-white p-1.5 ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
