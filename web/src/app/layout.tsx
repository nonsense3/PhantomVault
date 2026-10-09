import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhantomVault AI — Digital Decoy & Threat Intelligence Center",
  description:
    "Forward a scam, and let AI waste the scammer's time while you collect structured evidence and technical indicators of compromise.",
  icons: {
    icon: "/logo.png",
    apple: "/logo-256.png",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
