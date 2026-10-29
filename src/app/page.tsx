"use client";

import dynamic from "next/dynamic";

const Simulator = dynamic(() => import("@/components/Simulator"), {
  ssr: false,
  loading: () => (
    <main className="loading">
      <div className="loading-icon">A</div>
      <p>AeroScape Simulator を読み込み中…</p>
    </main>
  ),
});

export default function Home() {
  return <Simulator />;
}
