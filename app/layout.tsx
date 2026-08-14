import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cards.css";
import "./art.css";

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
  // iOS 添加到主屏幕后全屏启动(无浏览器工具栏)
  appleWebApp: {
    capable: true,
    title: "宝可驾",
    statusBarStyle: "default",
  },
  // Next 16 的 capable 只输出通用 mobile-web-app-capable,iOS 识别的是 apple- 前缀版本,手动补上
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
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
