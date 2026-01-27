import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MixpanelProvider } from "@/components/MixpanelProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RevBridge Calendar",
  description: "Schedule a meeting with RevBridge AI",
  openGraph: {
    title: "RevBridge Calendar",
    description: "Schedule a meeting with RevBridge AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MixpanelProvider />
        {children}
      </body>
    </html>
  );
}
