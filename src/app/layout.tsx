import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leadline",
  description: "A shared lead pipeline for small teams that sell.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
        <footer className="border-t border-neutral-800 py-6 text-center text-xs text-neutral-500">
          Built by{" "}
          <span className="text-neutral-300">Your Name</span>
        </footer>
      </body>
    </html>
  );
}
