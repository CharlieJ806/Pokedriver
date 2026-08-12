import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cards.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f2f8ff",
};

export const metadata: Metadata = {
  title: "宝可驾 · 交规地牢",
  description: "一边答题一边打怪！宝可梦主题的驾考练习游戏",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
