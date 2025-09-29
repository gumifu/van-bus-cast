"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import BusStopInfoPanel from "./BusStopInfoPanel";
import RegionSelector from "./RegionSelector";
import BusStopDetailPanel from "./BusStopDetailPanel";
import GoogleMapsSearchBar from "./GoogleMapsSearchBar";
import GoogleMapsControls from "./GoogleMapsControls";
import GoogleMapsLayersPanel from "./GoogleMapsLayersPanel";
import PinnedStopsPanel from "./PinnedStopsPanel";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

const VANCOUVER: [number, number] = [-123.1207, 49.2827];

export default function ClientMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
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

  // Google Maps風の状態管理
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState([
    { id: "bus-stops", name: "Bus Stops", icon: "🚌", enabled: true },
    { id: "traffic", name: "Traffic", icon: "🚦", enabled: false },
    { id: "transit", name: "Transit", icon: "🚇", enabled: true },
    { id: "bicycle", name: "Bike Lanes", icon: "🚴", enabled: false },
  ]);

  // 検索関連の状態
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // ピン留め機能の状態
  const [pinnedStops, setPinnedStops] = useState<Set<string>>(new Set());
  const [pinnedStopsData, setPinnedStopsData] = useState<{
    [key: string]: any;
  }>({});
  const [isPinnedPanelVisible, setIsPinnedPanelVisible] = useState(false);

  // 遅延シンボルを取得
  const getDelaySymbol = (level: number) => {
    const symbols = ["☀️", "🌤️", "☁️", "🌧️", "⛈️"];
    return symbols[level] || "☀️";
  };

  // 遅延レベル名を取得
  const getDelayLevelName = (level: number) => {
    const names = [
      "On Time",
      "1-3 min delay",
      "3-5 min delay",
      "5-10 min delay",
      "10+ min delay",
    ];
    return names[level] || "On Time";
  };

  // 検索状態を管理
  const handleSearchStart = () => {
    setIsSearching(true);
  };

  const handleSearchEnd = () => {
    setIsSearching(false);
  };

  // Google Maps風のコントロール関数
  const handleSearch = async (query: string) => {
    console.log("Search:", query);
    setSearchQuery(query);

    if (!mapRef.current) return;

    try {
      // stops.geojsonファイルからデータを取得
      const response = await fetch("/data/stops.geojson");
      const data = await response.json();

      if (data.features) {
        // 検索クエリに基づいてバス停をフィルタリング
        const filteredStops = data.features.filter((feature: any) => {
          const stopName = feature.properties?.stop_name?.toLowerCase() || "";
          const stopId = feature.properties?.stop_id?.toString() || "";
          const stopCode = feature.properties?.stop_code?.toString() || "";
          const queryLower = query.toLowerCase();

          return (
            stopName.includes(queryLower) ||
            stopId.includes(queryLower) ||
            stopCode.includes(queryLower)
          );
        });

        setSearchResults(filteredStops);

        if (filteredStops.length > 0) {
          // 検索結果の中心を計算
          const coordinates = filteredStops.map(
            (feature: any) => feature.geometry.coordinates
          );
          const avgLng =
            coordinates.reduce(
              (sum: number, coord: number[]) => sum + coord[0],
              0
            ) / coordinates.length;
          const avgLat =
            coordinates.reduce(
              (sum: number, coord: number[]) => sum + coord[1],
              0
            ) / coordinates.length;

          // マップを検索結果の中心に移動
          mapRef.current.flyTo({
            center: [avgLng, avgLat],
            zoom: 16,
            essential: true,
          });

          // 検索結果をハイライト表示
          highlightSearchResults(filteredStops);

          console.log(`Found ${filteredStops.length} bus stops`);
        } else {
          console.log("No search results found");
          // 検索結果がない場合のハイライトをクリア
          clearSearchHighlights();
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  // 検索結果をハイライト表示
  const highlightSearchResults = (stops: any[]) => {
    if (!mapRef.current) return;

    // 既存のハイライトをクリア
    clearSearchHighlights();

    // 検索結果用のソースとレイヤーを追加
    mapRef.current.addSource("search-results", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: stops,
      },
    });

    // 検索結果用のレイヤーを追加
    mapRef.current.addLayer({
      id: "search-results-layer",
      type: "circle",
      source: "search-results",
      paint: {
        "circle-radius": 8,
        "circle-color": "#ff6b6b",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    });

    // 検索結果のクリックイベント
    mapRef.current.on("click", "search-results-layer", (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const properties = feature.properties;

        // 型ガードでPointジオメトリを確認
        if (
          feature.geometry.type === "Point" &&
          "coordinates" in feature.geometry
        ) {
          const coordinates = feature.geometry.coordinates as [number, number];

          // バス停詳細パネルを開く
          setSelectedStop({
            properties: properties,
            geometry: {
              type: "Point",
              coordinates: coordinates,
            },
          });
          setIsPanelOpen(true);
          setSelectedStopId(properties?.stop_id || null);
          setDelayLevel(Math.floor(Math.random() * 5));

          // マップをクリックしたバス停に移動
          mapRef.current?.flyTo({
            center: coordinates,
            zoom: 18,
            essential: true,
          });
        }
      }
    });

    // ホバー効果
    mapRef.current.on("mouseenter", "search-results-layer", () => {
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = "pointer";
      }
    });

    mapRef.current.on("mouseleave", "search-results-layer", () => {
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = "";
      }
    });
  };

  // 検索ハイライトをクリア
  const clearSearchHighlights = () => {
    if (!mapRef.current) return;

    if (mapRef.current.getLayer("search-results-layer")) {
      mapRef.current.removeLayer("search-results-layer");
    }
    if (mapRef.current.getSource("search-results")) {
      mapRef.current.removeSource("search-results");
    }
  };

  // 検索結果をクリア
  const clearSearchResults = () => {
    setSearchQuery("");
    setSearchResults([]);
    clearSearchHighlights();
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.zoomTo(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.zoomTo(currentZoom - 1);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMyLocation = () => {
    getUserLocation();
  };

  const handleLayerToggle = () => {
    setShowLayers(!showLayers);
  };

  const handleLayerChange = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
      )
    );
  };

  const handleStreetView = () => {
    console.log("Street View");
    // ストリートビュー機能の実装（必要に応じて）
  };

  // ローカルストレージからピンデータを読み込み
  const loadPinnedStops = () => {
    try {
      console.log("=== ローカルストレージの状況確認 ===");

      // 全てのローカルストレージキーを確認
      console.log("全てのローカルストレージキー:");
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          console.log(key + ":", localStorage.getItem(key));
        }
      }

      const savedPins = localStorage.getItem("pinnedBusStops");
      if (savedPins) {
        const pinsData = JSON.parse(savedPins);
        console.log("ピン留めデータが存在します:", pinsData);

        const pinnedSet = new Set<string>(pinsData.stopIds);
        console.log("ピン留めされたバス停ID:", Array.from(pinnedSet));

        // データ構造を修正：stopsDataをオブジェクト形式に変換
        const pinnedDataMap: { [key: string]: any } = {};
        if (pinsData.stopsData && Array.isArray(pinsData.stopsData)) {
          pinsData.stopsData.forEach((stopData: any) => {
            if (stopData.stopId) {
              pinnedDataMap[stopData.stopId] = stopData;
            }
          });
        }

        console.log("処理後のピンデータマップ:", pinnedDataMap);
        setPinnedStops(pinnedSet);
        setPinnedStopsData(pinnedDataMap);

        // ピンマーカーを復元（遅延実行）
        setTimeout(() => {
          console.log("ピンマーカーを復元中...");
          Object.values(pinnedDataMap).forEach((stopData: any) => {
            addPinnedMarker(stopData.stopId, stopData);
          });
        }, 1500);
      } else {
        console.log("ピン留めデータが見つかりません");
      }
    } catch (error) {
      console.error("Error loading pinned stops:", error);
    }
  };

  // ローカルストレージにピンデータを保存
  const savePinnedStops = (
    newPinnedStops: Set<string>,
    newPinnedStopsData: { [key: string]: any }
  ) => {
    try {
      const pinsData = {
        stopIds: Array.from(newPinnedStops),
        stopsData: Object.entries(newPinnedStopsData).map(
          ([stopId, stopData]) => ({
            stopId,
            ...stopData,
          })
        ),
      };
      localStorage.setItem("pinnedBusStops", JSON.stringify(pinsData));
    } catch (error) {
      console.error("Error saving pinned stops:", error);
    }
  };

  // ピン留め機能
  const togglePinStop = (stopId: string, stopData: any) => {
    if (!mapRef.current) return;

    const newPinnedStops = new Set(pinnedStops);
    const newPinnedStopsData = { ...pinnedStopsData };

    if (pinnedStops.has(stopId)) {
      // ピンを外す
      newPinnedStops.delete(stopId);
      delete newPinnedStopsData[stopId];
      removePinnedMarker(stopId);
    } else {
      // ピンを留める
      newPinnedStops.add(stopId);
      newPinnedStopsData[stopId] = stopData;
      addPinnedMarker(stopId, stopData);
    }

    setPinnedStops(newPinnedStops);
    setPinnedStopsData(newPinnedStopsData);

    // ローカルストレージに保存
    savePinnedStops(newPinnedStops, newPinnedStopsData);
  };

  // ピン留めパネル用のハンドラー
  const handlePinnedStopClick = (stopData: any) => {
    if (!mapRef.current) return;

    console.log("handlePinnedStopClick - stopData:", stopData);

    // データ構造を確認して適切にアクセス
    const coordinates = stopData.geometry?.coordinates || stopData.coordinates;
    const properties = stopData.properties || stopData;

    if (!coordinates) {
      console.error("No coordinates found in stopData:", stopData);
      // ピン留めデータから直接取得を試行
      const stopId = stopData.stopId;
      if (stopId && pinnedStopsData[stopId]) {
        const savedData = pinnedStopsData[stopId];
        console.log("Trying to get data from pinnedStopsData:", savedData);
        const savedCoordinates =
          savedData.geometry?.coordinates || savedData.coordinates;
        const savedProperties = savedData.properties || savedData;

        if (savedCoordinates) {
          setSelectedStop({
            properties: savedProperties,
            geometry: {
              type: "Point",
              coordinates: savedCoordinates,
            },
          });
          setIsPanelOpen(true);
          setSelectedStopId(savedProperties?.stop_id || null);
          setDelayLevel(Math.floor(Math.random() * 5));

          mapRef.current.flyTo({
            center: savedCoordinates,
            zoom: 18,
            essential: true,
          });
          return;
        }
      }
      return;
    }

    // バス停詳細パネルを開く
    setSelectedStop({
      properties: properties,
      geometry: {
        type: "Point",
        coordinates: coordinates,
      },
    });
    setIsPanelOpen(true);
    setSelectedStopId(properties?.stop_id || null);
    setDelayLevel(Math.floor(Math.random() * 5));

    // マップをクリックしたバス停に移動
    mapRef.current.flyTo({
      center: coordinates,
      zoom: 18,
      essential: true,
    });
  };

  const handleRemovePin = (stopId: string) => {
    if (!mapRef.current) return;

    const newPinnedStops = new Set(pinnedStops);
    const newPinnedStopsData = { ...pinnedStopsData };

    newPinnedStops.delete(stopId);
    delete newPinnedStopsData[stopId];
    removePinnedMarker(stopId);

    setPinnedStops(newPinnedStops);
    setPinnedStopsData(newPinnedStopsData);

    // ローカルストレージに保存
    savePinnedStops(newPinnedStops, newPinnedStopsData);
  };

  const addPinnedMarker = (stopId: string, stopData: any) => {
    if (!mapRef.current) {
      console.error("Map not available for pinned marker");
      return;
    }

    console.log("Adding pinned marker for stop:", stopId, stopData);

    // ピンアイコンを追加
    addPinIcon();

    const coordinates = stopData.geometry.coordinates;

    // ピン留めマーカーのGeoJSONデータを作成
    const pinnedMarkerGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: coordinates,
          },
          properties: {
            id: `pinned-${stopId}`,
            stopId: stopId,
            stopName: stopData.properties?.stop_name || "Unknown Stop",
            stopCode: stopData.properties?.stop_id || "N/A",
          },
        },
      ],
    };

    // ピン留めマーカーのソースを追加
    mapRef.current.addSource(`pinned-${stopId}`, {
      type: "geojson",
      data: pinnedMarkerGeoJSON,
    });

    // ピン留めマーカーのレイヤーを追加（📍アイコン）
    // ピンアイコンが読み込まれるまで待機
    const addPinnedLayer = () => {
      if (mapRef.current?.hasImage("pin-icon")) {
        mapRef.current.addLayer({
          id: `pinned-${stopId}`,
          type: "symbol",
          source: `pinned-${stopId}`,
          layout: {
            "icon-image": "pin-icon",
            "icon-size": {
              base: 1.75,
              stops: [
                [12, 0.8],
                [22, 1.5],
              ],
            },
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-anchor": "bottom",
          },
          paint: {
            "icon-opacity": 0.9,
          },
        });
        console.log(`Pinned marker added for stop ${stopId} at:`, coordinates);
      } else {
        // ピンアイコンがまだ読み込まれていない場合は少し待って再試行
        setTimeout(addPinnedLayer, 100);
      }
    };

    addPinnedLayer();

    // クリックイベントを追加
    mapRef.current.on("click", `pinned-${stopId}`, (e) => {
      if (e.features && e.features.length > 0 && mapRef.current) {
        new mapboxgl.Popup({ offset: 25 })
          .setLngLat(coordinates)
          .setHTML(
            `
            <div class="p-2 bg-gray-900 text-white rounded shadow-lg">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-gray-400">📍</span>
                <h3 class="font-semibold text-sm text-white">Pinned Stop</h3>
              </div>
              <p class="text-xs text-gray-300 mb-1">${
                stopData.properties?.stop_name || "Unknown Stop"
              }</p>
              <p class="text-xs text-gray-400">ID: ${
                stopData.properties?.stop_id || "N/A"
              }</p>
            </div>
          `
          )
          .addTo(mapRef.current);
      }
    });

    // ホバー効果
    mapRef.current.on("mouseenter", `pinned-${stopId}`, () => {
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = "pointer";
      }
    });

    mapRef.current.on("mouseleave", `pinned-${stopId}`, () => {
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = "";
      }
    });
  };

  const removePinnedMarker = (stopId: string) => {
    if (!mapRef.current) return;

    // ピン留めマーカーのレイヤーとソースを削除
    if (mapRef.current.getLayer(`pinned-${stopId}`)) {
      mapRef.current.removeLayer(`pinned-${stopId}`);
    }
    if (mapRef.current.getSource(`pinned-${stopId}`)) {
      mapRef.current.removeSource(`pinned-${stopId}`);
    }
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
      name: "Vancouver",
      center: [-123.1207, 49.2827],
      zoom: 11,
    },
    {
      id: "downtown",
      name: "Downtown",
      center: [-123.1158, 49.2778],
      zoom: 14,
    },
    {
      id: "richmond",
      name: "Richmond",
      center: [-123.1338, 49.1666],
      zoom: 12,
    },
    {
      id: "burnaby",
      name: "Burnaby",
      center: [-122.9749, 49.2488],
      zoom: 12,
    },
    { id: "surrey", name: "Surrey", center: [-122.849, 49.1913], zoom: 12 },
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

          // 現在地マーカーを追加（スタイル読み込みを待たない）
          setTimeout(() => {
            addUserLocationMarker([lng, lat]);
          }, 1000);
        },
        (error) => {
          console.error("Error getting user location:", error);
          // デフォルトでバンクーバー中心部を使用
          setUserLocation(VANCOUVER);
          setTimeout(() => {
            addUserLocationMarker(VANCOUVER);
          }, 1000);
        }
      );
    } else {
      console.log("Geolocation not supported");
      setUserLocation(VANCOUVER);
      setTimeout(() => {
        addUserLocationMarker(VANCOUVER);
      }, 1000);
    }
  };

  // ピンアイコンをマップに追加
  const addPinIcon = () => {
    if (!mapRef.current) {
      console.error("Map not available for pin icon");
      return;
    }

    // ピンアイコンが既に追加されているかチェック
    if (mapRef.current.hasImage("pin-icon")) {
      console.log("Pin icon already exists");
      return;
    }

    console.log("Creating pin icon...");

    // Canvasでピンアイコンを作成
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context");
      return;
    }

    canvas.width = 24;
    canvas.height = 24;

    // ピンの形状を描画
    ctx.fillStyle = "#ef4444"; // 赤色
    ctx.beginPath();
    ctx.arc(12, 8, 6, 0, 2 * Math.PI); // 上部の円
    ctx.fill();

    // ピンの下部（三角形）
    ctx.beginPath();
    ctx.moveTo(12, 14);
    ctx.lineTo(8, 22);
    ctx.lineTo(16, 22);
    ctx.closePath();
    ctx.fill();

    // 白い中心点
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(12, 8, 2, 0, 2 * Math.PI);
    ctx.fill();

    // CanvasをImageDataに変換して追加
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    mapRef.current.addImage("pin-icon", imageData);
    console.log("Pin icon added successfully");
  };

  // ユーザーの位置をMapboxレイヤーとして追加
  const addUserLocationMarker = (location: [number, number]) => {
    if (!mapRef.current) {
      console.error("Map not available");
      return;
    }

    console.log("Adding user location marker at:", location);

    // ピンアイコンを追加
    addPinIcon();

    // 既存のユーザー位置ソースとレイヤーを削除
    if (mapRef.current.getSource("user-location")) {
      if (mapRef.current.getLayer("user-location-pulse")) {
        mapRef.current.removeLayer("user-location-pulse");
      }
      if (mapRef.current.getLayer("user-location-center")) {
        mapRef.current.removeLayer("user-location-center");
      }
      mapRef.current.removeSource("user-location");
    }

    // ユーザー位置のGeoJSONデータを作成
    const userLocationGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: location,
          },
          properties: {
            id: "user-location",
          },
        },
      ],
    };

    // ユーザー位置のソースを追加
    mapRef.current.addSource("user-location", {
      type: "geojson",
      data: userLocationGeoJSON,
    });

    // アニメーション用のCSSを追加
    if (!document.getElementById("user-location-styles")) {
      const style = document.createElement("style");
      style.id = "user-location-styles";
      style.textContent = `
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

    // パルス効果の円レイヤー
    mapRef.current.addLayer({
      id: "user-location-pulse",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": {
          base: 1.75,
          stops: [
            [12, 20],
            [22, 180],
          ],
        },
        "circle-color": "#3b82f6",
        "circle-opacity": 0.2,
        "circle-stroke-width": 0,
      },
    });

    // 中心の円レイヤー
    mapRef.current.addLayer({
      id: "user-location-center",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": {
          base: 1.75,
          stops: [
            [12, 8],
            [22, 24],
          ],
        },
        "circle-color": "#3b82f6",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    });

    console.log("User location marker added at:", location);

    // クリックイベントを追加
    mapRef.current.on("click", "user-location-center", (e) => {
      if (e.features && e.features.length > 0 && mapRef.current) {
        new mapboxgl.Popup({ offset: 25 })
          .setLngLat(location)
          .setHTML(
            `
            <div class="p-2">
              <h3 class="font-semibold text-sm text-blue-600">あなたの位置</h3>
              <p class="text-xs text-gray-600">${location[1].toFixed(
                4
              )}, ${location[0].toFixed(4)}</p>
            </div>
          `
          )
          .addTo(mapRef.current);
      }
    });

    // ホバー効果
    mapRef.current.on("mouseenter", "user-location-center", () => {
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = "pointer";
      }
    });

    mapRef.current.on("mouseleave", "user-location-center", () => {
      if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = "";
      }
    });
  };

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: VANCOUVER,
      zoom: 15,
    });

    // Mapboxのデフォルトコントロールは削除（Google Maps風のカスタムコントロールを使用）
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

    // ピンデータを読み込み
    loadPinnedStops();

    return () => {
      window.removeEventListener("resize", resizeMap);
      // ユーザー位置レイヤーをクリーンアップ
      if (map.getSource("user-location")) {
        if (map.getLayer("user-location-pulse")) {
          map.removeLayer("user-location-pulse");
        }
        if (map.getLayer("user-location-center")) {
          map.removeLayer("user-location-center");
        }
        map.removeSource("user-location");
      }
      // ピン留めマーカーのレイヤーをクリーンアップ
      Object.keys(pinnedStopsData).forEach((stopId) => {
        if (map.getLayer(`pinned-${stopId}`)) {
          map.removeLayer(`pinned-${stopId}`);
        }
        if (map.getSource(`pinned-${stopId}`)) {
          map.removeSource(`pinned-${stopId}`);
        }
      });
      map.remove();
    };
  }, []);

  // ユーザーの位置情報が取得できたら、地図の中心を移動（初回のみ）
  useEffect(() => {
    if (userLocation && mapRef.current) {
      // 現在のズームレベルがデフォルト（15）の場合のみ移動
      const currentZoom = mapRef.current.getZoom();
      if (Math.abs(currentZoom - 15) < 0.1) {
        mapRef.current.flyTo({
          center: userLocation,
          zoom: 15,
          essential: true,
        });
      }
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
      {/* 左側のコントロールパネル */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        {/* 検索バー */}
        <div className="w-80">
          <GoogleMapsSearchBar
            onSearch={handleSearch}
            onSearchStart={handleSearchStart}
            onSearchEnd={handleSearchEnd}
            placeholder="Search places (e.g., Downtown, Richmond)"
          />
        </div>

        {/* 地域選択パネル */}
        {!isSearching && (
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-3 w-80 transition-all duration-300">
            <h3 className="font-semibold text-sm text-white mb-2">Region</h3>
            <div className="space-y-1">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => {
                    setSelectedRegion(region.id);
                    if (mapRef.current) {
                      const regionData = regions.find(
                        (r) => r.id === region.id
                      );
                      if (regionData) {
                        mapRef.current.flyTo({
                          center: regionData.center,
                          zoom: regionData.zoom,
                          essential: true,
                        });
                      }
                    }
                  }}
                  className={`w-full text-left p-2 rounded text-xs transition-colors ${
                    selectedRegion === region.id
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results Panel */}
        {searchResults.length > 0 && (
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-3 w-80">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-sm text-white">
                Search Results: "{searchQuery}"
              </h3>
              <button
                onClick={clearSearchResults}
                className="text-gray-400 hover:text-gray-200 text-lg ml-2"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-300 mb-3">
              Found {searchResults.length} bus stops
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searchResults.slice(0, 10).map((stop, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const coordinates = stop.geometry.coordinates;
                    mapRef.current?.flyTo({
                      center: coordinates,
                      zoom: 18,
                      essential: true,
                    });
                    setSelectedStop({
                      properties: stop.properties,
                      geometry: stop.geometry,
                    });
                    setIsPanelOpen(true);
                    setSelectedStopId(stop.properties.stop_id);
                    setDelayLevel(Math.floor(Math.random() * 5));
                  }}
                  className="w-full text-left p-2 rounded text-xs transition-colors hover:bg-gray-800 text-gray-300"
                >
                  <div className="font-medium text-white">
                    {stop.properties.stop_name || "Unknown Stop"}
                  </div>
                  <div className="text-gray-400">
                    ID: {stop.properties.stop_id} | Code:{" "}
                    {stop.properties.stop_code}
                  </div>
                </button>
              ))}
              {searchResults.length > 10 && (
                <div className="text-xs text-gray-400 text-center pt-2">
                  ...and {searchResults.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bus Stop Info Panel */}
        {isInfoPanelVisible && searchResults.length === 0 && !isSearching && (
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 p-3 w-80 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-sm text-white">
                Bus Stop Info
              </h3>
              <button
                onClick={() => setIsInfoPanelVisible(false)}
                className="text-gray-400 hover:text-gray-200 text-lg ml-2"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-300 mb-2">
              Displaying all Translink bus stops
            </p>
            {userLocation && (
              <div className="text-xs text-gray-400">
                <p>
                  Current location: {userLocation[1].toFixed(4)},{" "}
                  {userLocation[0].toFixed(4)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Map */}
      <div
        ref={ref}
        className={`w-full min-h-0 flex-shrink-0 ${
          isPanelOpen ? "h-2/3 md:h-full" : "h-full"
        }`}
      />

      {/* Google Maps-style Controls */}
      <GoogleMapsControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFullscreen={handleFullscreen}
        onMyLocation={handleMyLocation}
        onLayerToggle={handleLayerToggle}
        onStreetView={handleStreetView}
        isFullscreen={isFullscreen}
        showLayers={showLayers}
      />

      {/* Google Maps-style Layers Panel */}
      <GoogleMapsLayersPanel
        isVisible={showLayers}
        onClose={() => setShowLayers(false)}
        layers={layers}
        onLayerToggle={handleLayerChange}
      />

      {/* Bus Stop Detail Panel */}
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
        pinnedStops={pinnedStops}
        onTogglePin={togglePinStop}
      />

      {/* Pinned Stops Panel */}
      <PinnedStopsPanel
        pinnedStops={pinnedStops}
        pinnedStopsData={pinnedStopsData}
        onStopClick={handlePinnedStopClick}
        onRemovePin={handleRemovePin}
        isVisible={isPinnedPanelVisible}
        onToggleVisibility={() =>
          setIsPinnedPanelVisible(!isPinnedPanelVisible)
        }
      />
    </div>
  );
}
