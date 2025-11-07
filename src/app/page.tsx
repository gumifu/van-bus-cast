"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ClientMap from "../components/ClientMap";
import Map3D from "../components/Map3D";
import Logo from "../components/Logo";
import SplashScreen from "../components/SplashScreen";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [is3DMode, setIs3DMode] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  // キャッシュがない時のみスプラッシュスクリーンを表示
  useEffect(() => {
    // キャッシュ（localStorage）の有無をチェック
    const splashCache = localStorage.getItem("splashCache");

    if (!splashCache) {
      // キャッシュがない場合は表示
      setShowSplash(true);
    }

    // スーパーリロード時も表示（sessionStorageでこのセッション内の表示を管理）
    const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isReload = navigationType?.type === 'reload';

    if (isReload) {
      const hasSeenInSession = sessionStorage.getItem("hasSeenSplashInSession");
      if (!hasSeenInSession) {
        setShowSplash(true);
        sessionStorage.setItem("hasSeenSplashInSession", "true");
      }
    }
  }, []);

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

  // URLパラメータからバス停を読み込む
  useEffect(() => {
    const stopIdParam = searchParams.get("stop");
    if (stopIdParam && !selectedStop) {
      // URLからバス停IDを取得して表示
      loadStopFromUrl(stopIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // URLからバス停情報を読み込む
  const loadStopFromUrl = async (stopId: string) => {
    try {
      const response = await fetch("/data/stops.geojson");
      const data = await response.json();

      const stopData = data.features.find(
        (feature: any) => feature.properties?.stop_id === stopId
      );

      if (stopData) {
        setSelectedStop({
          properties: stopData.properties,
          geometry: stopData.geometry,
        });
        setSelectedStopId(stopId);
        setIsPanelOpen(true);

        // マップの準備を待ってから中心を移動
        const waitForMap = (attempts = 0) => {
          const currentMap = is3DMode ? mapRef3D.current : mapRef2D.current;
          if (currentMap && currentMap.isStyleLoaded()) {
            currentMap.flyTo({
              center: stopData.geometry.coordinates,
              zoom: 16,
              essential: true,
            });
          } else if (attempts < 20) {
            // 最大20回（2秒）待つ
            setTimeout(() => waitForMap(attempts + 1), 100);
          }
        };
        waitForMap();
      }
    } catch (error) {
      console.error("Error loading stop from URL:", error);
    }
  };

  // バス停を選択したときにURLを更新（ClientMap/Map3Dから呼ばれる）
  const handleStopSelect = (stop: any) => {
    const stopId = stop?.properties?.stop_id || stop?.stop_id || null;
    setSelectedStop(stop);
    setSelectedStopId(stopId);
    setIsPanelOpen(true);

    // URLを更新
    if (stopId) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set("stop", stopId);
      router.replace(`?${newSearchParams.toString()}`, { scroll: false });
    }
  };

  // パネルを開くハンドラー
  const handlePanelOpen = (open: boolean) => {
    setIsPanelOpen(open);
    if (!open) {
      // 閉じるときはURLからパラメータを削除
      setSelectedStop(null);
      setSelectedStopId(null);
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("stop");
      const newUrl = newSearchParams.toString()
        ? `?${newSearchParams.toString()}`
        : "/";
      router.replace(newUrl, { scroll: false });
    }
  };

  // パネルを閉じるときにURLからパラメータを削除（ClientMap/Map3Dから呼ばれる）
  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setSelectedStop(null);
    setSelectedStopId(null);

    // URLからstopパラメータを削除
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete("stop");
    const newUrl = newSearchParams.toString()
      ? `?${newSearchParams.toString()}`
      : "/";
    router.replace(newUrl, { scroll: false });
  };

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
    <main className="h-dvh w-full bg-black text-white relative">
      {showSplash && (
        <SplashScreen
          onComplete={() => {
            setShowSplash(false);
            // キャッシュを保存（スプラッシュスクリーンを見たことを記録）
            const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const isReload = navigationType?.type === 'reload';

            // 通常の訪問時のみキャッシュを保存（リロード時は保存しない）
            if (!isReload) {
              localStorage.setItem("splashCache", "true");
            }
          }}
        />
      )}
      <div className="h-full flex flex-col">
        {/* 3D表示トグル - デスクトップでは右端、スマホでは非表示（ClientMap/Map3D内で表示） */}
        <div className="hidden md:block absolute top-4 right-4 z-20">
          <div className="bg-white/10 backdrop-blur-xl rounded-lg shadow-lg border border-white/20 p-3 flex items-center gap-2">
            <span className="text-sm text-white">3D</span>
            <button
              onClick={handleMapToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                is3DMode ? "bg-blue-600" : "bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  is3DMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 md:flex-1">
          {is3DMode ? (
            <Map3D
              ref={mapRef3D}
              selectedStop={selectedStop}
              setSelectedStop={handleStopSelect}
              isPanelOpen={isPanelOpen}
              setIsPanelOpen={handlePanelOpen}
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
              onMapToggle={handleMapToggle}
              is3DMode={is3DMode}
            />
          ) : (
            <ClientMap
              ref={mapRef2D}
              selectedStop={selectedStop}
              setSelectedStop={handleStopSelect}
              isPanelOpen={isPanelOpen}
              setIsPanelOpen={handlePanelClose}
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
              onMapToggle={handleMapToggle}
              is3DMode={is3DMode}
            />
          )}
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="h-dvh w-full bg-black text-white flex items-center justify-center">
          <div>Loading...</div>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
