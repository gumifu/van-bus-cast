"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import BusStopInfoPanel from "./BusStopInfoPanel";
import RegionSelector from "./RegionSelector";
import BusStopDetailPanel from "./BusStopDetailPanel";

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
  const [selectedStop, setSelectedStop] = useState<{
    properties: any;
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
  } | null>(null);
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
  const regions: Array<{
    id: string;
    name: string;
    center: [number, number];
    zoom: number;
  }> = [
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

              const geometry = features[0].geometry as {
                type: "Point";
                coordinates: [number, number];
              };
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
          const geometry = feature.geometry as {
            type: "Point";
            coordinates: [number, number];
          };

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

      {/* バス停情報パネル */}
      <BusStopInfoPanel
        isVisible={isInfoPanelVisible}
        onClose={() => setIsInfoPanelVisible(false)}
        userLocation={userLocation}
      />

      {/* 地域選択パネル */}
      <RegionSelector
        regions={regions}
        selectedRegion={selectedRegion}
        onRegionSelect={(regionId) => {
          setSelectedRegion(regionId);
          if (mapRef.current) {
            const region = regions.find((r) => r.id === regionId);
            if (region) {
              mapRef.current.flyTo({
                center: region.center,
                zoom: region.zoom,
                essential: true,
              });
            }
          }
        }}
        isPanelOpen={isPanelOpen}
      />

      {/* バス停詳細パネル */}
      <BusStopDetailPanel
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedStop(null);
          setSelectedStopId(null);
        }}
        selectedStop={selectedStop}
        delayLevel={delayLevel}
        regions={regions}
        selectedRegion={selectedRegion}
        onRegionSelect={(regionId) => {
          setSelectedRegion(regionId);
          if (mapRef.current) {
            const region = regions.find((r) => r.id === regionId);
            if (region) {
              mapRef.current.flyTo({
                center: region.center,
                zoom: region.zoom,
                essential: true,
              });
            }
          }
        }}
        getDelaySymbol={getDelaySymbol}
        getDelayLevelName={getDelayLevelName}
      />
    </div>
  );
}
