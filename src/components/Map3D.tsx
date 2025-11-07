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

interface Map3DProps {
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
  onMapReady?: (map: Map) => void;
  onMapToggle?: () => void;
  is3DMode?: boolean;
}

export default function Map3D({
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
  onMapReady,
  onMapToggle,
  is3DMode = true,
}: Map3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const hoveredStopIdRef = useRef<string | null>(null);

  // 外部refを設定
  if (externalRef) {
    externalRef.current = mapRef.current;
  }

  const [is3DEnabled, setIs3DEnabled] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);

  // 2Dと同じ状態変数を追加（外部propsがあればそれを使用）
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    externalUserLocation || null
  );
  const [selectedStop, setSelectedStop] = useState<{
    properties: any;
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
  } | null>(externalSelectedStop || null);
  const [isPanelOpen, setIsPanelOpen] = useState(externalIsPanelOpen || false);
  const [selectedRegion, setSelectedRegion] = useState<string>("vancouver");
  const [regionDelays, setRegionDelays] = useState<{ [key: string]: number }>(
    {}
  );
  const [stopDelays, setStopDelays] = useState<{ [key: string]: number }>({});
  const [routeDelays, setRouteDelays] = useState<{ [key: string]: number | null }>({});
  const [routeIdMapping, setRouteIdMapping] = useState<{
    [routeNumber: string]: string;
  }>({}); // 路線番号 -> route_id（GTFS内部ID）
  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    externalSelectedStopId || null
  );

  // 外部の状態を内部の状態に同期
  useEffect(() => {
    if (externalSelectedStop !== undefined) {
      setSelectedStop(externalSelectedStop);
    }
  }, [externalSelectedStop]);

  useEffect(() => {
    if (externalIsPanelOpen !== undefined) {
      setIsPanelOpen(externalIsPanelOpen);
    }
  }, [externalIsPanelOpen]);

  useEffect(() => {
    if (externalSelectedStopId !== undefined) {
      setSelectedStopId(externalSelectedStopId);
    }
  }, [externalSelectedStopId]);
  const [showLayers, setShowLayers] = useState(false);
  const [showLogoShine, setShowLogoShine] = useState(false);
  const [layers, setLayers] = useState([
    { id: "traffic", name: "Traffic", enabled: true, icon: "🚦" },
    { id: "transit", name: "Transit", enabled: true, icon: "🚌" },
    { id: "bicycle", name: "Bicycle", enabled: false, icon: "🚴" },
  ]);
  const [isSearching, setIsSearching] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [pinnedStops, setPinnedStops] = useState<Set<string>>(
    externalPinnedStops || new Set()
  );
  const [pinnedStopsData, setPinnedStopsData] = useState<{
    [key: string]: any;
  }>(externalPinnedStopsData || {});

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
  // API URL
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://vanbuscast-api-prod.up.railway.app";

  const generateDelayPredictions = async () => {
    try {
      // Next.jsのAPIルート経由でアクセス（CORS問題を回避）
      const apiEndpoint = "/api/regional-status";
      console.log("Map3D: Fetching delay predictions from API:", apiEndpoint);

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
      console.log("Map3D: API response:", data);

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
      // 主要な街8つに制限（重複を避けつつ最大8つ）
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
      console.error("Map3D: Error fetching delay predictions from API:", error);
      if (error instanceof Error) {
        console.error("Map3D: Error message:", error.message);
        console.error("Map3D: Error stack:", error.stack);
      }
      console.error("Map3D: API URL attempted:", "/api/regional-status");
      console.log("Map3D: Falling back to mock data");

      // エラー時はモックデータを使用
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

    // 路線別遅延予測（デモデータ）
    const routeDelayData: { [key: string]: number } = {};
    const routes = ["1", "2", "3", "4", "5", "10", "14", "16", "20", "25"];
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
          if (externalSetUserLocation) {
            externalSetUserLocation(location);
          }
          console.log("Map3D: User location:", location);

          // マップが読み込まれている場合は、現在地を中心に移動（3D表示に適したズームレベル）
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: location,
              zoom: 16, // 3D表示に適したズームレベル
              pitch: 45, // 3D効果を高めるピッチ
              bearing: 0,
              duration: 1500,
              essential: true,
            });
            setIs3DEnabled(true); // 3Dモードを自動的に有効化
            console.log("Map3D: Map moved to user location with 3D zoom");
          }

          // 現在地マーカーはMapMarkersコンポーネントで管理
        },
        (error) => {
          // エラーの種類に応じて適切なメッセージを表示
          let errorMessage = "Unable to get location";
          if (error.code === 1) {
            errorMessage = "Location permission denied";
          } else if (error.code === 2) {
            errorMessage = "Location unavailable";
          } else if (error.code === 3) {
            errorMessage = "Location request timeout";
          }
          console.warn(`Map3D: ${errorMessage} - using default location`);
          // デフォルトでバンクーバー中心部を使用
          setUserLocation(VANCOUVER);
          // 現在地マーカーはMapMarkersコンポーネントで管理
        }
      );
    } else {
      console.log("Map3D: Geolocation not supported");
      setUserLocation(VANCOUVER);
      // 現在地マーカーはMapMarkersコンポーネントで管理
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
    const normalizedDelay = Math.round(delay);
    const absDelay = Math.abs(normalizedDelay);
    if (normalizedDelay === 0) return "☀️";
    if (absDelay <= 2) return "⛅"; // 軽微な遅延と早く来ている時（2分以内）
    if (absDelay <= 5) return "☁️"; // 中程度の遅延と早く来ている時（5分以内）
    return "🌧️"; // 重大な遅延と早く来ている時（5分超）
  };

  const getDelayLevelName = (delay: number): string => {
    const normalizedDelay = Math.round(delay);
    if (normalizedDelay === 0) return "On Time";
    // 負の値（早く来ている）
    if (normalizedDelay < 0) return `${Math.abs(normalizedDelay)} min early`;
    // 正の値（遅れている）
    if (normalizedDelay <= 2) return `${normalizedDelay} min delay`;
    if (normalizedDelay <= 5) return `${normalizedDelay} min delay`;
    return `${normalizedDelay}+ min delay`;
  };

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    console.log("Map3D: Initializing map...");

    // WebGLサポートチェック
    if (!mapboxgl.supported()) {
      console.error("Map3D: WebGL not supported on this device");
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
      console.error("Map3D: Mapbox token is missing or invalid");
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
      console.log("Map3D: Mapbox token set");

    // 遅延予測データを初期化
    generateDelayPredictions();

    if (!ref.current) {
      console.error("Map3D: Map container not available");
      return;
    }

    try {
      // iOS Safari向けの遅延初期化（コンテナのサイズが確実に計算されるまで待つ）
      let initAttempts = 0;
      const maxInitAttempts = 20; // 最大20回（2秒）試行

      const initMap = () => {
        if (!ref.current) {
          console.warn("Map3D: Container ref is null");
          return;
        }

        // コンテナのサイズを明示的に計算
        const container = ref.current;
        const rect = container.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
          initAttempts++;
          if (initAttempts < maxInitAttempts) {
            // サイズがまだ計算されていない場合は少し待つ
            setTimeout(initMap, 100);
            return;
          } else {
            // サイズが0のままではマップを作成できない（403エラーの原因になる可能性）
            console.error(
              "Map3D: Container size is 0, cannot initialize map. Please check the container's CSS."
            );
            if (ref.current) {
              ref.current.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px;">
                  <div>
                    <p>Failed to initialize map.</p>
                    <p>Container size is not available.</p>
                  </div>
                </div>
              `;
            }
            return;
          }
    }

    const map = new mapboxgl.Map({
          container: container,
      style: "mapbox://styles/mapbox/dark-v11", // 黒いダークスタイル
      center: initialCenter || VANCOUVER,
      zoom: initialZoom || 16, // 3D表示に適した初期ズームレベル
      pitch: 45, // 初期ピッチを3D効果のある角度に
      bearing: 0,
      antialias: true, // アンチエイリアスを有効化
          // モバイル向けの最適化
          renderWorldCopies: true,
          maxTileCacheSize: 50, // モバイル向けにキャッシュサイズを制限
    });

    mapRef.current = map;
    console.log("Map3D: Map created");

        // エラーハンドリング（タイルエラーは通常ログに記録しない）
        // Mapboxのタイルロードエラーは自動的にリトライされるため、ログに記録する必要がない
        let hasShown403Error = false;

        map.on("error", (e: any) => {
          // エラーメッセージがない、またはタイルエラーの場合は無視
          const errorMessage = e.error?.message?.toLowerCase() || "";
          const status = (e.error as any)?.status;

          // 403 Forbiddenエラー（トークンの問題）を検出
          if (status === 403 || errorMessage.includes("forbidden")) {
            if (!hasShown403Error) {
              hasShown403Error = true;
              console.error("Map3D: Mapbox 403 Forbidden Error", {
                message:
                  "Mapbox token may be invalid or expired. Please check your NEXT_PUBLIC_MAPBOX_TOKEN.",
                status: status,
                type: e.type,
              });
              // ユーザーに表示する
              if (ref.current) {
                const errorDiv = document.createElement("div");
                errorDiv.style.cssText =
                  "position: absolute; top: 10px; left: 10px; right: 10px; background: rgba(239, 68, 68, 0.9); color: white; padding: 12px; border-radius: 8px; z-index: 1000; font-size: 14px;";
                errorDiv.innerHTML = `
                  <strong>Map Loading Error</strong><br>
                  Unable to load the map. Please try refreshing the page.<br>
                  If the problem persists, please contact support.
                `;
                ref.current.appendChild(errorDiv);
              }
            }
            return;
          }

          // 重要なエラーのみをログに記録（トークン、認証、スタイル関連）
          if (
            errorMessage &&
            (errorMessage.includes("token") ||
              errorMessage.includes("unauthorized") ||
              errorMessage.includes("style") ||
              errorMessage.includes("access denied"))
          ) {
            console.error("Map3D: Important map error:", {
              message: e.error?.message,
              status: status,
              type: e.type,
            });
          }
          // その他のエラー（タイルエラーなど）は完全に無視
        });

        map.on("style.load", () => {
          console.log("Map3D: Style loaded successfully");
        });

        map.on("styleimagemissing", (e) => {
          console.warn("Map3D: Style image missing:", e.id);
        });

    // マップが読み込まれた後の処理
    map.on("load", () => {
      console.log("Map3D: Map loaded, adding layers...");

      // 初期3Dモードを有効化
      setIs3DEnabled(true);

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

        // iOS Safari向け：マップが読み込まれた後に明示的にリサイズ
        setTimeout(() => {
          if (map) {
            map.resize();
          }
        }, 300);

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
      };

      // 初期化を実行（すべてのブラウザで即座に初期化を試行）
      // コンテナのサイズチェックが初期化関数内で処理されるため、
      // iOS Safariでも即座に初期化を試行（サイズが0の場合は自動的にリトライされる）
      initMap();
    } catch (error) {
      console.error("Map3D: Failed to initialize map:", error);
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

  // 10秒ごとにロゴに光沢アニメーションを実行（テスト用）
  useEffect(() => {
    // 初回は即座に実行（テスト用）
    const initialTimer = setTimeout(() => {
      setShowLogoShine(true);
      setTimeout(() => setShowLogoShine(false), 6000); // 6秒後にアニメーション終了
    }, 1000); // 1秒後

    // 10秒ごとに繰り返し
    const interval = setInterval(() => {
      setShowLogoShine(true);
      setTimeout(() => setShowLogoShine(false), 6000); // 6秒後にアニメーション終了
    }, 10000); // 10秒

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // 選択されたバス停の遅延予測をAPIから取得
  useEffect(() => {
    const fetchStopPredictions = async () => {
      if (!selectedStopId) return;

      try {
        console.log(
          "Map3D: Fetching stop predictions for stop:",
          selectedStopId
        );
        const response = await fetch(
          `/api/stops/${selectedStopId}/predictions`
        );

        if (!response.ok) {
          console.error(
            "Map3D: Failed to fetch stop predictions:",
            response.status
          );
          return;
        }

        const data = await response.json();
        console.log("Map3D: Stop predictions data:", data);

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
          const routeDelayData: { [key: string]: number | null } = {};

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

          // 3時間以内の到着のみをフィルタリング（ミリ秒単位）
          const now = new Date();
          const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3時間 = 10,800,000ミリ秒

          // 時刻をパースする関数
          const parseTime = (timeStr: string): Date | null => {
            if (!timeStr) return null;
            try {
              const isoDate = new Date(timeStr);
              if (!isNaN(isoDate.getTime())) {
                return isoDate;
              }
            } catch (e) {}
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
            if (!timeMatch) return null;
            const hour = parseInt(timeMatch[1], 10);
            const minute = parseInt(timeMatch[2], 10);
            const date = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              hour,
              minute,
              0
            );
            return date;
          };

          // 全てのarrivalsを処理（遅延予測の有無に関わらず全てのルートを含む）
          // ただし、3時間以内の到着のみを処理
          data.arrivals.forEach((arrival: any) => {
            // 3時間以内の到着かどうかを確認
            const rawTime =
              arrival.scheduled_arrival_time ||
              arrival.arrival_time ||
              arrival.next_arrival_time ||
              arrival.estimated_arrival_time ||
              "";

            if (rawTime) {
              const arrivalTime = parseTime(rawTime);
              if (arrivalTime) {
                // 過去の時刻の場合は、明日の時刻として扱う
                let actualArrivalTime: Date;
                if (arrivalTime < now) {
                  const tomorrowTime = new Date(arrivalTime);
                  tomorrowTime.setDate(tomorrowTime.getDate() + 1);
                  if (tomorrowTime < now) {
                    tomorrowTime.setDate(tomorrowTime.getDate() + 1);
                  }
                  actualArrivalTime = tomorrowTime;
                } else {
                  actualArrivalTime = arrivalTime;
                }

                const timeDiff = actualArrivalTime.getTime() - now.getTime();
                // 3時間を超える到着はスキップ
                if (timeDiff < 0 || timeDiff > THREE_HOURS_MS) {
                  return;
                }
              }
            }
            // trip_headsignから実際の路線番号を取得
            const routeNumber = extractRouteNumber(arrival.trip_headsign);
            if (!routeNumber) {
              console.warn(
                "Map3D: Could not extract route number from trip_headsign:",
                arrival.trip_headsign
              );
              return;
            }

            // route_idとroute_numberのマッピングを保存（最初に見つかったものを使用）
            if (arrival.route_id && !routeIdMap[routeNumber]) {
              routeIdMap[routeNumber] = arrival.route_id;
            }

            // 遅延予測がある場合は計算、nullの場合はバス番号だけ表示するためnullとして保存
            if (
              arrival.predicted_delay_seconds !== null &&
              arrival.predicted_delay_seconds !== undefined
            ) {
              const delayMinutes = Math.max(
                0,
                Math.round(arrival.predicted_delay_seconds / 60)
              ); // 秒を分に変換、負の値は0として扱う

              // 同じルートの複数の予測がある場合は平均を取る
              // ただし、既にnullが設定されている場合は、有効な予測値で上書きする
              if (routeDelayData[routeNumber] !== undefined && routeDelayData[routeNumber] !== null) {
                routeDelayData[routeNumber] = Math.round(
                  (routeDelayData[routeNumber]! + delayMinutes) / 2
                );
              } else {
                routeDelayData[routeNumber] = delayMinutes;
              }
            } else {
              // 遅延予測がnullの場合は、バス番号だけ表示するためnullとして保存
              // ただし、既に有効な予測値が設定されている場合は、nullで上書きしない
              if (routeDelayData[routeNumber] === undefined) {
                routeDelayData[routeNumber] = null;
              }
              // 既にnullが設定されている場合は何もしない（そのままnullを維持）
            }
          });

          // route_idマッピングを保存
          setRouteIdMapping(routeIdMap);

          console.log("Map3D: Route delay data:", routeDelayData);
          console.log("Map3D: Selected stop ID:", selectedStopId);

          // 選択されたバス停のルート情報のみを設定（以前のバス停のルート情報はクリア）
          setRouteDelays(routeDelayData);
          console.log(
            "Map3D: Updated route delays (replaced):",
            routeDelayData
          );
        }
      } catch (error) {
        console.error("Map3D: Error fetching stop predictions:", error);
      }
    };

    fetchStopPredictions();
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
        data: "/data/stops.geojson",
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
          "circle-opacity": 0.9,
        },
      });
    }

    // クラスター数表示レイヤー
    if (!map.getLayer("bus-stops-count")) {
      map.addLayer({
        id: "bus-stops-count",
        type: "symbol",
        source: "bus-stops",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 14,
        },
        paint: {
          "text-color": [
            "step",
            ["get", "point_count"],
            "#ffffff", // 100未満: 水色背景 → 白文字
            100,
            "#1f2937", // 100-750: 黄色背景 → 黒文字（コントラスト向上）
            750,
            "#ffffff", // 750以上: ピンク背景 → 白文字
          ],
        },
      });
    }

    // 個別バス停レイヤー（ホバー効果用の背景・クリック領域拡大）
    if (!map.getLayer("bus-stops-unclustered-bg")) {
      map.addLayer({
        id: "bus-stops-unclustered-bg",
        type: "circle",
        source: "bus-stops",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "rgba(255, 255, 255, 0.0)",
          "circle-radius": [
            "case",
            ["==", ["get", "stop_id"], selectedStopId || ""],
            16, // 選択されたバス停は大きめ
            12, // 通常のバス停
          ],
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
          "circle-radius": [
            "case",
            ["==", ["get", "stop_id"], selectedStopId || ""],
            10, // 選択されたバス停は大きく
            6, // 通常のバス停
          ],
          "circle-stroke-width": [
            "case",
            ["==", ["get", "stop_id"], selectedStopId || ""],
            3, // 選択されたバス停は太め
            2, // 通常のバス停
          ],
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

    // 個別バス停のクリックイベント（背景レイヤーにも設定してクリック領域を拡大）
    const handleBusStopClick = (e: any) => {
      console.log("Map3D: Bus stop clicked!", e);
      // イベントの伝播を停止
      e.preventDefault();

      // クリック位置から最も近いバス停を取得
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["bus-stops-unclustered", "bus-stops-unclustered-bg"],
      });

      if (features && features.length > 0) {
        // メインレイヤーのフィーチャーを優先
        const feature = features.find((f) => f.layer?.id === "bus-stops-unclustered") || features[0];
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

            // 外部のハンドラーを優先して使用（URL更新のため）
            const stopId = properties.stop_id;

            if (externalSetSelectedStop) {
              externalSetSelectedStop(selectedStopData);
            } else {
              setSelectedStop(selectedStopData);
            }

            if (externalSetSelectedStopId) {
              externalSetSelectedStopId(stopId);
            } else {
              setSelectedStopId(stopId);
            }

            // パネルを開く（外部と内部の両方を更新）
            if (externalSetIsPanelOpen) {
              externalSetIsPanelOpen(true);
            }
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
    };

    // 両方のレイヤーにクリックイベントを設定
    map.on("click", "bus-stops-unclustered", handleBusStopClick);
    if (map.getLayer("bus-stops-unclustered-bg")) {
      map.on("click", "bus-stops-unclustered-bg", handleBusStopClick);
    }

    // カーソルスタイルの変更
    map.on("mouseenter", "bus-stops-clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "bus-stops-clusters", () => {
      map.getCanvas().style.cursor = "";
    });

    // ホバーイベント（特定のマーカーのみをハイライト）
    map.on("mouseenter", "bus-stops-unclustered", (e) => {
      map.getCanvas().style.cursor = "pointer";
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const stopId = feature.properties?.stop_id;
        if (stopId) {
          hoveredStopIdRef.current = stopId;
          // ホバー中のマーカーのみ背景を表示
          if (map.getLayer("bus-stops-unclustered-bg")) {
            map.setPaintProperty(
              "bus-stops-unclustered-bg",
              "circle-color",
              [
                "case",
                ["==", ["get", "stop_id"], stopId],
                "rgba(255, 255, 255, 0.4)",
                "rgba(255, 255, 255, 0.0)",
              ]
            );
          }
        }
      }
    });

    if (map.getLayer("bus-stops-unclustered-bg")) {
      map.on("mouseenter", "bus-stops-unclustered-bg", (e) => {
        map.getCanvas().style.cursor = "pointer";
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const stopId = feature.properties?.stop_id;
          if (stopId) {
            hoveredStopIdRef.current = stopId;
            // ホバー中のマーカーのみ背景を表示
            map.setPaintProperty(
              "bus-stops-unclustered-bg",
              "circle-color",
              [
                "case",
                ["==", ["get", "stop_id"], stopId],
                "rgba(255, 255, 255, 0.4)",
                "rgba(255, 255, 255, 0.0)",
              ]
            );
          }
        }
      });
    }

    map.on("mouseleave", "bus-stops-unclustered", () => {
      map.getCanvas().style.cursor = "";
      hoveredStopIdRef.current = null;
      // ホバー終了時に背景を非表示
      if (map.getLayer("bus-stops-unclustered-bg")) {
        map.setPaintProperty(
          "bus-stops-unclustered-bg",
          "circle-color",
          "rgba(255, 255, 255, 0.0)"
        );
      }
    });

    if (map.getLayer("bus-stops-unclustered-bg")) {
      map.on("mouseleave", "bus-stops-unclustered-bg", () => {
        map.getCanvas().style.cursor = "";
        hoveredStopIdRef.current = null;
        // ホバー終了時に背景を非表示
        map.setPaintProperty(
          "bus-stops-unclustered-bg",
          "circle-color",
          "rgba(255, 255, 255, 0.0)"
        );
      });
    }

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

  // 選択されたバス停IDが変更された時にレイヤーを更新
  useEffect(() => {
    if (
      mapRef.current &&
      mapRef.current.getLayer &&
      mapRef.current.getLayer("bus-stops-unclustered")
    ) {
      // マーカーの色を更新
      mapRef.current.setPaintProperty("bus-stops-unclustered", "circle-color", [
        "case",
        ["==", ["get", "stop_id"], selectedStopId || ""],
        "#ef4444", // 赤色（選択されたバス停）
        "#3b82f6", // 青色（通常のバス停）
      ]);
      // マーカーのサイズを更新
      mapRef.current.setPaintProperty("bus-stops-unclustered", "circle-radius", [
        "case",
        ["==", ["get", "stop_id"], selectedStopId || ""],
        10, // 選択されたバス停は大きく
        6, // 通常のバス停
      ]);
      // ストロークの太さを更新
      mapRef.current.setPaintProperty("bus-stops-unclustered", "circle-stroke-width", [
        "case",
        ["==", ["get", "stop_id"], selectedStopId || ""],
        3, // 選択されたバス停は太め
        2, // 通常のバス停
      ]);
      // 背景レイヤーのサイズを更新
      if (mapRef.current.getLayer("bus-stops-unclustered-bg")) {
        mapRef.current.setPaintProperty("bus-stops-unclustered-bg", "circle-radius", [
          "case",
          ["==", ["get", "stop_id"], selectedStopId || ""],
          16, // 選択されたバス停は大きめ
          12, // 通常のバス停
        ]);
      }
    }
  }, [selectedStopId]);

  return (
    <div className="relative h-full w-full flex flex-col md:block">
      {/* 左側のコントロールパネル */}
      <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto z-10 flex flex-col gap-3">
        {/* ロゴと検索バー */}
        <div className="w-full md:w-80">
          <div className="flex items-center gap-3">
            {/* ロゴ */}
            <button
              onClick={onMapToggle}
              className="flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer relative"
              aria-label={is3DMode ? "Switch to 2D view" : "Switch to 3D view"}
              title={is3DMode ? "Switch to 2D view" : "Switch to 3D view"}
            >
              <div className="relative">
                <svg
                  className="h-[40px] w-auto relative z-10"
                  viewBox="0 0 907 1000"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ aspectRatio: "907/1000" }}
                >
              <defs>
                <linearGradient id="logoGradient3D" x1="-369.066" y1="39.6431" x2="1084.85" y2="933.776" gradientUnits="userSpaceOnUse">
                  <stop offset="0.254808" stopColor="#FF6B00" />
                  <stop offset="0.538462" stopColor="#D9D9D9" />
                  <stop offset="0.850962" stopColor="#266AD1" />
                </linearGradient>
                {/* ロゴの形状に合わせたクリップパス */}
                <clipPath id="logoClip3D">
                  <path d="M0 308.882C0.000134738 265.214 23.2974 224.863 61.1152 203.029L383.92 16.6568L384.808 16.149C422.169 -5.00845 467.902 -5.00786 505.263 16.15L506.15 16.6578L845.388 212.519C883.205 234.353 906.502 274.705 906.502 318.373V691.117C906.502 734.785 883.205 775.136 845.388 796.97L522.582 983.342C484.764 1005.18 438.17 1005.18 400.352 983.341L61.1143 787.48C23.2968 765.646 0.000145072 725.295 0 681.626V308.882Z" />
                </clipPath>
                {/* 光沢用のグラデーション */}
                <linearGradient
                  id="shineGradient3D"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="transparent" stopOpacity="0" />
                  <stop offset="50%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* 内側の六角形 */}
              <path
                d="M421.43 81.6275C436.037 73.1944 454.033 73.1945 468.639 81.6276L807.877 277.489C822.483 285.922 831.481 301.507 831.481 318.373V691.116C831.481 707.982 822.483 723.567 807.877 732L485.072 918.371C470.465 926.804 452.469 926.804 437.863 918.371L98.6255 722.51C84.0193 714.077 75.0215 698.492 75.0215 681.626V308.883C75.0215 292.017 84.0194 276.432 98.6257 267.999L421.43 81.6275Z"
                fill="#181A1E"
              />
              {/* 外側の六角形の枠（グラデーション） */}
              <path
                d="M0 308.882C0.000134738 265.214 23.2974 224.863 61.1152 203.029L383.92 16.6568L384.808 16.149C422.169 -5.00845 467.902 -5.00786 505.263 16.15L506.15 16.6578L845.388 212.519C883.205 234.353 906.502 274.705 906.502 318.373V691.117C906.502 734.785 883.205 775.136 845.388 796.97L522.582 983.342C484.764 1005.18 438.17 1005.18 400.352 983.341L61.1143 787.48C23.2968 765.646 0.000145072 725.295 0 681.626V308.882ZM75.0215 681.626C75.0216 698.492 84.0192 714.076 98.625 722.509L437.863 918.372C452.241 926.673 469.904 926.802 484.385 918.76L485.071 918.372L807.877 732C822.255 723.698 831.199 708.467 831.475 691.906L831.48 691.117V318.373C831.48 301.771 822.762 286.41 808.558 277.89L807.877 277.49L468.639 81.6275C454.032 73.1947 436.037 73.1947 421.431 81.6275L98.626 267.999C84.0197 276.431 75.0216 292.017 75.0215 308.882V681.626Z"
                fill="url(#logoGradient3D)"
              />
              {/* ディスプレイ要素 */}
              <path
                d="M495.069 475.942C495.012 474.214 495.95 472.607 497.482 471.807L781.613 323.518C784.607 321.956 788.19 324.128 788.19 327.504V537.024C788.19 538.684 787.275 540.209 785.811 540.991L508.597 688.988C505.659 690.557 502.096 688.499 501.986 685.171L495.069 475.942Z"
                fill="#D9D9D9"
              />
              <path
                d="M499.562 475.793L506.479 685.022L783.693 537.024V327.504L499.562 475.793ZM788.189 537.024L788.179 537.334C788.073 538.871 787.184 540.257 785.811 540.99L508.597 688.988C505.751 690.507 502.317 688.623 502.006 685.478L501.985 685.171L495.069 475.941C495.016 474.322 495.837 472.808 497.202 471.967L497.482 471.806L781.613 323.518C784.607 321.956 788.189 324.127 788.189 327.504V537.024Z"
                fill="white"
              />
              {/* ボタン要素 */}
              <path
                d="M577.018 780.891C575.748 807.015 562.494 827.598 547.413 826.866C532.333 826.133 521.136 804.361 522.406 778.237C523.675 752.113 536.929 731.53 552.01 732.262C567.09 732.995 578.287 754.767 577.018 780.891Z"
                fill="#D9D9D9"
              />
              <path
                d="M572.527 780.672C573.13 768.255 570.751 757.091 566.647 749.111C562.48 741.009 557.048 737.008 551.791 736.753C546.535 736.498 540.741 739.953 535.809 747.612C530.951 755.157 527.5 766.038 526.896 778.455C526.293 790.873 528.673 802.037 532.777 810.017C536.943 818.119 542.375 822.119 547.631 822.375L547.413 826.865C532.332 826.132 521.136 804.361 522.406 778.237C523.675 752.113 536.929 731.53 552.009 732.262C567.09 732.995 578.287 754.767 577.018 780.891L576.95 782.111C575.334 807.653 562.258 827.587 547.413 826.865L547.631 822.375C552.888 822.63 558.682 819.176 563.614 811.515C568.473 803.971 571.924 793.09 572.527 780.672Z"
                fill="white"
              />
              <path
                d="M787.401 664.381C786.279 687.487 774.555 705.694 761.216 705.046C747.878 704.397 737.974 685.14 739.097 662.034C740.22 638.927 751.943 620.721 765.282 621.369C778.621 622.017 788.524 641.274 787.401 664.381Z"
                fill="#D9D9D9"
              />
              <path
                d="M782.911 664.162C783.441 653.253 781.347 643.473 777.766 636.509C774.122 629.423 769.449 626.073 765.064 625.86C760.678 625.647 755.703 628.528 751.389 635.228C747.149 641.811 744.118 651.343 743.588 662.252C743.058 673.161 745.151 682.941 748.732 689.905C752.376 696.991 757.049 700.342 761.435 700.555L761.216 705.046C747.878 704.397 737.974 685.14 739.097 662.034C740.22 638.927 751.943 620.721 765.282 621.369C778.621 622.017 788.524 641.274 787.401 664.381C786.279 687.487 774.555 705.694 761.216 705.046L761.435 700.555C765.82 700.768 770.796 697.886 775.11 691.187C779.349 684.603 782.381 675.071 782.911 664.162Z"
                  fill="white"
                />
                {/* ロゴ内の光沢アニメーション */}
                {showLogoShine && (
                  <rect
                    x="0"
                    y="0"
                    width="907"
                    height="1000"
                    fill="url(#shineGradient3D)"
                    clipPath="url(#logoClip3D)"
                    style={{
                      animation: "logoShine 6s ease-in-out",
                    }}
                  />
                )}
                </svg>
              </div>
            </button>
        {/* 検索バー */}
            <div className="flex-1 min-w-0">
          <GoogleMapsSearchBar
            onSearch={handleSearch}
            onSearchStart={handleSearchStart}
            onSearchEnd={handleSearchEnd}
            placeholder="Search places (e.g., Downtown, Richmond)"
          />
            </div>
          </div>
        </div>

        {/* 地域選択パネル */}
        {!isSearching && (
          <RegionSelector
            regions={regions}
            selectedRegion={selectedRegion}
            onRegionSelect={handleRegionSelect}
            isPanelOpen={isPanelOpen}
            regionDelays={regionDelays}
            getDelaySymbol={getDelaySymbol}
            getDelayLevelName={getDelayLevelName}
          />
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
          onRemovePin={(stopId) => {
            const newPinnedStops = new Set(pinnedStops);
            newPinnedStops.delete(stopId);
            const newPinnedData = { ...pinnedStopsData };
            delete newPinnedData[stopId];
            setPinnedStops(newPinnedStops);
            setPinnedStopsData(newPinnedData);
          }}
          isVisible={true}
          onToggleVisibility={() => {}}
          onMapToggle={onMapToggle}
          is3DMode={is3DMode}
        />
      </div>

      {/* メインマップ */}
      <div
        ref={ref}
        className="h-full w-full"
        style={{ minHeight: "100%", height: "100%" }}
      />

      {/* 右下のコントロール */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <GoogleMapsControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onMyLocation={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  setUserLocation([longitude, latitude]);
                  if (mapRef.current) {
                    mapRef.current.flyTo({
                      center: [longitude, latitude],
                      zoom: 15,
                    });
                  }
                },
                (error) => {
                  console.error("Error getting location:", error);
                }
              );
            }
          }}
          onLayerToggle={() => setShowLayers(!showLayers)}
          onStreetView={() => {}}
          showLayers={showLayers}
        />
      </div>

      {/* ロゴ光沢アニメーション用のスタイル */}
      <style jsx global>{`
        @keyframes logoShine {
          0% {
            transform: translateX(-100%) translateY(-100%);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          30% {
            opacity: 1;
          }
          50% {
            transform: translateX(100%) translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(100%) translateY(100%);
            opacity: 0;
          }
        }
      `}</style>

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
            isVisible={showLayers}
          />
        </div>
      )}

      {/* バス停詳細パネル */}
      {(isPanelOpen || externalIsPanelOpen) &&
        (selectedStop || externalSelectedStop) && (
        <BusStopDetailPanel
            isOpen={isPanelOpen || externalIsPanelOpen || false}
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
            selectedStop={selectedStop || externalSelectedStop}
          regionDelays={regionDelays}
          stopDelays={stopDelays}
          routeDelays={routeDelays}
          routeIdMapping={routeIdMapping}
            selectedStopId={selectedStopId || externalSelectedStopId || null}
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

      {/* Map Markers */}
      <MapMarkers
        map={mapRef.current}
        userLocation={userLocation}
        animationFrameRef={animationFrameRef}
      />
    </div>
  );
}
