import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Coming soon",
  description: "A web product for working adults in the US. Launching soon.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
