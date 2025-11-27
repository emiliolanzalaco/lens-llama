import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { PrivyProvider } from "@/components/providers/privy-provider";
import { LlamaMenu } from "@/components/ui/llama-menu";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "LensLlama - Image Licensing",
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
          {children}
          <LlamaMenu />
        </PrivyProvider>
      </body>
    </html>
  );
}
