"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

const VANCOUVER: [number, number] = [-123.1207, 49.2827];

interface BusStop {
  StopNo: number;
  Name: string;
  Latitude: number;
  Longitude: number;
  Routes: string;
  Type?: string;
}

export default function ClientMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [allBusStops, setAllBusStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [userMarker, setUserMarker] = useState<mapboxgl.Marker | null>(null);

  // 全てのバス停を取得
  const fetchAllBusStops = async () => {
    setLoading(true);
    try {
      // デモデータを使用して全てのバス停を取得
      const response = await fetch(`/api/bus-stops?demo=true`);

      if (response.ok) {
        const data = await response.json();
        setBusStops(data);
        console.log("All bus stops loaded:", data.length, "stops");
        return data;
      } else {
        console.error("Failed to fetch all bus stops:", response.status);
        return [];
      }
    } catch (error) {
      console.error("Error fetching all bus stops:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 現在の位置周辺のバス停を取得
  const fetchNearbyBusStops = async (
    center: [number, number],
    radius: number = 100
  ) => {
    setLoading(true);
    try {
      const [lng, lat] = center;

      // まず実際のAPIを試行
      let response = await fetch(
        `/api/bus-stops?lat=${lat}&lng=${lng}&radius=${radius}&stations_only=true`
      );

      // APIが失敗した場合はデモデータを使用
      if (!response.ok) {
        console.log("Real API failed, trying demo data...");
        response = await fetch(`/api/bus-stops?demo=true`);
      }

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched data:", data);
        const stations = data.filter(
          (stop: any) => stop.Type && stop.Type !== "Bus"
        );
        console.log("Stations in data:", stations);
        console.log("Number of stations:", stations.length);
        setBusStops(data);
        console.log("Bus stops loaded:", data.length, "stops");
        return data;
      } else {
        console.error("Failed to fetch bus stops:", response.status);
        const errorData = await response.json();
        console.error("Error details:", errorData);
        return [];
      }
    } catch (error) {
      console.error("Error fetching bus stops:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

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
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");
    map.addControl(new mapboxgl.FullscreenControl(), "top-left");
    mapRef.current = map;

    // ユーザーの位置情報を取得
    getUserLocation();

    return () => {
      if (userMarker) {
        userMarker.remove();
      }
      map.remove();
    };
  }, []);

  // ユーザーの位置情報が取得できたら、周辺のバス停を表示
  useEffect(() => {
    if (userLocation) {
      // 実際のTranslinkのAPIを使用して周辺のバス停を取得
      fetchNearbyBusStops(userLocation, 2000);

      // 地図の中心をユーザーの位置に移動
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: userLocation,
          zoom: 14,
          essential: true,
        });
      }
    }
  }, [userLocation]);

  // バス停のマーカーを地図に追加
  useEffect(() => {
    if (!mapRef.current || busStops.length === 0) return;

    const map = mapRef.current;

    // 既存のマーカーをクリア
    if (markersRef.current) {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }
    const existingMarkers = document.querySelectorAll(".bus-stop-marker");
    existingMarkers.forEach((marker) => marker.remove());

    // 駅のみのマーカーを追加
    const stations = busStops.filter(
      (stop) => stop.Type && stop.Type !== "Bus"
    );
    console.log("All busStops:", busStops);
    console.log("Filtered stations:", stations);
    console.log("Adding markers for stations:", stations.length);

    // デバッグ: 各駅の詳細情報を表示
    stations.forEach((station, index) => {
      console.log(`Station ${index + 1}:`, {
        Name: station.Name,
        Type: station.Type,
        Latitude: station.Latitude,
        Longitude: station.Longitude,
      });
    });

    if (stations.length === 0) {
      console.log(
        "No stations found! All stops:",
        busStops.map((s) => ({ Name: s.Name, Type: s.Type }))
      );
    }

    stations.forEach((stop) => {
      console.log("Processing station:", stop.Name, "Type:", stop.Type);

      const el = document.createElement("div");
      el.className = "station-marker";
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.border = "3px solid white";
      el.style.cursor = "pointer";
      el.style.zIndex = "1000";

      // 駅の種類に応じて色を変更
      if (stop.Type === "SkyTrain") {
        console.log("Adding SkyTrain station:", stop.Name);
        el.style.backgroundColor = "#ef4444"; // 赤色
        el.style.boxShadow = "0 0 15px rgba(239, 68, 68, 0.8)";
      } else if (stop.Type === "SeaBus") {
        console.log("Adding SeaBus station:", stop.Name);
        el.style.backgroundColor = "#10b981"; // 緑色
        el.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.8)";
      } else if (stop.Type === "West Coast Express") {
        console.log("Adding West Coast Express station:", stop.Name);
        el.style.backgroundColor = "#f59e0b"; // オレンジ色
        el.style.boxShadow = "0 0 15px rgba(245, 158, 11, 0.8)";
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([stop.Longitude, stop.Latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div class="p-2">
                <h3 class="font-semibold text-sm">${stop.Name}</h3>
                <p class="text-xs text-gray-600">${
                  stop.Type === "SkyTrain"
                    ? "SkyTrain駅"
                    : stop.Type === "SeaBus"
                    ? "SeaBus駅"
                    : stop.Type === "West Coast Express"
                    ? "West Coast Express駅"
                    : "バス停"
                } #${stop.StopNo}</p>
                <p class="text-xs text-gray-600">Routes: ${stop.Routes}</p>
              </div>
            `)
        )
        .addTo(map);

      console.log(
        "Added marker for:",
        stop.Name,
        "at",
        stop.Longitude,
        stop.Latitude
      );
      console.log("Marker element:", el);
      console.log("Marker styles:", {
        backgroundColor: el.style.backgroundColor,
        width: el.style.width,
        height: el.style.height,
      });

      // マーカーを配列に追加
      markersRef.current.push(marker);
    });
  }, [busStops]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      {loading && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded">
          Loading bus stops...
        </div>
      )}

      {/* バス停情報パネル */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded max-w-xs">
        <h3 className="font-semibold text-sm mb-2">駅情報</h3>
        <p className="text-xs mb-1">
          表示中:{" "}
          {busStops.filter((stop) => stop.Type && stop.Type !== "Bus").length}{" "}
          駅
        </p>
        {userLocation && (
          <div className="text-xs text-gray-300 mb-2">
            <p className="font-semibold">あなたの位置:</p>
            <p>緯度: {userLocation[1].toFixed(6)}</p>
            <p>経度: {userLocation[0].toFixed(6)}</p>
          </div>
        )}
        <p className="text-xs text-gray-300 mt-2">指定された5つの駅を表示中</p>
        <div className="mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>SkyTrain駅</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>SeaBus駅</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>West Coast Express駅</span>
          </div>
        </div>
      </div>
    </div>
  );
}
