import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "147数据局｜斯诺克赛事·球员·排名·数据",
  description: "147数据局是面向中文用户的斯诺克数据平台，提供赛事、比分、球员资料、世界排名与历史数据统计。",
  robots: { index: false, follow: false },
};

export default function SnookerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
