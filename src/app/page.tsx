"use client"; // ← これを先頭に追加

import ClientMap from "../components/ClientMap";

export default function Home() {
  return (
    <main className="h-dvh w-full bg-black text-white">
      <div className="h-full">
        <h1 className="p-4 text-xl font-semibold">Vancouver Map (Mapbox)</h1>
        <div className="h-[calc(100%-3rem)]">
          <ClientMap />
        </div>
      </div>
    </main>
  );
}
