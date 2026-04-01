import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "吃素日曆 🌿",
  description: "農曆初一、十五吃素提醒日曆，結合地圖找素食餐廳和LINE通知",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
