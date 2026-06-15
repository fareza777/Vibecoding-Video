import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vibecoding Video — Edit Video dengan Bahasa Natural",
    template: "%s · Vibecoding Video",
  },
  description:
    "Editor video berbasis AI. Timeline multi-track, live preview, export FFmpeg, dan Vibecoding — edit video cukup dengan perintah bahasa natural.",
  keywords: [
    "video editor",
    "AI video editing",
    "vibecoding",
    "timeline editor",
    "browser video editor",
  ],
  openGraph: {
    title: "Vibecoding Video",
    description: "Edit video dengan bahasa natural. Timeline, preview, export — semua di browser.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050508",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}