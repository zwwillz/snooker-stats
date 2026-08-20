import type { Metadata } from "next";
import "./globals.css";
import "./public-ux-polish.css";
import PublicVisitTracker from "./public-visit-tracker";

export const metadata: Metadata = {
  title: "147数据局｜中文斯诺克数据平台",
  description: "147数据局提供世界斯诺克赛事、实时比分、球员资料、世界排名、历史纪录与专业数据分析。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <PublicVisitTracker />
      </body>
    </html>
  );
}
