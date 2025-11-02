"use client";

import { useState, useEffect } from "react";

interface BusStopDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStop: any;
  regionDelays: { [key: string]: number };
  stopDelays: { [key: string]: number };
  routeDelays: { [key: string]: number };
  routeIdMapping?: { [routeNumber: string]: string }; // 路線番号 -> route_id（GTFS内部ID）
  selectedStopId?: string | null;
  getDelaySymbol: (level: number) => string;
  getDelayLevelName: (level: number) => string;
  pinnedStops: Set<string>;
  onTogglePin: (stopId: string, stopData: any) => void;
}

export default function BusStopDetailPanel({
  isOpen,
  onClose,
  selectedStop,
  regionDelays,
  stopDelays,
  routeDelays,
  routeIdMapping = {},
  selectedStopId,
  getDelaySymbol,
  getDelayLevelName,
  pinnedStops,
  onTogglePin,
}: BusStopDetailPanelProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const [routeArrivals, setRouteArrivals] = useState<any[]>([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);

  // 選択されたルートの詳細な到着時刻を取得
  useEffect(() => {
    const fetchRouteArrivals = async () => {
      if (!selectedRoute || !selectedStopId || !routeIdMapping[selectedRoute]) {
        setRouteArrivals([]);
        return;
      }

      setLoadingArrivals(true);
      try {
        const routeId = routeIdMapping[selectedRoute];
        const response = await fetch(
          `/api/stops/${selectedStopId}/routes/${routeId}/predictions`
        );

        if (!response.ok) {
          console.error("Failed to fetch route arrivals:", response.status);
          setRouteArrivals([]);
          return;
        }

        const data = await response.json();
        if (data.arrivals && Array.isArray(data.arrivals)) {
          setRouteArrivals(data.arrivals);
        } else {
          setRouteArrivals([]);
        }
      } catch (error) {
        console.error("Error fetching route arrivals:", error);
        setRouteArrivals([]);
      } finally {
        setLoadingArrivals(false);
      }
    };

    if (showForecast && selectedRoute) {
      fetchRouteArrivals();
    } else {
      setRouteArrivals([]);
    }
  }, [selectedRoute, selectedStopId, routeIdMapping, showForecast]);

  // 選択したバス停に停まる路線を取得
  const getStopRoutes = () => {
    if (!selectedStop?.properties?.stop_id) return [];

    // routeDelaysから実際のAPIから取得したルートIDを取得
    // 選択されたバス停に対応するルートのみをフィルタリング
    const stopRoutes = Object.keys(routeDelays).filter((routeId) => {
      // routeDelaysに含まれる全てのルートを表示
      // 将来的にはselectedStopから路線情報を取得することも可能
      return routeDelays[routeId] !== undefined;
    });

    // ルートIDでソート（数値として扱える場合は数値順、そうでない場合は文字列順）
    return stopRoutes.sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
  };

  if (!selectedStop) return null;

  return (
    <>
      {/* Desktop Version (from right) */}
      <div
        className={`hidden md:block fixed top-16 right-0 h-[calc(100%-4rem)] w-80 bg-white/10 backdrop-blur-xl text-white shadow-2xl transform transition-transform duration-300 ease-out z-50 border-l border-white/20 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <h3 className="text-lg font-semibold">Bus Stop Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto h-full">
          {/* バス停情報 */}
          <div>
            <div className="flex items-center justify-between mb-2 text-lg pr-1">
              <h4 className="font-semibold text-white">
                {selectedStop.properties?.stop_name || "Unknown Stop"}
              </h4>
              <button
                onClick={() => {
                  if (selectedStop?.properties?.stop_id) {
                    onTogglePin(selectedStop.properties.stop_id, selectedStop);
                  }
                }}
                className={`w-10 h-10 flex items-center justify-center rounded text-lg hover:bg-gray-700 hover:cursor-pointer transition-colors ${
                  selectedStop?.properties?.stop_id &&
                  pinnedStops.has(selectedStop.properties.stop_id)
                    ? "text-yellow-400 bg-gray-700 border border-gray-500"
                    : "text-gray-400 hover:text-yellow-400"
                }`}
                title={
                  selectedStop?.properties?.stop_id &&
                  pinnedStops.has(selectedStop.properties.stop_id)
                    ? "Remove Pin"
                    : "Pin this stop"
                }
              >
                📍
              </button>
            </div>
            <div className="space-y-1 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Stop ID:</span>
                <span>{selectedStop.properties?.stop_id || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Stop Code:</span>
                <span>{selectedStop.properties?.stop_code || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Wheelchair Access:</span>
                <span>
                  {selectedStop.properties?.wheelchair_boarding === 1
                    ? "Yes"
                    : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Delay Status */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="font-semibold text-white mb-2">Delay Status</h4>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">
                    {getDelayLevelName(
                      stopDelays[selectedStop?.properties?.stop_id] || 0
                    )}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-2xl">
                    {getDelaySymbol(
                      stopDelays[selectedStop?.properties?.stop_id] || 0
                    )}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-300">
                Last updated:{" "}
                {new Date().toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* 路線別遅延情報 */}
          {getStopRoutes().length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-300 mb-3">
                Route Delays
              </h5>
              <div className="space-y-2">
                {getStopRoutes().map((route, index) => {
                  const delay = routeDelays[route] || 0;
                  const colors = [
                    "#0066CC", // 青
                    "#FF6600", // オレンジ
                    "#00AA44", // 緑
                    "#CC0066", // ピンク
                    "#6600CC", // 紫
                    "#00CCAA", // シアン
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div
                      key={route}
                      className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20 cursor-pointer hover:bg-white/20 transition-all shadow-lg hover:shadow-xl"
                      onClick={() => {
                        setSelectedRoute(route);
                        setShowForecast(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2.5 py-1 rounded-md font-bold text-sm text-white"
                            style={{ backgroundColor: color }}
                          >
                            {route}
                          </span>
                          <span className="text-gray-300 text-sm">
                            Route {route}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">
                            {getDelayLevelName(delay)}
                          </span>
                          <span className="text-gray-400">|</span>
                          <span className="text-lg">
                            {getDelaySymbol(delay)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 位置情報 */}
          <div className="border-t border-white/20 pt-4">
            <h4 className="font-semibold text-white mb-2">Location</h4>
            <div className="space-y-1 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Latitude:</span>
                <span>
                  {selectedStop.geometry?.coordinates?.[1]?.toFixed(6) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Longitude:</span>
                <span>
                  {selectedStop.geometry?.coordinates?.[0]?.toFixed(6) || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Version (from bottom) */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-xl text-white shadow-2xl transform transition-transform duration-300 ease-out z-50 border-t border-white/20 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-white/20">
          <h3 className="text-lg font-semibold">Bus Stop Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
          {/* バス停情報 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-white text-lg">
                {selectedStop.properties?.stop_name || "Unknown Stop"}
              </h4>
              <button
                onClick={() => {
                  if (selectedStop?.properties?.stop_id) {
                    onTogglePin(selectedStop.properties.stop_id, selectedStop);
                  }
                }}
                className={`w-8 h-8 flex items-center justify-center rounded text-base hover:bg-gray-700 transition-colors ${
                  selectedStop?.properties?.stop_id &&
                  pinnedStops.has(selectedStop.properties.stop_id)
                    ? "text-yellow-400 bg-gray-300 border border-gray-400"
                    : "text-gray-400 hover:text-yellow-400"
                }`}
                title={
                  selectedStop?.properties?.stop_id &&
                  pinnedStops.has(selectedStop.properties.stop_id)
                    ? "Remove Pin"
                    : "Pin this stop"
                }
              >
                📍
              </button>
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Stop ID:</span>
                <span>{selectedStop.properties?.stop_id || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Stop Code:</span>
                <span>{selectedStop.properties?.stop_code || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Wheelchair Access:</span>
                <span>
                  {selectedStop.properties?.wheelchair_boarding === 1
                    ? "Yes"
                    : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Delay Status */}
          <div className="border-t border-white/20 pt-3">
            <h4 className="font-semibold text-white mb-2 text-sm">
              Delay Status
            </h4>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20 shadow-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">
                    {getDelayLevelName(
                      stopDelays[selectedStop?.properties?.stop_id] || 0
                    )}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-xl">
                    {getDelaySymbol(
                      stopDelays[selectedStop?.properties?.stop_id] || 0
                    )}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-300">
                Last updated:{" "}
                {new Date().toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* 路線別遅延情報 */}
          {getStopRoutes().length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-medium text-gray-300 mb-2">
                路線遅延
              </h5>
              <div className="space-y-2">
                {getStopRoutes().map((route, index) => {
                  const delay = routeDelays[route] || 0;
                  const colors = [
                    "#0066CC", // 青
                    "#FF6600", // オレンジ
                    "#00AA44", // 緑
                    "#CC0066", // ピンク
                    "#6600CC", // 紫
                    "#00CCAA", // シアン
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div
                      key={route}
                      className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20 cursor-pointer hover:bg-white/20 transition-all shadow-lg hover:shadow-xl"
                      onClick={() => {
                        setSelectedRoute(route);
                        setShowForecast(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-md font-bold text-xs text-white"
                            style={{ backgroundColor: color }}
                          >
                            {route}
                          </span>
                          <span className="text-gray-300 text-xs">
                            Route {route}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">
                            {getDelayLevelName(delay)}
                          </span>
                          <span className="text-gray-400">|</span>
                          <span className="text-sm">
                            {getDelaySymbol(delay)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 位置情報 */}
          <div className="border-t border-white/20 pt-3">
            <h4 className="font-semibold text-white mb-2 text-sm">Location</h4>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Latitude:</span>
                <span>
                  {selectedStop.geometry?.coordinates?.[1]?.toFixed(6) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Longitude:</span>
                <span>
                  {selectedStop.geometry?.coordinates?.[0]?.toFixed(6) || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Hour Forecast Modal */}
      {showForecast && selectedRoute && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 w-96 max-w-full mx-4 max-h-[80vh] overflow-y-auto border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Route {selectedRoute} - Arrival Times
              </h3>
              <button
                onClick={() => {
                  setShowForecast(false);
                  setSelectedRoute(null);
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            {loadingArrivals ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : routeArrivals.length > 0 ? (
              <div className="space-y-3">
                {routeArrivals.map((arrival: any, index: number) => {
                  const delayMinutes =
                    arrival.predicted_delay_seconds !== null &&
                    arrival.predicted_delay_seconds !== undefined
                      ? Math.max(
                          0,
                          Math.round(arrival.predicted_delay_seconds / 60)
                        )
                      : 0;
                  const arrivalTime =
                    arrival.arrival_time || arrival.next_arrival_time || "";

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white/10 backdrop-blur-md p-3 rounded border border-white/20 shadow-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div>
                          <div className="text-white font-medium">
                            {arrivalTime}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {arrival.trip_headsign ||
                              `Trip ${
                                arrival.trip_id?.substring(0, 8) || "N/A"
                              }`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-gray-300 text-sm font-medium">
                            {getDelayLevelName(delayMinutes)}
                          </span>
                          <span className="text-gray-400">|</span>
                          <span className="text-2xl">
                            {getDelaySymbol(delayMinutes)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No arrival times available
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
