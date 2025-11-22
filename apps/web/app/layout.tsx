import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { PrivyProvider } from "@/components/providers/privy-provider";

import { AuthBanner } from "@/components/auth-banner";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "LensLlama - Pay-per-use Stock Photography",
  description: "Decentralized stock photography marketplace with x402 micropayments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <PrivyProvider>
          <AuthBanner />
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
