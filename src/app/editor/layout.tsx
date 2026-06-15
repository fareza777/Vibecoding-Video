import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor",
  description: "Vibecoding Video editor — timeline, preview, AI vibecoding, export.",
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="editor-route">{children}</div>;
}