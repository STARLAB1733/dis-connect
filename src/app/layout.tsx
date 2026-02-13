  import type { Metadata } from "next";
  import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
  import "./globals.css";

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
    description: "MEP 2025",
  };

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${noto.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    );
  }
