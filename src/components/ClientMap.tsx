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
  const [pinnedMarkers, setPinnedMarkers] = useState<mapboxgl.Marker[]>([]);
  const [pinnedStopsData, setPinnedStopsData] = useState<{
    [key: string]: any;
  }>({});
  const [isPinnedPanelVisible, setIsPinnedPanelVisible] = useState(false);

  // 路線表示機能の状態
  const [showRoutes, setShowRoutes] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [routeIndex, setRouteIndex] = useState<any[]>([]);

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
      const savedPins = localStorage.getItem("pinnedBusStops");
      if (savedPins) {
        const pinsData = JSON.parse(savedPins);
        const pinnedSet = new Set<string>(pinsData.stopIds);
        const pinnedDataMap = pinsData.stopsData || {};

        setPinnedStops(pinnedSet);
        setPinnedStopsData(pinnedDataMap);

        // 保存されたピンマーカーを復元
        pinsData.stopsData.forEach((stopData: any) => {
          addPinnedMarker(stopData.stopId, stopData);
        });
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

  // 路線インデックスを読み込み
  const loadRouteIndex = async () => {
    try {
      const response = await fetch("/data/routes_by_shape_index.json");
      const data = await response.json();
      console.log("Raw route index data:", data);
      console.log(
        "Route index type:",
        typeof data,
        "Is array:",
        Array.isArray(data)
      );
      setRouteIndex(data);
      console.log("Route index loaded:", data.length, "routes");
      return data;
    } catch (error) {
      console.error("Error loading route index:", error);
      return null;
    }
  };

  // 特定の路線データを読み込み
  const loadRouteData = async (shapeIds: number[]) => {
    try {
      const routePromises = shapeIds.map(async (shapeId) => {
        try {
          const response = await fetch(
            `/data/routes_by_shape/${shapeId}.geojson`
          );
          if (!response.ok) {
            console.warn(`Failed to load route ${shapeId}: ${response.status}`);
            return null;
          }
          const json = await response.json();
          // 返却形式がFeatureCollectionの場合はfeatures配列を返す
          if (
            json &&
            json.type === "FeatureCollection" &&
            Array.isArray(json.features)
          ) {
            return json.features;
          }
          // 返却形式が単一Featureの場合
          if (json && json.type === "Feature") {
            return [json];
          }
          return null;
        } catch (error) {
          console.warn(`Error loading route ${shapeId}:`, error);
          return null;
        }
      });

      const routesNested = await Promise.all(routePromises);
      const features: any[] = [];
      routesNested.forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((f) => features.push(f));
        }
      });
      console.log(`Loaded ${features.length} route features after flattening`);
      return features;
    } catch (error) {
      console.error("Error loading route data:", error);
      return [];
    }
  };

  // バス停の近くを通る路線を取得（インデックスベース）
  const getNearbyRoutes = async (
    stopCoordinates: [number, number],
    radiusKm: number = 2.0
  ) => {
    console.log("getNearbyRoutes called with routeIndex:", routeIndex);
    console.log(
      "routeIndex type:",
      typeof routeIndex,
      "Is array:",
      Array.isArray(routeIndex)
    );
    console.log("routeIndex length:", routeIndex?.length);

    if (!routeIndex || routeIndex.length === 0) {
      console.log("No route index available, using test route");
      // テスト用の路線データを作成
      const testRoute = {
        type: "Feature",
        properties: {
          shape_id: "test-route",
          route_name: "Test Route",
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [stopCoordinates[0] - 0.01, stopCoordinates[1] - 0.01],
            [stopCoordinates[0] + 0.01, stopCoordinates[1] + 0.01],
          ],
        },
      };
      return [testRoute];
    }

    const [stopLng, stopLat] = stopCoordinates;
    const nearbyShapeIds: number[] = [];

    console.log(`Searching for routes near stop: ${stopLat}, ${stopLng}`);
    console.log(`Total routes to check: ${routeIndex.length}`);

    // インデックスから近くの路線を検索
    routeIndex.forEach((routeInfo: any) => {
      const bbox = routeInfo.bbox;
      const [minLng, minLat, maxLng, maxLat] = bbox;

      // バウンディングボックス内かチェック
      if (
        stopLng >= minLng &&
        stopLng <= maxLng &&
        stopLat >= minLat &&
        stopLat <= maxLat
      ) {
        nearbyShapeIds.push(routeInfo.shape_id);
      }
    });

    console.log(`Found ${nearbyShapeIds.length} nearby routes by bbox`);

    // 近くの路線データを読み込み
    if (nearbyShapeIds.length > 0) {
      const routes = await loadRouteData(nearbyShapeIds);
      return routes;
    }

    return [];
  };

  // 距離計算関数（ハヴァサイン公式）
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371000; // 地球の半径（メートル）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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

    const coordinates = stopData.geometry.coordinates;

    // バス停詳細パネルを開く
    setSelectedStop({
      properties: stopData.properties,
      geometry: stopData.geometry,
    });
    setIsPanelOpen(true);
    setSelectedStopId(stopData.properties?.stop_id || null);
    setDelayLevel(Math.floor(Math.random() * 5));

    // マップをクリックしたバス停に移動
    mapRef.current.flyTo({
      center: coordinates,
      zoom: 18,
      essential: true,
    });

    // 近くの路線を表示
    getNearbyRoutes(coordinates)
      .then((nearbyRoutes) => {
        if (nearbyRoutes.length > 0) {
          addRouteLayer(nearbyRoutes);
          setShowRoutes(true);
        }
      })
      .catch((error) => {
        console.error("Error getting nearby routes:", error);
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
    if (!mapRef.current) return;

    const coordinates = stopData.geometry.coordinates;

    // ピン留めマーカーのHTML要素を作成（モノトーン）
    const el = document.createElement("div");
    el.className = "pinned-marker";
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = "#6b7280"; // グレー色（モノトーン）
    el.style.border = "2px solid white";
    el.style.cursor = "pointer";
    el.style.position = "relative";
    el.style.zIndex = "1001";
    el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

    // ピンアイコンを追加（モノトーン）
    el.innerHTML = "📍";
    el.style.fontSize = "10px";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";

    // マーカーを作成して地図に追加
    const marker = new mapboxgl.Marker(el)
      .setLngLat(coordinates)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
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
        `)
      )
      .addTo(mapRef.current);

    setPinnedMarkers((prev) => [...prev, marker]);
  };

  const removePinnedMarker = (stopId: string) => {
    setPinnedMarkers((prev) => {
      const markerToRemove = prev.find((marker) => {
        const popup = marker.getPopup();
        const content = popup?.getElement()?.innerHTML;
        return content?.includes(stopId);
      });

      if (markerToRemove) {
        markerToRemove.remove();
        return prev.filter((marker) => marker !== markerToRemove);
      }

      return prev;
    });
  };

  // 路線レイヤーを追加
  const addRouteLayer = (routes: any[]) => {
    if (!mapRef.current) {
      console.log("Map not available");
      return;
    }

    if (routes.length === 0) {
      console.log("No routes to display");
      return;
    }

    console.log(`Adding ${routes.length} route lines to map`);

    // 既存の路線レイヤーを削除
    removeRouteLayer();

    // 路線データをGeoJSON形式に変換
    const routeGeoJSON = {
      type: "FeatureCollection" as const,
      features: routes
        .filter(
          (feature: any) =>
            feature &&
            feature.geometry &&
            feature.geometry.type === "LineString"
        )
        .map((feature: any, index: number) => ({
          type: "Feature" as const,
          properties: {
            shape_id: feature.properties?.shape_id || `route-${index}`,
            route_index: index,
            color: getStableColorByShapeId(feature.properties?.shape_id, index),
            route_name: getRouteNameFromShapeId(
              feature.properties?.shape_id,
              index
            ),
          },
          geometry: feature.geometry,
        })),
    };

    console.log("Route GeoJSON created:", routeGeoJSON);
    console.log("Number of features:", routeGeoJSON.features.length);
    console.log("First feature sample:", routeGeoJSON.features[0]);

    // 路線の座標を確認
    if (routeGeoJSON.features.length > 0) {
      const firstFeature = routeGeoJSON.features[0];
      console.log("First feature geometry:", firstFeature.geometry);
      console.log(
        "First feature coordinates:",
        firstFeature.geometry?.coordinates
      );
      console.log(
        "Number of coordinates in first feature:",
        firstFeature.geometry?.coordinates?.length
      );

      // 座標の範囲を確認
      if (firstFeature.geometry?.coordinates?.length > 0) {
        const coords = firstFeature.geometry.coordinates;
        const lngs = coords.map((coord) => coord[0]);
        const lats = coords.map((coord) => coord[1]);
        console.log(
          "Longitude range:",
          Math.min(...lngs),
          "to",
          Math.max(...lngs)
        );
        console.log(
          "Latitude range:",
          Math.min(...lats),
          "to",
          Math.max(...lats)
        );
      }
    }

    try {
      // 地図のスタイルが読み込まれているかチェック
      if (!mapRef.current.isStyleLoaded()) {
        console.log("Map style not loaded, waiting...");
        mapRef.current.on("style.load", () => {
          addRouteLayerToMap(routeGeoJSON, routes);
        });
        return;
      }

      addRouteLayerToMap(routeGeoJSON, routes);
    } catch (error) {
      console.error("Error adding route layer:", error);
    }
  };

  const addRouteLayerToMap = (routeGeoJSON: any, routes: any[]) => {
    try {
      // 路線ソースを追加
      mapRef.current.addSource("routes", {
        type: "geojson",
        data: routeGeoJSON,
      });

      // 路線レイヤーを追加（色は各Featureのproperties.color、なければshape_idで安定ハッシュ）
      mapRef.current.addLayer({
        id: "routes",
        type: "line",
        source: "routes",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          // 各Featureに埋め込んだ色を使用
          "line-color": ["get", "color"],
          // ズームに応じて線幅を変更
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            1.5,
            12,
            3,
            14,
            5,
            16,
            8,
          ],
          "line-opacity": 0.95,
        },
      }); // 最前面に挿入

      // 路線ラベルレイヤーを追加
      mapRef.current.addLayer({
        id: "route-labels",
        type: "symbol",
        source: "routes",
        layout: {
          "text-field": ["get", "route_name"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            10,
            12,
            12,
            14,
            14,
            16,
            16,
          ],
          "text-offset": [0, 1.5],
          "text-anchor": "center",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 2,
          "text-halo-blur": 1,
        },
      });

      console.log(`Successfully added ${routes.length} route lines`);
      console.log("Route layer added to map");

      // 地図を強制的に再描画
      mapRef.current.triggerRepaint();

      // レイヤーが正しく追加されたかチェック
      const layerExists = mapRef.current.getLayer("routes");
      console.log("Route layer exists:", !!layerExists);
      if (layerExists) {
        console.log("Route layer details:", layerExists);
      }

      // ソースが正しく追加されたかチェック
      const sourceExists = mapRef.current.getSource("routes");
      console.log("Route source exists:", !!sourceExists);
      if (sourceExists) {
        console.log("Route source details:", sourceExists);
        // ソースのデータを確認
        const sourceData = (sourceExists as any).serialize();
        console.log("Source data:", sourceData);
      }

      // 地図の全レイヤーを確認
      const allLayers = mapRef.current.getStyle().layers;
      console.log(
        "All map layers:",
        allLayers.map((layer) => layer.id)
      );

      // 路線レイヤーの位置を確認
      const routeLayerIndex = allLayers.findIndex(
        (layer) => layer.id === "routes"
      );
      console.log("Route layer index:", routeLayerIndex);

      // 路線レイヤーの描画設定を確認
      if (layerExists) {
        const layerPaint = mapRef.current.getPaintProperty(
          "routes",
          "line-color"
        );
        const layerWidth = mapRef.current.getPaintProperty(
          "routes",
          "line-width"
        );
        const layerOpacity = mapRef.current.getPaintProperty(
          "routes",
          "line-opacity"
        );
        console.log("Route layer paint properties:");
        console.log("- line-color:", layerPaint);
        console.log("- line-width:", layerWidth);
        console.log("- line-opacity:", layerOpacity);
      }

      // 地図の範囲を調整して路線が見えるようにする
      if (routes.length > 0) {
        const coordinates = routes
          .filter((route) => route.geometry && route.geometry.coordinates)
          .flatMap((route) => route.geometry.coordinates);

        if (coordinates.length > 0) {
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          mapRef.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 16,
          });
        }
      }
    } catch (error) {
      console.error("Error adding route layer to map:", error);
    }
  };

  // 路線レイヤーを削除
  const removeRouteLayer = () => {
    if (!mapRef.current) return;

    console.log("Removing route layer");

    if (mapRef.current.getLayer("route-labels")) {
      mapRef.current.removeLayer("route-labels");
      console.log("Route labels layer removed");
    }
    if (mapRef.current.getLayer("routes")) {
      mapRef.current.removeLayer("routes");
      console.log("Route layer removed");
    }
    if (mapRef.current.getSource("routes")) {
      mapRef.current.removeSource("routes");
      console.log("Route source removed");
    }
  };

  // 路線の色を取得
  const getRouteColor = (index: number) => {
    const colors = [
      "#3b82f6", // 青
      "#ef4444", // 赤
      "#10b981", // 緑
      "#f59e0b", // オレンジ
      "#8b5cf6", // 紫
      "#06b6d4", // シアン
      "#84cc16", // ライム
      "#f97316", // オレンジ
      "#ec4899", // ピンク
      "#6b7280", // グレー
    ];
    return colors[index % colors.length];
  };

  // shape_idから安定色を取得
  const getStableColorByShapeId = (
    shapeId: number | string | undefined,
    fallbackIndex: number
  ): string => {
    if (shapeId === undefined || shapeId === null) {
      return getRouteColor(fallbackIndex);
    }
    const numeric = Number(shapeId);
    if (Number.isFinite(numeric)) {
      return getRouteColor(Math.abs(numeric) % 10);
    }
    // 文字列の場合は簡易ハッシュ
    let hash = 0;
    const str = String(shapeId);
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return getRouteColor(hash % 10);
  };

  // shape_idから路線名を生成
  const getRouteNameFromShapeId = (
    shapeId: number | string | undefined,
    fallbackIndex: number
  ): string => {
    if (shapeId === undefined || shapeId === null) {
      return `Route ${fallbackIndex + 1}`;
    }
    const numeric = Number(shapeId);
    if (Number.isFinite(numeric)) {
      // 数字のshape_idから路線名を生成
      const routeNumber = Math.abs(numeric) % 1000;
      return `Route ${routeNumber}`;
    }
    return `Route ${String(shapeId)}`;
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
      try {
        userMarker.remove();
      } catch {}
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
    el.style.zIndex = "1002"; // 他レイヤーより前

    // マーカーを作成して地図に追加（アンカー中心、ドラッグ不可）
    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat(location)
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

      // 個別バス停のクリックイベントはuseEffectで管理

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

  // 路線インデックスが読み込まれた時のデバッグ
  useEffect(() => {
    console.log("Route index useEffect triggered, routeIndex:", routeIndex);
    console.log(
      "routeIndex type:",
      typeof routeIndex,
      "Is array:",
      Array.isArray(routeIndex)
    );
    if (routeIndex && routeIndex.length > 0) {
      console.log(
        "Route index loaded in useEffect:",
        routeIndex.length,
        "routes"
      );
    } else {
      console.log("Route index not ready in useEffect");
    }
  }, [routeIndex]);

  // コンポーネントマウント時に路線インデックスを読み込み
  useEffect(() => {
    loadRouteIndex();
  }, []);

  // バス停クリックイベントを管理（クロージャ問題を解決）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clickHandler = (
      e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }
    ) => {
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

            // ランダムな遅延レベルを設定（デモ用）
            setDelayLevel(Math.floor(Math.random() * 5));

            // 近くの路線を表示
            console.log(
              "Route index available:",
              !!routeIndex,
              "Routes:",
              routeIndex?.length
            );
            // 路線を表示（常に試行）
            getNearbyRoutes(coordinates)
              .then((nearbyRoutes) => {
                if (nearbyRoutes.length > 0) {
                  addRouteLayer(nearbyRoutes);
                  setShowRoutes(true);
                  console.log(`Found ${nearbyRoutes.length} nearby routes`);
                } else {
                  console.log("No nearby routes found");
                }
              })
              .catch((error) => {
                console.error("Error getting nearby routes:", error);
              });
          }
        }
      }
    };

    // イベントリスナーを登録
    map.on("click", "bus-stops-unclustered", clickHandler);

    // クリーンアップ関数でイベントリスナーを解除
    return () => {
      map.off("click", "bus-stops-unclustered", clickHandler);
    };
  }, [routeIndex]); // routeIndexが変更されたら再登録

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

                    // 近くの路線を表示
                    getNearbyRoutes(stop.geometry.coordinates)
                      .then((nearbyRoutes) => {
                        if (nearbyRoutes.length > 0) {
                          addRouteLayer(nearbyRoutes);
                          setShowRoutes(true);
                        }
                      })
                      .catch((error) => {
                        console.error("Error getting nearby routes:", error);
                      });
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
          // 路線を非表示にする
          removeRouteLayer();
          setShowRoutes(false);
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
