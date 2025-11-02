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
import MapMarkers from "./MapMarkers";

const VANCOUVER: [number, number] = [-123.1207, 49.2827];

interface ClientMapProps {
  ref?: React.RefObject<any>;
  selectedStop?: any;
  setSelectedStop?: (stop: any) => void;
  isPanelOpen?: boolean;
  setIsPanelOpen?: (open: boolean) => void;
  selectedStopId?: string | null;
  setSelectedStopId?: (id: string | null) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  userLocation?: [number, number] | null;
  setUserLocation?: (location: [number, number] | null) => void;
  pinnedStops?: Set<string>;
  setPinnedStops?: (stops: Set<string>) => void;
  pinnedStopsData?: { [key: string]: any };
  setPinnedStopsData?: (data: { [key: string]: any }) => void;
}

export default function ClientMap({
  ref: externalRef,
  selectedStop: externalSelectedStop,
  setSelectedStop: externalSetSelectedStop,
  isPanelOpen: externalIsPanelOpen,
  setIsPanelOpen: externalSetIsPanelOpen,
  selectedStopId: externalSelectedStopId,
  setSelectedStopId: externalSetSelectedStopId,
  initialCenter,
  initialZoom,
  userLocation: externalUserLocation,
  setUserLocation: externalSetUserLocation,
  pinnedStops: externalPinnedStops,
  setPinnedStops: externalSetPinnedStops,
  pinnedStopsData: externalPinnedStopsData,
  setPinnedStopsData: externalSetPinnedStopsData,
}: ClientMapProps = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // 外部refを設定
  if (externalRef) {
    externalRef.current = mapRef.current;
  }

  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    externalUserLocation || null
  );

  // 状態変数（外部propsがあればそれを使用、なければ内部状態）
  const [selectedStop, setSelectedStop] = useState<{
    properties: any;
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
  } | null>(externalSelectedStop || null);

  const [isPanelOpen, setIsPanelOpen] = useState(externalIsPanelOpen || false);
  const [selectedRegion, setSelectedRegion] = useState<string>("vancouver");
  // 遅延予測の状態
  const [regionDelays, setRegionDelays] = useState<{ [key: string]: number }>(
    {}
  );
  const [stopDelays, setStopDelays] = useState<{ [key: string]: number }>({});
  const [routeDelays, setRouteDelays] = useState<{ [key: string]: number }>({});
  const [routeIdMapping, setRouteIdMapping] = useState<{
    [routeNumber: string]: string;
  }>({}); // 路線番号 -> route_id（GTFS内部ID）
  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    externalSelectedStopId || null
  );

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

  // ピン留め機能の状態（外部propsがあればそれを使用）
  const [pinnedStops, setPinnedStops] = useState<Set<string>>(
    externalPinnedStops || new Set()
  );
  const [pinnedStopsData, setPinnedStopsData] = useState<{
    [key: string]: any;
  }>(externalPinnedStopsData || {});
  const [isPinnedPanelVisible, setIsPinnedPanelVisible] = useState(false);

  // 地域データの状態
  const [regions, setRegions] = useState<
    Array<{
      id: string;
      name: string;
      center: [number, number];
      zoom: number;
    }>
  >([
    // デフォルト値（APIから取得するまでの初期値）
    {
      id: "vancouver",
      name: "Vancouver",
      center: [-123.1207, 49.2827],
      zoom: 11,
    },
  ]);

  // API URL
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://vanbuscast-api-prod.up.railway.app";

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

  // 地域別遅延予測をAPIから取得
  const generateDelayPredictions = async () => {
    try {
      // Next.jsのAPIルート経由でアクセス（CORS問題を回避）
      const apiEndpoint = "/api/regional-status";
      console.log("Fetching delay predictions from API:", apiEndpoint);

      // APIから地域別遅延情報を取得
      const response = await fetch(apiEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`
        );
      }

      const data = await response.json();
      console.log("API response:", data);

      // APIレスポンスから地域別遅延データを抽出
      const regionDelayData: { [key: string]: number } = {};
      const regionList: Array<{
        id: string;
        name: string;
        center: [number, number];
        zoom: number;
      }> = [];

      // 主要な街8つに制限
      const majorRegions = [
        "vancouver",
        "richmond",
        "burnaby",
        "surrey",
        "coquitlam",
        "delta",
        "langley",
        "new_westminster",
      ];

      if (data.regions && Array.isArray(data.regions)) {
        data.regions.forEach((region: any) => {
          const regionId = region.region_id;
          // region_id は重複回避のためそのまま使用（例: "port_coquitlam" と "port_moody"）
          const simplifiedId = regionId;
          // 秒を分に変換して丸める（負の値も保持：マイナスは「早く来ている」を意味する）
          const delayMinutes = region.avg_delay_seconds
            ? Math.round(region.avg_delay_seconds / 60)
            : 0;
          regionDelayData[simplifiedId] = delayMinutes;

          // 主要な街のみ地域リストに追加
          const isMajorRegion = majorRegions.some((major) =>
            simplifiedId.toLowerCase().includes(major.toLowerCase())
          );

          if (isMajorRegion) {
            // 緯度経度がAPIから取得できない場合は固定値を使用
            let center: [number, number];
            let zoom: number;

            if (region.center_lat && region.center_lon) {
              center = [region.center_lon, region.center_lat];
              zoom = 12;
            } else {
              // 固定値のマッピング
              const centerMap: { [key: string]: [number, number] } = {
                vancouver: [-123.1207, 49.2827],
                richmond: [-123.1338, 49.1666],
                burnaby: [-122.9749, 49.2488],
                surrey: [-122.849, 49.1913],
                coquitlam: [-122.8289, 49.2838],
                delta: [-123.0857, 49.0847],
                langley: [-122.6585, 49.1041],
                new_westminster: [-122.9119, 49.2057],
              };

              const matchedMajor = majorRegions.find((major) =>
                simplifiedId.toLowerCase().includes(major.toLowerCase())
              );
              center =
                matchedMajor && centerMap[matchedMajor]
                  ? centerMap[matchedMajor]
                  : [-123.1207, 49.2827]; // デフォルト
              zoom = simplifiedId.toLowerCase().includes("vancouver") ? 11 : 12;
            }

            regionList.push({
              id: simplifiedId,
              name: region.region_name || formatRegionName(simplifiedId),
              center,
              zoom,
            });
          }
        });
      }

      setRegionDelays(regionDelayData);

      // 地域リストを設定（APIから取得したデータがあればそれを使用、なければデフォルト）
      // 主要な街6つに制限（重複を避けつつ最大6つ）
      if (regionList.length > 0) {
        // 主要な街の優先順位に基づいてソート
        const sortedRegions = regionList.sort((a, b) => {
          const aIndex = majorRegions.findIndex((major) =>
            a.id.toLowerCase().includes(major.toLowerCase())
          );
          const bIndex = majorRegions.findIndex((major) =>
            b.id.toLowerCase().includes(major.toLowerCase())
          );
          return (
            (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
          );
        });
        // 最大8つに制限
        setRegions(sortedRegions.slice(0, 8));
      } else {
        // フォールバック: 主要な街8つ
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
      }
    } catch (error) {
      console.error("Error fetching delay predictions from API:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      console.error("API URL attempted:", "/api/regional-status");
      console.log("Falling back to mock data");

      // エラー時はモックデータを使用（主要な街6つのみ）
      const regionDelayData = {
        vancouver: Math.floor(Math.random() * 3),
        burnaby: Math.floor(Math.random() * 5),
        richmond: Math.floor(Math.random() * 4),
        surrey: Math.floor(Math.random() * 6),
        coquitlam: Math.floor(Math.random() * 4),
        delta: Math.floor(Math.random() * 3),
      };
      setRegionDelays(regionDelayData);

      // 主要な街6つを設定
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
      ]);
    }

    // 路線別遅延予測（デモデータ）
    const routeDelayData: { [key: string]: number } = {};
    const routes = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "10",
      "14",
      "16",
      "20",
      "25",
      "023",
      "025",
      "041",
      "099",
      "410",
      "416",
    ];
    routes.forEach((route) => {
      routeDelayData[route] = Math.floor(Math.random() * 5); // 0-4分
    });
    setRouteDelays(routeDelayData);

    const stopDelayData: { [key: string]: number } = {};
    for (let i = 0; i < 20; i++) {
      const stopId = Math.floor(Math.random() * 10000).toString();
      stopDelayData[stopId] = Math.floor(Math.random() * 8); // 0-7分
    }
    setStopDelays(stopDelayData);
  };

  // 遅延レベルに基づく天気アイコン取得
  const getDelaySymbol = (level: number) => {
    const delay = Math.round(level);
    if (delay === 0) return "☀️"; // On Time
    if (delay < 0) return "⭐"; // 早く来ている（良い状態）
    if (delay <= 2) return "🌤️"; // 軽微な遅延
    if (delay <= 5) return "☁️"; // 中程度の遅延
    return "⛈️"; // 重大な遅延
  };

  // 遅延レベル名を取得
  const getDelayLevelName = (level: number) => {
    const delay = Math.round(level);
    if (delay === 0) return "On Time";
    // 負の値（早く来ている）
    if (delay < 0) return `${Math.abs(delay)} min early`;
    // 正の値（遅れている）
    if (delay <= 2) return `${delay} min delay`;
    if (delay <= 5) return `${delay} min delay`;
    return `${delay}+ min delay`;
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
      // stops.geojsonファイルからデータを取得（路線情報を含む）
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
          const stopData = {
            properties: properties,
            geometry: {
              type: "Point" as const,
              coordinates: coordinates,
            },
          };
          // 外部のハンドラーを優先して使用（URL更新のため）
          if (externalSetSelectedStop) {
            externalSetSelectedStop(stopData);
          } else {
            setSelectedStop(stopData);
          }

          if (externalSetIsPanelOpen) {
            externalSetIsPanelOpen(true);
          } else {
            setIsPanelOpen(true);
          }

          const stopId = properties?.stop_id || null;
          if (externalSetSelectedStopId) {
            externalSetSelectedStopId(stopId);
          } else {
            setSelectedStopId(stopId);
          }

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
  const handlePinnedStopClick = async (stopData: any) => {
    if (!mapRef.current) return;

    console.log("handlePinnedStopClick - stopData:", stopData);

    // データ構造を確認して適切にアクセス
    const coordinates = stopData.geometry?.coordinates || stopData.coordinates;
    const properties = stopData.properties || stopData;
    const stopId = properties?.stop_id || stopData.stopId;

    if (!coordinates || !stopId) {
      console.error("No coordinates or stopId found in stopData:", stopData);
      return;
    }

    try {
      // 最新のstops.geojsonから完全なデータを取得
      const response = await fetch("/data/stops.geojson");
      const data = await response.json();

      const fullStopData = data.features.find(
        (feature: any) => feature.properties?.stop_id === stopId
      );

      const stopData = fullStopData || {
        properties: properties,
        geometry: {
          type: "Point" as const,
          coordinates: coordinates,
        },
      };

      if (fullStopData) {
        console.log("Found full stop data:", fullStopData);
      } else {
        console.warn("Full stop data not found, using saved data");
      }

      // 外部のハンドラーを優先して使用（URL更新のため）
      if (externalSetSelectedStop) {
        externalSetSelectedStop(stopData);
      } else {
        setSelectedStop(stopData);
      }

      if (externalSetIsPanelOpen) {
        externalSetIsPanelOpen(true);
      } else {
        setIsPanelOpen(true);
      }

      if (externalSetSelectedStopId) {
        externalSetSelectedStopId(stopId);
      } else {
        setSelectedStopId(stopId);
      }

      mapRef.current.flyTo({
        center: stopData.geometry.coordinates,
        zoom: 18,
        essential: true,
      });
    } catch (error) {
      console.error("Error loading full stop data:", error);

      // エラー時は保存されたデータを使用
      const fallbackStopData = {
        properties: properties,
        geometry: {
          type: "Point" as const,
          coordinates: coordinates,
        },
      };

      if (externalSetSelectedStop) {
        externalSetSelectedStop(fallbackStopData);
      } else {
        setSelectedStop(fallbackStopData);
      }

      if (externalSetIsPanelOpen) {
        externalSetIsPanelOpen(true);
      } else {
        setIsPanelOpen(true);
      }

      if (externalSetSelectedStopId) {
        externalSetSelectedStopId(stopId);
      } else {
        setSelectedStopId(stopId);
      }

      mapRef.current.flyTo({
        center: coordinates,
        zoom: 18,
        essential: true,
      });
    }
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

    // ピン留めマーカーを追加
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
  // ユーザーの位置情報を取得
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const location: [number, number] = [lng, lat];
          setUserLocation(location);
          if (externalSetUserLocation) {
            externalSetUserLocation(location);
          }
          console.log("User location:", lat, lng);

          // マップが読み込まれている場合は、現在地を中心に移動（3D表示に適したズームレベル）
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: location,
              zoom: 16, // 3D表示に適したズームレベル
              duration: 1500,
              essential: true,
            });
            console.log("ClientMap: Map moved to user location with zoom 16");
          }

          // 現在地マーカーはMapMarkersコンポーネントで管理
        },
        (error) => {
          console.error("Error getting user location:", error);
          // デフォルトでバンクーバー中心部を使用
          setUserLocation(VANCOUVER);
          // 現在地マーカーはMapMarkersコンポーネントで管理
        }
      );
    } else {
      console.log("Geolocation not supported");
      setUserLocation(VANCOUVER);
      // 現在地マーカーはMapMarkersコンポーネントで管理
    }
  };

  // ピンアイコンをマップに追加

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    console.log("ClientMap: Initializing map...");

    // WebGLサポートチェック
    if (!mapboxgl.supported()) {
      console.error("ClientMap: WebGL not supported on this device");
      if (ref.current) {
        ref.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px;">
            <div>
              <p>WebGL is not supported on this device.</p>
              <p>Please update your browser or device.</p>
            </div>
          </div>
        `;
      }
      return;
    }

    // Mapboxのアクセストークンを設定
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      "pk.eyJ1IjoiZ3VtaWZ1IiwiYSI6ImNtZzF3dmV4NzAxamIya3BvZHdlZnZnZDAifQ.J4DJAlB51QlM6aK7ihx70w";

    if (!token || token === "your_mapbox_token_here") {
      console.error("ClientMap: Mapbox token is missing or invalid");
      if (ref.current) {
        ref.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px;">
            <div>
              <p>Mapbox token is not configured.</p>
              <p>Please set NEXT_PUBLIC_MAPBOX_TOKEN environment variable.</p>
            </div>
          </div>
        `;
      }
      return;
    }

    mapboxgl.accessToken = token;
    console.log("ClientMap: Mapbox token set");

    // 遅延予測データを初期化
    generateDelayPredictions();

    if (!ref.current) {
      console.error("ClientMap: Map container not available");
      return;
    }

    try {
      // iOS Safari向けの遅延初期化（コンテナのサイズが確実に計算されるまで待つ）
      const initMap = () => {
        if (!ref.current) return;

        // iOS Safari向け：コンテナのサイズを明示的に計算
        const container = ref.current;
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          // サイズがまだ計算されていない場合は少し待つ
          setTimeout(initMap, 100);
          return;
        }

        const map = new mapboxgl.Map({
          container: container,
          style: "mapbox://styles/mapbox/dark-v11",
          center: initialCenter || VANCOUVER,
          zoom: initialZoom || 16,
          // モバイル向けの最適化
          renderWorldCopies: true,
          maxTileCacheSize: 50, // モバイル向けにキャッシュサイズを制限
          // iOS Safari向けの最適化
          preserveDrawingBuffer: false, // メモリ使用量を削減
          antialias: true,
        });

        console.log("ClientMap: Map created");

        // Mapboxのデフォルトコントロールは削除（Google Maps風のカスタムコントロールを使用）
        mapRef.current = map;

        // エラーハンドリング
        map.on("error", (e) => {
          console.error("ClientMap: Map error:", e);
          if (e.error && e.error.message) {
            console.error("ClientMap: Error message:", e.error.message);
          }
        });

        map.on("style.load", () => {
          console.log("ClientMap: Style loaded successfully");
        });

        map.on("styleimagemissing", (e) => {
          console.warn("ClientMap: Style image missing:", e.id);
        });

        // マップの高さを明示的に設定
        const resizeMap = () => {
          if (map) {
            map.resize();
          }
        };

        // リサイズイベントを追加
        window.addEventListener("resize", resizeMap);

        // マップが読み込まれた後にリサイズとレイヤー追加
        map.on("load", () => {
          console.log("ClientMap: Map loaded, adding layers...");
          setTimeout(resizeMap, 100);

          // バス停レイヤーを追加
          addBusStopsLayer(map);

          // ユーザーの位置情報を取得（マップ読み込み後）
          getUserLocation();

          console.log("ClientMap: All layers added");
        });

        // ピンデータを読み込み
        loadPinnedStops();

        // iOS Safari向け：マップが読み込まれた後に明示的にリサイズ
        setTimeout(() => {
          if (map) {
            map.resize();
          }
        }, 300);
      };

      // 初期化を実行（iOS Safariでは少し遅延させる）
      if (
        typeof window !== "undefined" &&
        /iPad|iPhone|iPod/.test(navigator.userAgent)
      ) {
        // iOS Safariの場合、少し待ってから初期化
        setTimeout(initMap, 100);
      } else {
        // その他のブラウザは即座に初期化
        initMap();
      }
    } catch (error) {
      console.error("ClientMap: Failed to initialize map:", error);
      if (ref.current) {
        ref.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px;">
            <div>
              <p>Failed to load map.</p>
              <p>Error: ${
                error instanceof Error ? error.message : String(error)
              }</p>
              <p>Please check the browser console for more details.</p>
            </div>
          </div>
        `;
      }
    }
  }, []);

  // ユーザーの位置情報が取得できたら、地図の中心を移動（初回のみ）
  useEffect(() => {
    if (userLocation && mapRef.current) {
      // 現在のズームレベルがデフォルト（16）の場合のみ移動
      const currentZoom = mapRef.current.getZoom();
      if (Math.abs(currentZoom - 16) < 0.1) {
        mapRef.current.flyTo({
          center: userLocation,
          zoom: 16, // 3D表示に適したズームレベル
          essential: true,
        });
      }
    }
  }, [userLocation]);

  // 選択されたバス停の遅延予測をAPIから取得
  useEffect(() => {
    const fetchStopPredictions = async () => {
      if (!selectedStopId) return;

      try {
        console.log("Fetching stop predictions for stop:", selectedStopId);
        const response = await fetch(
          `/api/stops/${selectedStopId}/predictions`
        );

        if (!response.ok) {
          console.error("Failed to fetch stop predictions:", response.status);
          return;
        }

        const data = await response.json();
        console.log("Stop predictions data:", data);

        // バス停の平均遅延を計算（arrivalsから）
        if (
          data.arrivals &&
          Array.isArray(data.arrivals) &&
          data.arrivals.length > 0
        ) {
          const delays = data.arrivals
            .map((arrival: any) => arrival.predicted_delay_seconds)
            .filter((delay: any) => delay !== null && delay !== undefined);

          if (delays.length > 0) {
            const avgDelaySeconds =
              delays.reduce((sum: number, delay: number) => sum + delay, 0) /
              delays.length;
            const avgDelayMinutes = Math.max(
              0,
              Math.round(avgDelaySeconds / 60)
            ); // 秒を分に変換、負の値は0として扱う

            setStopDelays((prev) => ({
              ...prev,
              [selectedStopId]: avgDelayMinutes,
            }));
          }
        }

        // ルート別遅延データを更新
        if (data.arrivals && Array.isArray(data.arrivals)) {
          const routeDelayData: { [key: string]: number } = {};

          // trip_headsignから路線番号を抽出するヘルパー関数
          const extractRouteNumber = (
            tripHeadsign: string | null | undefined
          ): string | null => {
            if (!tripHeadsign) return null;
            // "44 UBC"のような形式から"44"を抽出
            const match = tripHeadsign.match(/^(\d+)/);
            return match ? match[1] : null;
          };

          // 路線番号 -> route_id（GTFS内部ID）のマッピングを作成
          const routeIdMap: { [routeNumber: string]: string } = {};

          // 全てのarrivalsを処理（遅延予測の有無に関わらず全てのルートを含む）
          data.arrivals.forEach((arrival: any) => {
            // trip_headsignから実際の路線番号を取得
            const routeNumber = extractRouteNumber(arrival.trip_headsign);
            if (!routeNumber) {
              console.warn(
                "Could not extract route number from trip_headsign:",
                arrival.trip_headsign
              );
              return;
            }

            // route_idとroute_numberのマッピングを保存（最初に見つかったものを使用）
            if (arrival.route_id && !routeIdMap[routeNumber]) {
              routeIdMap[routeNumber] = arrival.route_id;
            }

            // 遅延予測がある場合は計算、ない場合は0を設定
            if (
              arrival.predicted_delay_seconds !== null &&
              arrival.predicted_delay_seconds !== undefined
            ) {
              const delayMinutes = Math.max(
                0,
                Math.round(arrival.predicted_delay_seconds / 60)
              ); // 秒を分に変換、負の値は0として扱う

              // 同じルートの複数の予測がある場合は平均を取る
              if (routeDelayData[routeNumber] !== undefined) {
                routeDelayData[routeNumber] = Math.round(
                  (routeDelayData[routeNumber] + delayMinutes) / 2
                );
              } else {
                routeDelayData[routeNumber] = delayMinutes;
              }
            } else {
              // 遅延予測がない場合でもルートを追加（遅延は0）
              if (routeDelayData[routeNumber] === undefined) {
                routeDelayData[routeNumber] = 0;
              }
            }
          });

          // route_idマッピングを保存
          setRouteIdMapping(routeIdMap);

          console.log("ClientMap: Route delay data:", routeDelayData);
          console.log("ClientMap: Selected stop ID:", selectedStopId);

          // 選択されたバス停のルート情報のみを設定（以前のバス停のルート情報はクリア）
          setRouteDelays(routeDelayData);
          console.log(
            "ClientMap: Updated route delays (replaced):",
            routeDelayData
          );
        }
      } catch (error) {
        console.error("Error fetching stop predictions:", error);
      }
    };

    fetchStopPredictions();
  }, [selectedStopId]);

  // バス停レイヤーを追加する関数
  const addBusStopsLayer = (map: Map) => {
    // 既存のソースとレイヤーを削除
    if (map.getSource("bus-stops")) {
      map.removeLayer("bus-stops-clusters");
      map.removeLayer("bus-stops-unclustered");
      map.removeLayer("bus-stops-unclustered-bg");
      // map.removeLayer("bus-stops-count"); // レイヤーが存在しないためコメントアウト
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
        "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
      },
    });

    // クラスター数表示レイヤー（一時的に無効化）
    // map.addLayer({
    //   id: "bus-stops-count",
    //   type: "symbol",
    //   source: "bus-stops",
    //   filter: ["has", "point_count"],
    //   layout: {
    //     "text-field": "{point_count_abbreviated}",
    //     "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    //     "text-size": 12,
    //   },
    // });

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
          const coordinates = geometry.coordinates.slice() as [number, number];
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

  // GeoJSONデータをクラスタリング表示
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // 地図のスタイルが読み込まれた後にレイヤーを追加
    if (map.isStyleLoaded()) {
      addBusStopsLayer(map);
    } else {
      map.on("style.load", () => addBusStopsLayer(map));
    }
  }, []);

  // 選択されたバス停IDが変更された時にレイヤーを更新
  useEffect(() => {
    // 一時的に無効化（エラー回避のため）
    // if (
    //   mapRef.current &&
    //   mapRef.current.getLayer &&
    //   mapRef.current.getLayer("bus-stops-unclustered")
    // ) {
    //   mapRef.current.setPaintProperty("bus-stops-unclustered", "circle-color", [
    //     "case",
    //     ["==", ["get", "stop_id"], selectedStopId || ""],
    //     "#ef4444", // 赤色（選択されたバス停）
    //     "#3b82f6", // 青色（通常のバス停）
    //   ]);
    // }
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
          <RegionSelector
            regions={regions}
            selectedRegion={selectedRegion}
            onRegionSelect={(regionId) => {
              setSelectedRegion(regionId);
              if (mapRef.current) {
                const regionData = regions.find((r) => r.id === regionId);
                if (regionData) {
                  mapRef.current.flyTo({
                    center: regionData.center,
                    zoom: regionData.zoom,
                    essential: true,
                  });
                }
              }
            }}
            isPanelOpen={isPanelOpen}
            regionDelays={regionDelays}
            getDelaySymbol={getDelaySymbol}
            getDelayLevelName={getDelayLevelName}
          />
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
                className="text-gray-400 hover:text-gray-200 text-lg ml-2 cursor-pointer"
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
                  }}
                  className="w-full text-left p-2 rounded text-xs transition-colors hover:bg-gray-800 text-gray-300 cursor-pointer"
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

      {/* Information Button */}
      {/* <div className="absolute bottom-4 right-4 z-10">
        <div className="relative group">
          <button className="w-10 h-10 bg-gray-900 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors cursor-help">
            <span className="text-gray-400 hover:text-white text-lg">i</span>
          </button>
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
            <div className="space-y-2">
              <p className="font-semibold">バス停クラスタリング</p>
              <p>Translinkの全バス停をGeoJSONで表示</p>
              <div className="space-y-1">
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
              <p className="text-gray-300">
                ズームアウト: クラスター表示
                <br />
                ズームイン: 個別バス停表示
              </p>
            </div>
          </div>
        </div>
      </div> */}

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
          if (externalSetIsPanelOpen) {
            externalSetIsPanelOpen(false);
          }
          setSelectedStop(null);
          if (externalSetSelectedStop) {
            externalSetSelectedStop(null);
          }
          setSelectedStopId(null);
          if (externalSetSelectedStopId) {
            externalSetSelectedStopId(null);
          }
        }}
        selectedStop={selectedStop}
        regionDelays={regionDelays}
        stopDelays={stopDelays}
        routeDelays={routeDelays}
        routeIdMapping={routeIdMapping}
        selectedStopId={selectedStopId}
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

      {/* Map Markers */}
      <MapMarkers
        map={mapRef.current}
        userLocation={userLocation}
        animationFrameRef={animationFrameRef}
      />
    </div>
  );
}
