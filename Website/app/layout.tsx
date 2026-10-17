import type { Metadata,Viewport } from "next";
import "./globals.css";
import "./journey.css";
import "./garden-polish.css";
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};

export const metadata: Metadata = {
  title: "Between Spring and Winter — A World for Aami",
  description: "A love letter in manga, from Shyamu to Aami. An illustrated journey through a little world of paper and memories.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

