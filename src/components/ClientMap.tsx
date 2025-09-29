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
  const [selectedRegion, setSelectedRegion] = useState<string>("vancouver");
  const [delayLevel, setDelayLevel] = useState<number>(0); // 0-4の遅延レベル
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(true);

  // 遅延シンボルを取得
  const getDelaySymbol = (level: number) => {
    const symbols = ["☀️", "🌤️", "☁️", "🌧️", "⛈️"];
    return symbols[level] || "☀️";
  };

  // 遅延レベル名を取得
  const getDelayLevelName = (level: number) => {
    const names = [
      "定時運行",
      "1-3分遅延",
      "3-5分遅延",
      "5-10分遅延",
      "10分以上遅延",
    ];
    return names[level] || "定時運行";
  };

  // 地域データ
  const regions = [
    {
      id: "vancouver",
      name: "バンクーバー全域",
      center: [-123.1207, 49.2827],
      zoom: 11,
    },
    {
      id: "downtown",
      name: "ダウンタウン",
      center: [-123.1158, 49.2778],
      zoom: 14,
    },
    {
      id: "richmond",
      name: "リッチモンド",
      center: [-123.1338, 49.1666],
      zoom: 12,
    },
    {
      id: "burnaby",
      name: "バーナビー",
      center: [-122.9749, 49.2488],
      zoom: 12,
    },
    { id: "surrey", name: "サレー", center: [-122.849, 49.1913], zoom: 12 },
  ];

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

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .selected-bus-stop {
          animation: pulse 2s ease-in-out infinite;
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

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.addControl(new mapboxgl.FullscreenControl(), "bottom-right");
    mapRef.current = map;

    // マップの高さを明示的に設定
    const resizeMap = () => {
      if (map) {
        map.resize();
      }
    };

    // リサイズイベントを追加
    window.addEventListener("resize", resizeMap);

    // マップが読み込まれた後にリサイズ
    map.on("load", () => {
      setTimeout(resizeMap, 100);
    });

    // ユーザーの位置情報を取得
    getUserLocation();

    return () => {
      window.removeEventListener("resize", resizeMap);
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
        map.removeLayer("bus-stops-unclustered-bg");
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

      // 個別バス停レイヤー（ホバー効果用の背景）
      map.addLayer({
        id: "bus-stops-unclustered-bg",
        type: "circle",
        source: "bus-stops",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "rgba(255, 255, 255, 0.2)",
          "circle-radius": 7,
        },
      });

      // 個別バス停レイヤー（メイン）
      map.addLayer({
        id: "bus-stops-unclustered",
        type: "circle",
        source: "bus-stops",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "stop_id"], selectedStopId || ""],
            "#ef4444", // 赤色（選択されたバス停）
            "#3b82f6", // 青色（通常のバス停）
          ],
          "circle-radius": 4,
          "circle-stroke-width": 2,
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
        // イベントの伝播を停止
        e.preventDefault();

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
                properties: properties,
                geometry: {
                  type: "Point",
                  coordinates: coordinates,
                },
              });
              setSelectedStopId(properties.stop_id);
              setIsPanelOpen(true);

              // バス停を画面中央に移動
              map.flyTo({
                center: coordinates,
                zoom: 16,
                essential: true,
              });

              // ランダムな遅延レベルを設定（デモ用）
              setDelayLevel(Math.floor(Math.random() * 5));
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
        // ホバー時に背景を表示
        map.setPaintProperty(
          "bus-stops-unclustered-bg",
          "circle-color",
          "rgba(255, 255, 255, 0.3)"
        );
      });

      map.on("mouseleave", "bus-stops-unclustered", () => {
        map.getCanvas().style.cursor = "";
        // ホバー終了時に背景を非表示
        map.setPaintProperty(
          "bus-stops-unclustered-bg",
          "circle-color",
          "rgba(255, 255, 255, 0.0)"
        );
      });
    };

    // 地図のスタイルが読み込まれた後にレイヤーを追加
    if (map.isStyleLoaded()) {
      addBusStopsLayer();
    } else {
      map.on("style.load", addBusStopsLayer);
    }
  }, []);

  // 選択されたバス停IDが変更された時にレイヤーを更新
  useEffect(() => {
    if (mapRef.current && mapRef.current.getLayer("bus-stops-unclustered")) {
      mapRef.current.setPaintProperty("bus-stops-unclustered", "circle-color", [
        "case",
        ["==", ["get", "stop_id"], selectedStopId || ""],
        "#ef4444", // 赤色（選択されたバス停）
        "#3b82f6", // 青色（通常のバス停）
      ]);
    }
  }, [selectedStopId]);

  return (
    <div className="relative h-full w-full flex flex-col md:block">
      <div ref={ref} className="h-2/3 w-full min-h-0 md:h-full flex-shrink-0" />

      {/* バス停情報パネル - デスクトップ版 */}
      {isInfoPanelVisible && (
        <div className="hidden md:block absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded max-w-xs">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-sm">バス停クラスタリング</h3>
            <button
              onClick={() => setIsInfoPanelVisible(false)}
              className="text-gray-400 hover:text-white text-lg ml-2"
            >
              ×
            </button>
          </div>
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
      )}

      {/* バス停情報パネル - スマホ版（下部1/3） */}
      <div className="md:hidden h-1/3 bg-gray-900 text-white p-4 overflow-y-auto flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">バス停情報</h3>
          <button
            onClick={() => setIsInfoPanelVisible(false)}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">クラスタリング説明</h4>
            <p className="text-xs text-gray-300 mb-3">
              Translinkの全バス停をGeoJSONで表示
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>個別バス停</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                <span>クラスター（小）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span>クラスター（中）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                <span>クラスター（大）</span>
              </div>
            </div>
          </div>

          {userLocation && (
            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-2">あなたの位置</h4>
              <div className="text-xs text-gray-300">
                <p>緯度: {userLocation[1].toFixed(6)}</p>
                <p>経度: {userLocation[0].toFixed(6)}</p>
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">操作方法</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <p>• ズームアウト: クラスター表示</p>
              <p>• ズームイン: 個別バス停表示</p>
              <p>• バス停をタップ: 詳細情報表示</p>
            </div>
          </div>
        </div>
      </div>

      {/* 地域選択パネル */}
      <div
        className={`absolute top-4 bg-black bg-opacity-75 text-white p-3 rounded max-w-3xs transition-all duration-300 ease-in-out ${
          isPanelOpen ? "right-88" : "right-4"
        }`}
      >
        <h3 className="font-semibold text-sm mb-3">地域表示</h3>
        <div className="space-y-2">
          {regions.map((region) => (
            <button
              key={region.id}
              onClick={() => {
                setSelectedRegion(region.id);
                if (mapRef.current) {
                  mapRef.current.flyTo({
                    center: region.center,
                    zoom: region.zoom,
                    essential: true,
                  });
                }
              }}
              className={`w-full text-left p-2 rounded text-xs transition-colors ${
                selectedRegion === region.id
                  ? "bg-gray-700 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>
      </div>

      {/* バス停詳細パネル - デスクトップ版（右から） */}
      <div
        className={`hidden md:block fixed top-0 right-0 h-full w-80 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">バス停詳細</h2>
            <button
              onClick={() => {
                setIsPanelOpen(false);
                setSelectedStop(null);
                setSelectedStopId(null);
              }}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedStop &&
              selectedStop.properties &&
              selectedStop.geometry && (
                <div className="space-y-6">
                  {/* 基本情報 */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {selectedStop.properties.stop_name || "Unknown Stop"}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex justify-between">
                        <span className="font-medium">Stop ID:</span>
                        <span className="text-gray-400">
                          {selectedStop.properties.stop_id || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Stop Code:</span>
                        <span className="text-gray-400">
                          {selectedStop.properties.stop_code || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Wheelchair Access:</span>
                        <span className="text-gray-400">
                          {selectedStop.properties.wheelchair_boarding === 1
                            ? "Yes"
                            : selectedStop.properties.wheelchair_boarding === 2
                            ? "No"
                            : "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 位置情報 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">位置情報</h4>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>緯度:</span>
                        <span>
                          {selectedStop.geometry.coordinates?.[1]?.toFixed(6) ||
                            "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>経度:</span>
                        <span>
                          {selectedStop.geometry.coordinates?.[0]?.toFixed(6) ||
                            "不明"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 遅延状況 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">遅延状況</h4>
                    <div className="space-y-3">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">
                            現在の状況
                          </span>
                          <span className="text-2xl">
                            {getDelaySymbol(delayLevel)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300">
                          <p>{getDelayLevelName(delayLevel)}</p>
                          <p className="text-gray-400">
                            最終更新: {new Date().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6時間予報 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">6時間予報</h4>
                    <div className="space-y-2">
                      {Array.from({ length: 6 }, (_, i) => {
                        const hour = new Date();
                        hour.setHours(hour.getHours() + i + 1);
                        const randomDelay = Math.floor(Math.random() * 5);
                        return (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-gray-800 p-3 rounded"
                          >
                            <span className="text-gray-300">
                              {hour.getHours()}:00
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {getDelaySymbol(randomDelay)}
                              </span>
                              <span className="text-sm text-gray-400">
                                {getDelayLevelName(randomDelay)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 地域表示 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">地域表示</h4>
                    <div className="space-y-2">
                      {regions.map((region) => (
                        <button
                          key={region.id}
                          onClick={() => {
                            setSelectedRegion(region.id);
                            if (mapRef.current) {
                              mapRef.current.flyTo({
                                center: region.center,
                                zoom: region.zoom,
                                essential: true,
                              });
                            }
                          }}
                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                            selectedRegion === region.id
                              ? "bg-gray-700 text-white"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {region.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* アラート */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">アラート</h4>
                    <div className="space-y-2">
                      <div className="bg-yellow-900 border border-yellow-700 rounded p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">⚠️</span>
                          <span className="text-yellow-200 text-sm">
                            2時間後に遅延のピークが予想されます
                          </span>
                        </div>
                      </div>
                      <div className="bg-red-900 border border-red-700 rounded p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">🚨</span>
                          <span className="text-red-200 text-sm">
                            Route 2で重大な遅延が発生中
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* バス停詳細パネル - モバイル版（下から） */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isPanelOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="h-96 flex flex-col">
          {/* ヘッダー */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">バス停詳細</h2>
            <button
              onClick={() => {
                setIsPanelOpen(false);
                setSelectedStop(null);
                setSelectedStopId(null);
              }}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedStop &&
              selectedStop.properties &&
              selectedStop.geometry && (
                <div className="space-y-4">
                  {/* 基本情報 */}
                  <div>
                    <h3 className="font-semibold text-white mb-2">基本情報</h3>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>バス停名:</span>
                        <span className="text-white">
                          {selectedStop.properties.stop_name || "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>バス停ID:</span>
                        <span className="text-white">
                          {selectedStop.properties.stop_id || "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>バス停コード:</span>
                        <span className="text-white">
                          {selectedStop.properties.stop_code || "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>車椅子対応:</span>
                        <span className="text-white">
                          {selectedStop.properties.wheelchair_boarding === 1
                            ? "対応"
                            : "非対応"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 位置情報 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">位置情報</h4>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>緯度:</span>
                        <span className="text-white">
                          {selectedStop.geometry.coordinates?.[1]?.toFixed(6) ||
                            "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>経度:</span>
                        <span className="text-white">
                          {selectedStop.geometry.coordinates?.[0]?.toFixed(6) ||
                            "不明"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 遅延状況 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">遅延状況</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {getDelaySymbol(delayLevel)}
                      </span>
                      <span className="text-white">
                        {getDelayLevelName(delayLevel)}
                      </span>
                    </div>
                  </div>

                  {/* 6時間予報 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">6時間予報</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {Array.from({ length: 6 }, (_, i) => {
                        const hour = new Date().getHours() + i;
                        const randomDelay = Math.floor(Math.random() * 5);
                        return (
                          <div key={i} className="text-center">
                            <div className="text-gray-400">{hour % 24}時</div>
                            <div className="text-lg">
                              {getDelaySymbol(randomDelay)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getDelayLevelName(randomDelay)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 地域表示 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">地域表示</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {regions.map((region) => (
                        <button
                          key={region.id}
                          onClick={() => {
                            setSelectedRegion(region.id);
                            if (mapRef.current) {
                              mapRef.current.flyTo({
                                center: region.center,
                                zoom: region.zoom,
                                essential: true,
                              });
                            }
                          }}
                          className={`p-2 rounded text-xs transition-colors ${
                            selectedRegion === region.id
                              ? "bg-gray-700 text-white"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {region.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* アラート */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">アラート</h4>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="bg-red-900 bg-opacity-30 p-2 rounded">
                        <span className="text-red-400">⚠️</span>{" "}
                        2時間後に遅延のピークが予想されます
                      </div>
                      <div className="bg-yellow-900 bg-opacity-30 p-2 rounded">
                        <span className="text-yellow-400">ℹ️</span>{" "}
                        工事の影響で一部路線が迂回運行中
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
