import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BHUMI IQ | Unified Land Intelligence",
  description: "AI-assisted geospatial land intelligence, reconciliation, and officer verification platform.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
