"use client"; // ← これを先頭に追加

import ClientMap from "../components/ClientMap";

export default function Home() {
  return (
    <main className="h-screen w-full bg-black text-white md:h-dvh">
      <div className="h-full flex flex-col">
        <h1 className="p-4 text-xl font-semibold flex-shrink-0 md:block hidden">
          Vancouver Map (Mapbox)
        </h1>
        <div className="flex-1 min-h-0 md:flex-1">
          <ClientMap />
        </div>
      </div>
    </main>
  );
}
