"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

const VANCOUVER: [number, number] = [-123.1207, 49.2827];

export default function ClientMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // ユーザーの位置情報を取得
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation([lng, lat]);
          console.log("User location:", lat, lng);

          // ユーザーの位置にピンアニメーションを追加
          addUserLocationMarker([lng, lat]);
        },
        (error) => {
          console.error("Error getting user location:", error);
          // デフォルトでバンクーバー中心部を使用
          setUserLocation(VANCOUVER);
          addUserLocationMarker(VANCOUVER);
        }
      );
    } else {
      console.log("Geolocation not supported");
      setUserLocation(VANCOUVER);
      addUserLocationMarker(VANCOUVER);
    }
  };

  // ユーザーの位置にピンアニメーションを追加
  const addUserLocationMarker = (location: [number, number]) => {
    if (!mapRef.current) return;

    // 既存のユーザーマーカーを削除
    if (userMarker) {
      userMarker.remove();
    }

    // ピンアニメーション用のHTML要素を作成
    const el = document.createElement("div");
    el.className = "user-location-marker";
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = "#3b82f6";
    el.style.border = "3px solid white";
    el.style.cursor = "pointer";
    el.style.position = "relative";
    el.style.zIndex = "1000";

    // アニメーション用のCSSを追加
    if (!document.getElementById("user-location-styles")) {
      const style = document.createElement("style");
      style.id = "user-location-styles";
      style.textContent = `
        .user-location-marker::before,
        .user-location-marker::after {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border-radius: 50%;
          border: 2px solid #3b82f6;
          animation: ping-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .user-location-marker::after {
          animation-delay: 1s;
        }

        @keyframes ping-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // マーカーを作成して地図に追加
    const marker = new mapboxgl.Marker(el)
      .setLngLat(location)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm text-blue-600">あなたの位置</h3>
              <p class="text-xs text-gray-600">${location[1].toFixed(
                4
              )}, ${location[0].toFixed(4)}</p>
            </div>
          `)
      )
      .addTo(mapRef.current);

    setUserMarker(marker);
  };

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: VANCOUVER,
      zoom: 15,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");
    map.addControl(new mapboxgl.FullscreenControl(), "top-left");
    mapRef.current = map;

    // ユーザーの位置情報を取得
    getUserLocation();

    return () => {
      if (userMarker) {
        userMarker.remove();
      }
      map.remove();
    };
  }, []);

  // ユーザーの位置情報が取得できたら、地図の中心を移動
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: userLocation,
        zoom: 15,
        essential: true,
      });
    }
  }, [userLocation]);

  // GeoJSONデータをクラスタリング表示
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    const addBusStopsLayer = () => {
      // 既存のソースとレイヤーを削除
      if (map.getSource("bus-stops")) {
        map.removeLayer("bus-stops-clusters");
        map.removeLayer("bus-stops-unclustered");
        map.removeLayer("bus-stops-count");
        map.removeSource("bus-stops");
      }

      // 既存のマーカーをクリア
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // GeoJSONデータをソースとして追加
      map.addSource("bus-stops", {
        type: "geojson",
        data: "/data/stops.geojson",
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // クラスター円レイヤー
      map.addLayer({
        id: "bus-stops-clusters",
        type: "circle",
        source: "bus-stops",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            100,
            "#f1f075",
            750,
            "#f28cb1",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            100,
            30,
            750,
            40,
          ],
        },
      });

      // クラスター数表示レイヤー
      map.addLayer({
        id: "bus-stops-count",
        type: "symbol",
        source: "bus-stops",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
      });

      // 個別バス停レイヤー
      map.addLayer({
        id: "bus-stops-unclustered",
        type: "circle",
        source: "bus-stops",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#005DAA",
          "circle-radius": 4,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#fff",
        },
      });

      // クリックイベントの設定
      map.on("click", "bus-stops-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["bus-stops-clusters"],
        });

        if (features.length > 0 && features[0].properties) {
          const clusterId = features[0].properties.cluster_id;
          const source = map.getSource("bus-stops") as mapboxgl.GeoJSONSource;

          if (source && typeof source.getClusterExpansionZoom === "function") {
            source.getClusterExpansionZoom(clusterId, (err: any, zoom: any) => {
              if (err) return;

              const geometry = features[0].geometry as mapboxgl.GeoJSONGeometry;
              if (geometry.type === "Point") {
                map.easeTo({
                  center: geometry.coordinates as [number, number],
                  zoom: zoom,
                });
              }
            });
          }
        }
      });

      // 個別バス停のクリックイベント
      map.on("click", "bus-stops-unclustered", (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const geometry = feature.geometry as mapboxgl.GeoJSONGeometry;

          if (geometry.type === "Point") {
            const coordinates = geometry.coordinates.slice() as [
              number,
              number
            ];
            const properties = feature.properties;

            if (properties) {
              // 選択されたバス停の情報を設定
              setSelectedStop({
                ...properties,
                coordinates: coordinates,
              });
              setIsPanelOpen(true);

              // バス停を画面中央に移動
              map.flyTo({
                center: coordinates,
                zoom: 16,
                essential: true,
              });
            }
          }
        }
      });

      // カーソルスタイルの変更
      map.on("mouseenter", "bus-stops-clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "bus-stops-clusters", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mouseenter", "bus-stops-unclustered", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "bus-stops-unclustered", () => {
        map.getCanvas().style.cursor = "";
      });
    };

    // 地図のスタイルが読み込まれた後にレイヤーを追加
    if (map.isStyleLoaded()) {
      addBusStopsLayer();
    } else {
      map.on("style.load", addBusStopsLayer);
    }
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />

      {/* バス停情報パネル */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded max-w-xs">
        <h3 className="font-semibold text-sm mb-2">バス停クラスタリング</h3>
        <p className="text-xs mb-1">Translinkの全バス停をGeoJSONで表示</p>
        {userLocation && (
          <div className="text-xs text-gray-300 mb-2">
            <p className="font-semibold">あなたの位置:</p>
            <p>緯度: {userLocation[1].toFixed(6)}</p>
            <p>経度: {userLocation[0].toFixed(6)}</p>
          </div>
        )}
        <div className="mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>個別バス停</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
            <span>クラスター（小）</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>クラスター（中）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
            <span>クラスター（大）</span>
          </div>
        </div>
        <p className="text-xs text-gray-300 mt-2">
          ズームアウト: クラスター表示
          <br />
          ズームイン: 個別バス停表示
        </p>
      </div>

      {/* バス停詳細パネル */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">バス停詳細</h2>
            <button
              onClick={() => {
                setIsPanelOpen(false);
                setSelectedStop(null);
              }}
              className="text-white hover:text-gray-200 text-xl"
            >
              ×
            </button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedStop && (
              <div className="space-y-4">
                {/* 基本情報 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {selectedStop.stop_name || "Unknown Stop"}
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium">Stop ID:</span>
                      <span>{selectedStop.stop_id || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Stop Code:</span>
                      <span>{selectedStop.stop_code || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Wheelchair Access:</span>
                      <span>
                        {selectedStop.wheelchair_boarding === 1
                          ? "Yes"
                          : selectedStop.wheelchair_boarding === 2
                          ? "No"
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 位置情報 */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">位置情報</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>緯度:</span>
                      <span>{selectedStop.coordinates[1]?.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>経度:</span>
                      <span>{selectedStop.coordinates[0]?.toFixed(6)}</span>
                    </div>
                  </div>
                </div>

                {/* 遅延状況（デモデータ） */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">遅延状況</h4>
                  <div className="space-y-2">
                    <div className="bg-green-100 border border-green-300 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-green-800 font-medium">
                          現在の状況
                        </span>
                        <span className="text-green-600 text-sm">正常運行</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>最終更新: {new Date().toLocaleTimeString()}</p>
                      <p>予定時刻との差: 0分</p>
                    </div>
                  </div>
                </div>

                {/* 路線情報（デモデータ） */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    利用可能な路線
                  </h4>
                  <div className="space-y-2">
                    <div className="bg-blue-100 border border-blue-300 rounded p-2">
                      <span className="text-blue-800 font-medium">Route 1</span>
                      <span className="text-blue-600 text-sm ml-2">
                        → Downtown
                      </span>
                    </div>
                    <div className="bg-red-100 border border-red-300 rounded p-2">
                      <span className="text-red-800 font-medium">Route 2</span>
                      <span className="text-red-600 text-sm ml-2">
                        → Airport
                      </span>
                    </div>
                    <div className="bg-green-100 border border-green-300 rounded p-2">
                      <span className="text-green-800 font-medium">
                        Route 3
                      </span>
                      <span className="text-green-600 text-sm ml-2">
                        → University
                      </span>
                    </div>
                  </div>
                </div>

                {/* 次のバス情報（デモデータ） */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">次のバス</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="font-medium">Route 1</span>
                      <span className="text-blue-600">3分</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="font-medium">Route 2</span>
                      <span className="text-red-600">7分</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="font-medium">Route 3</span>
                      <span className="text-green-600">12分</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
