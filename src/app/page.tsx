"use client";

import { useState, useRef } from "react";
import ClientMap from "../components/ClientMap";
import Map3D from "../components/Map3D";

export default function Home() {
  const [is3DMode, setIs3DMode] = useState(false);

  // 共有状態
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -123.1207, 49.2827,
  ]);
  const [mapZoom, setMapZoom] = useState(12);

  // マーカー関連の共有状態
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [pinnedStops, setPinnedStops] = useState<Set<string>>(new Set());
  const [pinnedStopsData, setPinnedStopsData] = useState<{
    [key: string]: any;
  }>({});

  // マップインスタンスの参照
  const mapRef2D = useRef<any>(null);
  const mapRef3D = useRef<any>(null);

  // マップ切り替え時の処理
  const handleMapToggle = () => {
    // 現在のマップの状態を保存
    const currentMap = is3DMode ? mapRef3D.current : mapRef2D.current;
    if (currentMap) {
      const center = currentMap.getCenter();
      const zoom = currentMap.getZoom();
      setMapCenter([center.lng, center.lat]);
      setMapZoom(zoom);
    }

    // パネルを閉じる
    setIsPanelOpen(false);

    // マップモードを切り替え
    setIs3DMode(!is3DMode);
  };

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
              onClick={handleMapToggle}
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
          {is3DMode ? (
            <Map3D
              ref={mapRef3D}
              selectedStop={selectedStop}
              setSelectedStop={setSelectedStop}
              isPanelOpen={isPanelOpen}
              setIsPanelOpen={setIsPanelOpen}
              selectedStopId={selectedStopId}
              setSelectedStopId={setSelectedStopId}
              initialCenter={mapCenter}
              initialZoom={mapZoom}
              userLocation={userLocation}
              setUserLocation={setUserLocation}
              pinnedStops={pinnedStops}
              setPinnedStops={setPinnedStops}
              pinnedStopsData={pinnedStopsData}
              setPinnedStopsData={setPinnedStopsData}
            />
          ) : (
            <ClientMap
              ref={mapRef2D}
              selectedStop={selectedStop}
              setSelectedStop={setSelectedStop}
              isPanelOpen={isPanelOpen}
              setIsPanelOpen={setIsPanelOpen}
              selectedStopId={selectedStopId}
              setSelectedStopId={setSelectedStopId}
              initialCenter={mapCenter}
              initialZoom={mapZoom}
              userLocation={userLocation}
              setUserLocation={setUserLocation}
              pinnedStops={pinnedStops}
              setPinnedStops={setPinnedStops}
              pinnedStopsData={pinnedStopsData}
              setPinnedStopsData={setPinnedStopsData}
            />
          )}
        </div>
      </div>
    </main>
  );
}
