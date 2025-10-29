"use client";

import { useState } from "react";
import ClientMap from "../components/ClientMap";
import Map3D from "../components/Map3D";

export default function Home() {
  const [is3DMode, setIs3DMode] = useState(false);

  return (
    <main className="h-screen w-full bg-black text-white md:h-dvh">
      <div className="h-full flex flex-col">
        <div className="p-4 text-xl font-thin flex-shrink-0 md:block hidden bg-gray-900 text-white border-b border-gray-700 flex items-center justify-between">
          <h1>VanBusCast</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {is3DMode ? "3D表示" : "2D表示"}
            </span>
            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                is3DMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {is3DMode ? "2Dに切り替え" : "3Dに切り替え"}
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 md:flex-1">
          {is3DMode ? <Map3D key="3d" /> : <ClientMap key="2d" />}
        </div>
      </div>
    </main>
  );
}
