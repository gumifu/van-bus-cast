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
}: Map3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const animationFrameRef = useRef<number | null>(null);

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
  const [routeDelays, setRouteDelays] = useState<{ [key: string]: number }>({});
  const [routeIdMapping, setRouteIdMapping] = useState<{
    [routeNumber: string]: string;
  }>({}); // 路線番号 -> route_id（GTFS内部ID）
  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    externalSelectedStopId || null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
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

      if (data.regions && Array.isArray(data.regions)) {
        data.regions.forEach((region: any) => {
          const regionId = region.region_id;
          // region_idを変換（例: "vancouver_city" → "vancouver"）
          const simplifiedId = regionId.split("_")[0];
          // 小数点を丸める（負の値も保持：マイナスは「早く来ている」を意味する）
          const delayMinutes = region.avg_delay_minutes
            ? Math.round(region.avg_delay_minutes)
            : 0;
          regionDelayData[simplifiedId] = delayMinutes;

          // 地域リストに追加
          if (region.center_lat && region.center_lon) {
            regionList.push({
              id: simplifiedId,
              name: region.region_name || formatRegionName(simplifiedId),
              center: [region.center_lon, region.center_lat],
              zoom: 12,
            });
          }
        });
      }

      setRegionDelays(regionDelayData);

      // 地域リストを設定（APIから取得したデータがあればそれを使用、なければデフォルト）
      if (regionList.length > 0) {
        setRegions(regionList);
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
          console.error("Map3D: Error getting location:", error);
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
    if (normalizedDelay === 0) return "☀️";
    if (normalizedDelay < 0) return "⭐"; // 早く来ている（良い状態）
    if (normalizedDelay <= 2) return "⛅";
    if (normalizedDelay <= 5) return "☁️";
    return "🌧️";
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

    if (!ref.current) {
      console.error("Map3D: Map container not available");
      return;
    }

    const map = new mapboxgl.Map({
      container: ref.current!,
      style: "mapbox://styles/mapbox/dark-v11", // 黒いダークスタイル
      center: initialCenter || VANCOUVER,
      zoom: initialZoom || 16, // 3D表示に適した初期ズームレベル
      pitch: 45, // 初期ピッチを3D効果のある角度に
      bearing: 0,
      antialias: true, // アンチエイリアスを有効化
    });

    mapRef.current = map;
    console.log("Map3D: Map created");

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
                "Map3D: Could not extract route number from trip_headsign:",
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
          "circle-radius": 4,
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
            if (externalSetSelectedStop) {
              externalSetSelectedStop(selectedStopData);
            }
            setSelectedStopId(properties.stop_id);
            if (externalSetSelectedStopId) {
              externalSetSelectedStopId(properties.stop_id);
            }
            setIsPanelOpen(true);
            if (externalSetIsPanelOpen) {
              externalSetIsPanelOpen(true);
            }

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
        />
      </div>

      {/* メインマップ */}
      <div ref={ref} className="h-full w-full" />

      {/* 右下のコントロール */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <GoogleMapsControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
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
            isVisible={showLayers}
          />
        </div>
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
          routeIdMapping={routeIdMapping}
          selectedStopId={selectedStopId}
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
