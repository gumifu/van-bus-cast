"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const VANCOUVER: [number, number] = [-123.1207, 49.2827];

// バス停データの型定義
interface BusStop {
  StopNo: number;
  Name: string;
  BayNo: string;
  City: string;
  OnStreet: string;
  AtStreet: string;
  Latitude: number;
  Longitude: number;
  WheelchairAccess: number;
  Distance: number;
  Routes: string;
}

export default function BusStopMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(false);

  // バス停データを取得する関数
  const fetchBusStops = async (
    lat: number,
    lng: number,
    radius: number = 1000
  ) => {
    setLoading(true);
    try {
      // TransLink GTFS APIを使用してバス停データを取得
      const apiKey = process.env.NEXT_PUBLIC_TRANSLINK_API_KEY;
      if (!apiKey) {
        throw new Error("TransLink API key not found");
      }

      const response = await fetch(
        `https://api.translink.ca/gtfs/v1/stops?apikey=${apiKey}&lat=${lat}&long=${lng}&radius=${radius}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bus stops");
      }

      const data = await response.json();
      setBusStops(data);
    } catch (error) {
      console.error("Error fetching bus stops:", error);
      // デモ用のサンプルデータ
      setBusStops([
        {
          StopNo: 50001,
          Name: "Burrard Station",
          BayNo: "1",
          City: "Vancouver",
          OnStreet: "Burrard Street",
          AtStreet: "Dunsmuir Street",
          Latitude: 49.2856,
          Longitude: -123.1207,
          WheelchairAccess: 1,
          Distance: 0,
          Routes: "3, 4, 7, 8, 10, 14, 16, 17, 19, 22, 50, 99",
        },
        {
          StopNo: 50002,
          Name: "Waterfront Station",
          BayNo: "1",
          City: "Vancouver",
          OnStreet: "Cordova Street",
          AtStreet: "Granville Street",
          Latitude: 49.2861,
          Longitude: -123.1116,
          WheelchairAccess: 1,
          Distance: 0,
          Routes: "4, 7, 10, 14, 16, 17, 19, 22, 50, 99",
        },
        {
          StopNo: 50003,
          Name: "Granville Station",
          BayNo: "1",
          City: "Vancouver",
          OnStreet: "Granville Street",
          AtStreet: "Dunsmuir Street",
          Latitude: 49.2827,
          Longitude: -123.1162,
          WheelchairAccess: 1,
          Distance: 0,
          Routes: "3, 4, 7, 8, 10, 14, 16, 17, 19, 22, 50, 99",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // マップにバス停マーカーを追加する関数
  const addBusStopMarkers = (map: Map, stops: BusStop[]) => {
    // 既存のマーカーを削除
    const existingMarkers = document.querySelectorAll(".bus-stop-marker");
    existingMarkers.forEach((marker) => marker.remove());

    stops.forEach((stop) => {
      // バス停マーカーを作成
      const el = document.createElement("div");
      el.className = "bus-stop-marker";
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#60a5fa";
      el.style.border = "2px solid #1f2937";
      el.style.cursor = "pointer";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      // マーカーをクリックしたときの処理
      el.addEventListener("click", () => {
        new mapboxgl.Popup({
          offset: 25,
          className: "bus-stop-popup",
        })
          .setLngLat([stop.Longitude, stop.Latitude])
          .setHTML(
            `
              <div style="padding: 12px; background: #1f2937; color: white; border-radius: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #60a5fa;">${stop.Name}</h3>
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #9ca3af;">Stop #${stop.StopNo}</p>
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #e5e7eb;">${stop.OnStreet} at ${stop.AtStreet}</p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">Routes: ${stop.Routes}</p>
              </div>
              `
          )
          .addTo(map);
      });

      // マーカーをマップに追加
      new mapboxgl.Marker(el)
        .setLngLat([stop.Longitude, stop.Latitude])
        .addTo(map);
    });
  };

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      "pk.eyJ1IjoiZ3VtaWZ1IiwiYSI6ImNtZzF3dmV4NzAxamIya3BvZHdlZnZnZDAifQ.J4DJAlB51QlM6aK7ihx70w";

    if (!token) {
      console.error("Mapbox token is missing");
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: ref.current!,
      style: "mapbox://styles/mapbox/dark-v11",
      center: VANCOUVER,
      zoom: 13,
      hash: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");
    map.addControl(new mapboxgl.FullscreenControl(), "top-left");

    // マップが読み込まれた後にバス停データを取得
    map.on("load", () => {
      fetchBusStops(VANCOUVER[1], VANCOUVER[0]);
    });

    mapRef.current = map;
    return () => map.remove();
  }, []);

  // バス停データが更新されたときにマーカーを追加
  useEffect(() => {
    if (mapRef.current && busStops.length > 0) {
      addBusStopMarkers(mapRef.current, busStops);
    }
  }, [busStops]);

  return (
    <div className="h-full w-full relative">
      <div ref={ref} className="h-full w-full" />
      {loading && (
        <div className="absolute top-4 left-4 bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <span className="text-sm text-gray-200">バス停を読み込み中...</span>
          </div>
        </div>
      )}
      <div className="absolute top-4 right-4 bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
        <button
          onClick={() => fetchBusStops(VANCOUVER[1], VANCOUVER[0])}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
        >
          バス停を更新
        </button>
      </div>
    </div>
  );
}
