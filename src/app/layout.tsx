import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UFC Rankings",
  description:
    "Explore Featherweight and Lightweight rankings with sourced fighter profiles.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
