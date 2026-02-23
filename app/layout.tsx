import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "マンション総会 電子投票システム",
  description: "マンション管理組合 総会議案 電子投票・集計システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
