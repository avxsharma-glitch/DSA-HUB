import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "DSAHub — Solve. Track. Sync.", description: "Open-source DSA practice tracking and GitHub sync companion." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
