import type { Metadata } from "next";
import "./globals.css";
import "./journey.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}

