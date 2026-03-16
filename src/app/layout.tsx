import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/components/AudioProvider";
import { DeviceToggle } from "@/components/DeviceToggle";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const noto = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "DISConnect",
  description: "SAF Digital Intelligence Service — C4X(Digital) Vocation Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${noto.variable} antialiased`}>
        <AudioProvider>
          {children}
        </AudioProvider>
        <DeviceToggle />
        <Analytics />
      </body>
    </html>
  );
}
