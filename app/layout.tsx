import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Media Playground",
  description: "Generate media with OpenRouter - a DevRel example project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground scanlines`}
        suppressHydrationWarning
      >
        <div className="crt-vignette" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
