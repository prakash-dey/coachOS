import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CoachOS",
    template: "%s | CoachOS",
  },
  description:
    "Manage clients, coaching plans, check-ins, and progress from one focused workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<main className="min-h-screen animate-pulse bg-background" />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
