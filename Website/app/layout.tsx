import type { Metadata,Viewport } from "next";
import "./globals.css";
import "./journey.css";
import "./garden-polish.css";
import LandscapeGuard from './landscape-guard';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};

export const metadata: Metadata = {
  title: "Between Spring and Winter — Read the Manga",
  description: "A love letter in manga, from Shyamu to Aami. Discover the story, then scroll to open and read Part One: Spring.",
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
      <body className="antialiased">{children}<LandscapeGuard/></body>
    </html>
  );
}

