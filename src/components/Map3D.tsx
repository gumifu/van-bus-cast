"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const VANCOUVER: [number, number] = [-123.1207, 49.2827];

interface Map3DProps {
  onMapReady?: (map: Map) => void;
}

export default function Map3D({ onMapReady }: Map3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [is3DEnabled, setIs3DEnabled] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);

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
      console.log("Map3D: All layers added");
    });

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
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // 依存配列を空にして一度だけ実行

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
          "circle-color": "#888", // グレー
          "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            100,
            30,
            750,
            40,
          ],
          "circle-opacity": 0.8,
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
          "circle-color": "#fff", // 白
          "circle-radius": 6,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#333", // ダークグレー
          "circle-opacity": 0.9,
        },
      });
    }

    console.log("Map3D: Bus stops layer added");
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
    <div className="relative h-full w-full">
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

      {/* 操作説明 */}
      <div className="absolute bottom-4 right-4 z-10 bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700 max-w-xs">
        <h3 className="font-semibold text-sm mb-2">操作方法</h3>
        <div className="text-xs space-y-1 text-gray-300">
          <div>• マウスドラッグ: 地図移動</div>
          <div>• ホイール: ズーム</div>
          <div>• Shift + ドラッグ: 3D回転</div>
          <div>• Ctrl + ドラッグ: ピッチ調整</div>
        </div>
      </div>
    </div>
  );
}
