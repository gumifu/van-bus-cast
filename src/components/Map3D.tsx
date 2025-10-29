"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import RegionSelector from "./RegionSelector";
import BusStopDetailPanel from "./BusStopDetailPanel";
import GoogleMapsSearchBar from "./GoogleMapsSearchBar";
import GoogleMapsControls from "./GoogleMapsControls";
import GoogleMapsLayersPanel from "./GoogleMapsLayersPanel";
import PinnedStopsPanel from "./PinnedStopsPanel";

const VANCOUVER: [number, number] = [-123.1207, 49.2827];

interface Map3DProps {
  onMapReady?: (map: Map) => void;
}

export default function Map3D({ onMapReady }: Map3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [is3DEnabled, setIs3DEnabled] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);

  // 2Dと同じ状態変数を追加
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
  const [regionDelays, setRegionDelays] = useState<{ [key: string]: number }>(
    {}
  );
  const [stopDelays, setStopDelays] = useState<{ [key: string]: number }>({});
  const [routeDelays, setRouteDelays] = useState<{ [key: string]: number }>({});
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState([
    { id: "traffic", name: "Traffic", enabled: true },
    { id: "transit", name: "Transit", enabled: true },
    { id: "bicycle", name: "Bicycle", enabled: false },
  ]);
  const [isSearching, setIsSearching] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [pinnedStops, setPinnedStops] = useState<Set<string>>(new Set());
  const [pinnedStopsData, setPinnedStopsData] = useState<{
    [key: string]: any;
  }>({});

  // 地域名を整形するヘルパー関数
  const formatRegionName = (regionId: string): string => {
    const nameMap: { [key: string]: string } = {
      vancouver: "Vancouver",
      north_vancouver: "North Vancouver",
      west_vancouver: "West Vancouver",
      burnaby: "Burnaby",
      richmond: "Richmond",
      surrey: "Surrey",
      coquitlam: "Coquitlam",
      delta: "Delta",
      langley: "Langley",
      new_westminster: "New Westminster",
      port_coquitlam: "Port Coquitlam",
      port_moody: "Port Moody",
      maple_ridge: "Maple Ridge",
      pitt_meadows: "Pitt Meadows",
      white_rock: "White Rock",
      lions_bay: "Lions Bay",
      anmore: "Anmore",
      belcarra: "Belcarra",
      electoral_area_a: "Electoral Area A",
      tsawwassen_first_nation: "Tsawwassen First Nation",
    };

    return (
      nameMap[regionId] ||
      regionId
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };

  // 遅延予測データを生成
  const generateDelayPredictions = async () => {
    console.log(
      "Map3D: Using mock data for regional delays (API not available)"
    );

    // モックデータを使用（APIが利用できないため）
    const regionDelayData = {
      vancouver: Math.floor(Math.random() * 3),
      burnaby: Math.floor(Math.random() * 5),
      richmond: Math.floor(Math.random() * 4),
      surrey: Math.floor(Math.random() * 6),
      coquitlam: Math.floor(Math.random() * 4),
      delta: Math.floor(Math.random() * 3),
      langley: Math.floor(Math.random() * 5),
      new_westminster: Math.floor(Math.random() * 4),
    };
    setRegionDelays(regionDelayData);

    // デフォルトの地域リストを設定
    setRegions([
      {
        id: "vancouver",
        name: "Vancouver",
        center: [-123.1207, 49.2827],
        zoom: 11,
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
      {
        id: "surrey",
        name: "Surrey",
        center: [-122.849, 49.1913],
        zoom: 12,
      },
      {
        id: "coquitlam",
        name: "Coquitlam",
        center: [-122.8289, 49.2838],
        zoom: 12,
      },
      {
        id: "delta",
        name: "Delta",
        center: [-123.0857, 49.0847],
        zoom: 12,
      },
      {
        id: "langley",
        name: "Langley",
        center: [-122.6585, 49.1041],
        zoom: 12,
      },
      {
        id: "new_westminster",
        name: "New Westminster",
        center: [-122.9119, 49.2057],
        zoom: 12,
      },
    ]);

    console.log("Map3D: Mock regional delays set:", regionDelayData);

    const stopDelayData: { [key: string]: number } = {};
    // ランダムに選択されたバス停に遅延を設定
    for (let i = 0; i < 20; i++) {
      const stopId = Math.floor(Math.random() * 10000).toString();
      stopDelayData[stopId] = Math.floor(Math.random() * 5);
    }
    setStopDelays(stopDelayData);

    const routeDelayData: { [key: string]: number } = {};
    // ランダムに選択されたルートに遅延を設定
    const routes = ["1", "2", "3", "4", "5", "10", "14", "16", "20", "25"];
    routes.forEach((route) => {
      routeDelayData[route] = Math.floor(Math.random() * 4);
    });
    setRouteDelays(routeDelayData);
  };

  // ユーザーの位置情報を取得
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setUserLocation(location);
          console.log("Map3D: User location:", location);

          // 現在地マーカーを追加（スタイル読み込みを待たない）
          setTimeout(() => {
            addUserLocationMarker(location);
          }, 1000);
        },
        (error) => {
          console.error("Map3D: Error getting location:", error);
          // デフォルトでバンクーバー中心部を使用
          setUserLocation(VANCOUVER);
          setTimeout(() => {
            addUserLocationMarker(VANCOUVER);
          }, 1000);
        }
      );
    } else {
      console.log("Map3D: Geolocation not supported");
      setUserLocation(VANCOUVER);
      setTimeout(() => {
        addUserLocationMarker(VANCOUVER);
      }, 1000);
    }
  };

  // ピン留めデータを読み込み
  const loadPinnedStops = () => {
    try {
      const saved = localStorage.getItem("pinnedStops");
      if (saved) {
        const pinnedData = JSON.parse(saved);
        setPinnedStops(new Set(pinnedData.ids || []));
        setPinnedStopsData(pinnedData.data || {});
        console.log("Map3D: Pinned stops loaded:", pinnedData);
      }
    } catch (error) {
      console.error("Map3D: Error loading pinned stops:", error);
    }
  };

  // 検索ハンドラー
  const handleSearch = (query: string) => {
    console.log("Map3D: Search query:", query);
    // 検索ロジックを実装
  };

  const handleSearchStart = () => {
    setIsSearching(true);
  };

  const handleSearchEnd = () => {
    setIsSearching(false);
  };

  // 地域選択ハンドラー
  const handleRegionSelect = (regionId: string) => {
    setSelectedRegion(regionId);
    const region = regions.find((r) => r.id === regionId);
    if (region && mapRef.current) {
      mapRef.current.flyTo({
        center: region.center,
        zoom: region.zoom,
        essential: true,
      });
    }
  };

  // 遅延レベルの取得
  const getDelayLevel = (delay: number): string => {
    if (delay === 0) return "On Time";
    if (delay <= 2) return `${delay} min delay`;
    if (delay <= 5) return `${delay} min delay`;
    return `${delay} min delay`;
  };

  const getDelaySymbol = (delay: number): string => {
    if (delay === 0) return "☀️";
    if (delay <= 2) return "⛅";
    if (delay <= 5) return "☁️";
    return "🌧️";
  };

  const getDelayLevelName = (delay: number): string => {
    if (delay === 0) return "On Time";
    if (delay <= 2) return `${delay} min delay`;
    if (delay <= 5) return `${delay} min delay`;
    return `${delay} min delay`;
  };

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    console.log("Map3D: Initializing map...");

    // Mapboxのアクセストークンを設定
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      "pk.eyJ1IjoiZ3VtaWZ1IiwiYSI6ImNtZzF3dmV4NzAxamIya3BvZHdlZnZnZDAifQ.J4DJAlB51QlM6aK7ihx70w";
    if (token) {
      mapboxgl.accessToken = token;
      console.log("Map3D: Mapbox token set");
    }

    // 遅延予測データを初期化
    generateDelayPredictions();

    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/dark-v11", // 黒いダークスタイル
      center: VANCOUVER,
      zoom: 15,
      pitch: 0,
      bearing: 0,
      antialias: true, // アンチエイリアスを有効化
    });

    mapRef.current = map;
    console.log("Map3D: Map created");

    // マップが読み込まれた後の処理
    map.on("load", () => {
      console.log("Map3D: Map loaded, adding layers...");
      // 3D建物レイヤーを追加
      add3DBuildings(map);

      // 地形の3D表示を有効化
      enableTerrain3D(map);

      // バス停レイヤーを追加
      addBusStopsLayer(map);

      if (onMapReady) {
        onMapReady(map);
      }

      // ユーザーの位置情報を取得（マップ読み込み後）
      getUserLocation();

      console.log("Map3D: All layers added");
    });

    // ピンデータを読み込み
    loadPinnedStops();

    // ピッチとベアリングの変更を監視
    map.on("pitch", () => {
      setPitch(map.getPitch());
    });

    map.on("rotate", () => {
      setBearing(map.getBearing());
    });

    return () => {
      console.log("Map3D: Cleaning up map");
      if (mapRef.current) {
        // ユーザー位置レイヤーをクリーンアップ
        if (mapRef.current.getSource("user-location")) {
          if (mapRef.current.getLayer("user-location-pulse")) {
            mapRef.current.removeLayer("user-location-pulse");
          }
          if (mapRef.current.getLayer("user-location-pulse-2")) {
            mapRef.current.removeLayer("user-location-pulse-2");
          }
          if (mapRef.current.getLayer("user-location-center")) {
            mapRef.current.removeLayer("user-location-center");
          }
          mapRef.current.removeSource("user-location");
        }

        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // 依存配列を空にして一度だけ実行

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

  // 3D建物レイヤーを追加
  const add3DBuildings = (map: Map) => {
    console.log("Map3D: Adding 3D buildings...");

    // 建物の3Dレイヤーを追加（streets-v12スタイルの建物レイヤーを使用）
    if (!map.getLayer("3d-buildings")) {
      map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#666", // ダークグレー
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15,
            0,
            15.05,
            ["get", "height"],
          ],
          "fill-extrusion-base": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15,
            0,
            15.05,
            ["get", "min_height"],
          ],
          "fill-extrusion-opacity": 0.8,
        },
      });
      console.log("Map3D: 3D buildings layer added");
    }
  };

  // 地形の3D表示を有効化
  const enableTerrain3D = (map: Map) => {
    console.log("Map3D: Enabling terrain 3D...");

    // 地形ソースを追加（既に存在する場合はスキップ）
    if (!map.getSource("mapbox-dem")) {
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    }

    // 地形レイヤーを追加
    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.0 });
    console.log("Map3D: Terrain 3D enabled");
  };

  // バス停レイヤーを追加
  const addBusStopsLayer = (map: Map) => {
    console.log("Map3D: Adding bus stops layer...");

    // バス停のソースを追加（既に存在する場合はスキップ）
    if (!map.getSource("bus-stops")) {
      map.addSource("bus-stops", {
        type: "geojson",
        data: "/data/stops_route.geojson",
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
    }

    // クラスター円レイヤー
    if (!map.getLayer("bus-stops-clusters")) {
      map.addLayer({
        id: "bus-stops-clusters",
        type: "circle",
        source: "bus-stops",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#3b82f6", // 青色
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            100,
            30,
            750,
            40,
          ],
          "circle-opacity": 0.9,
        },
      });
    }

    // 個別バス停レイヤー
    if (!map.getLayer("bus-stops-unclustered")) {
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
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff", // 白
          "circle-opacity": 1.0,
        },
      });
    }

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
      console.log("Map3D: Bus stop clicked!", e);
      // イベントの伝播を停止
      e.preventDefault();

      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const geometry = feature.geometry as {
          type: "Point";
          coordinates: [number, number];
        };

        if (geometry.type === "Point") {
          const coordinates = geometry.coordinates.slice() as [number, number];
          const properties = feature.properties;

          console.log("Map3D: Bus stop properties:", properties);

          if (properties) {
            // 選択されたバス停の情報を設定
            const selectedStopData = {
              properties: properties,
              geometry: {
                type: "Point" as const,
                coordinates: coordinates,
              },
            };

            console.log("Map3D: Setting selected stop:", selectedStopData);
            setSelectedStop(selectedStopData);
            setSelectedStopId(properties.stop_id);
            setIsPanelOpen(true);

            console.log("Map3D: Panel should be open now");

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

    console.log("Map3D: Bus stops layer added successfully");
    console.log(
      "Map3D: Available layers:",
      map
        .getStyle()
        .layers.map((l) => l.id)
        .filter((id) => id.includes("bus"))
    );
  };

  // ピンアイコンをマップに追加
  const addPinIcon = () => {
    if (!mapRef.current) {
      console.error("Map not available for pin icon");
      return;
    }

    // 既にピンアイコンが追加されている場合はスキップ
    if (mapRef.current.hasImage("pin-icon")) {
      return;
    }

    const canvas = document.createElement("canvas");
    const size = 40;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ピンの外側の円（青）
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();

    // ピンの内側の円（白）
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // ピンの中心点（青）
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    mapRef.current.addImage("pin-icon", imageData);
    console.log("Pin icon added successfully");
  };

  // ユーザーの位置をMapboxレイヤーとして追加
  const addUserLocationMarker = (location: [number, number]) => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) {
      console.log("Map not ready, retrying in 1 second...");
      setTimeout(() => addUserLocationMarker(location), 1000);
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
      if (mapRef.current.getLayer("user-location-pulse-2")) {
        mapRef.current.removeLayer("user-location-pulse-2");
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

        @keyframes animate-ping {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animate-ping {
          animation: animate-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .selected-bus-stop {
          animation: pulse 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }

    // パルス効果のレイヤー1
    mapRef.current.addLayer({
      id: "user-location-pulse",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": {
          stops: [
            [0, 0],
            [20, 20],
          ],
          base: 1,
        },
        "circle-color": "#3b82f6",
        "circle-opacity": 0.3,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.8,
      },
    });

    // パルス効果のレイヤー2
    mapRef.current.addLayer({
      id: "user-location-pulse-2",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": {
          stops: [
            [0, 0],
            [20, 15],
          ],
          base: 1,
        },
        "circle-color": "#3b82f6",
        "circle-opacity": 0.6,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.9,
      },
    });

    // 中心のマーカー
    mapRef.current.addLayer({
      id: "user-location-center",
      type: "symbol",
      source: "user-location",
      layout: {
        "icon-image": "pin-icon",
        "icon-size": 1,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });

    console.log("User location marker added successfully");
  };

  // 3D表示の切り替え
  const toggle3D = () => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const newPitch = is3DEnabled ? 0 : 60;
    const newBearing = is3DEnabled ? 0 : -17.6;

    map.easeTo({
      pitch: newPitch,
      bearing: newBearing,
      duration: 1000,
    });

    setIs3DEnabled(!is3DEnabled);
  };

  // リセットボタン
  const resetView = () => {
    if (!mapRef.current) return;

    mapRef.current.easeTo({
      center: VANCOUVER,
      zoom: 15,
      pitch: 0,
      bearing: 0,
      duration: 1000,
    });

    setIs3DEnabled(false);
  };

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
                  onClick={() => handleRegionSelect(region.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedRegion === region.id
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{region.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">
                        {getDelaySymbol(regionDelays[region.id] || 0)}
                      </span>
                      <span className="text-xs">
                        {getDelayLevelName(regionDelays[region.id] || 0)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ピン留めパネル */}
        <PinnedStopsPanel
          pinnedStops={pinnedStops}
          pinnedStopsData={pinnedStopsData}
          onStopClick={(stopId) => {
            const stopData = pinnedStopsData[stopId];
            if (stopData) {
              setSelectedStop(stopData);
              setIsPanelOpen(true);
            }
          }}
          isVisible={true}
          onToggleVisibility={() => {}}
        />
      </div>

      {/* メインマップ */}
      <div ref={ref} className="h-full w-full" />

      {/* 3Dコントロール */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggle3D}
          className={`px-4 py-2 rounded-lg shadow-lg border transition-colors ${
            is3DEnabled
              ? "bg-blue-600 text-white border-blue-500"
              : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800"
          }`}
        >
          {is3DEnabled ? "2D視点" : "3D視点"}
        </button>

        <button
          onClick={resetView}
          className="px-4 py-2 bg-gray-900 text-gray-300 rounded-lg shadow-lg border border-gray-700 hover:bg-gray-800 transition-colors"
        >
          リセット
        </button>
      </div>

      {/* 3D情報パネル */}
      {is3DEnabled && (
        <div className="absolute bottom-4 left-4 z-10 bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700">
          <h3 className="font-semibold text-sm mb-2">3D表示モード</h3>
          <div className="text-xs space-y-1">
            <div>ピッチ: {Math.round(pitch)}°</div>
            <div>ベアリング: {Math.round(bearing)}°</div>
            <div className="text-gray-400 mt-2">
              • 建物の3D表示
              <br />
              • 地形の立体化
              <br />• マウスで視点変更可能
            </div>
          </div>
        </div>
      )}

      {/* 右下のコントロール */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <GoogleMapsControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onReset={() => resetView()}
          onToggleLayers={() => setShowLayers(!showLayers)}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          isFullscreen={isFullscreen}
          showLayers={showLayers}
        />
      </div>

      {/* レイヤーパネル */}
      {showLayers && (
        <div className="absolute top-4 right-4 z-20 mt-20">
          <GoogleMapsLayersPanel
            layers={layers}
            onLayerToggle={(layerId) => {
              setLayers((prev) =>
                prev.map((layer) =>
                  layer.id === layerId
                    ? { ...layer, enabled: !layer.enabled }
                    : layer
                )
              );
            }}
            onClose={() => setShowLayers(false)}
          />
        </div>
      )}

      {/* バス停詳細パネル */}
      {console.log(
        "Map3D: Panel render check - isPanelOpen:",
        isPanelOpen,
        "selectedStop:",
        selectedStop
      )}
      {/* バス停詳細パネル */}
      {isPanelOpen && selectedStop && (
        <BusStopDetailPanel
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setSelectedStop(null);
            setSelectedStopId(null);
          }}
          selectedStop={selectedStop}
          regionDelays={regionDelays}
          stopDelays={stopDelays}
          routeDelays={routeDelays}
          getDelaySymbol={getDelaySymbol}
          getDelayLevelName={getDelayLevelName}
          pinnedStops={pinnedStops}
          onTogglePin={(stopId, stopData) => {
            const newPinnedStops = new Set(pinnedStops);
            if (newPinnedStops.has(stopId)) {
              newPinnedStops.delete(stopId);
              const newPinnedData = { ...pinnedStopsData };
              delete newPinnedData[stopId];
              setPinnedStopsData(newPinnedData);
            } else {
              newPinnedStops.add(stopId);
              setPinnedStopsData((prev) => ({
                ...prev,
                [stopId]: stopData,
              }));
            }
            setPinnedStops(newPinnedStops);
            localStorage.setItem(
              "pinnedStops",
              JSON.stringify({
                ids: Array.from(newPinnedStops),
                data: newPinnedStops.has(stopId)
                  ? { ...pinnedStopsData, [stopId]: stopData }
                  : pinnedStopsData,
              })
            );
          }}
        />
      )}
    </div>
  );
}
