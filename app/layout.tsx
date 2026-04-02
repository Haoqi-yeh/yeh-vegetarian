import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "這是一個吃素的小日曆",
  description: "農曆初一、十五吃素提醒日曆，結合地圖找素食餐廳和LINE通知",
  manifest: "/manifest.json",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍃</text></svg>",
  },
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
