"use client";

import { useState } from "react";

interface BusStopDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStop: any;
  regionDelays: { [key: string]: number };
  stopDelays: { [key: string]: number };
  routeDelays: { [key: string]: number };
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
  getDelaySymbol,
  getDelayLevelName,
  pinnedStops,
  onTogglePin,
}: BusStopDetailPanelProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);

  // 選択したバス停に停まる路線を取得
  const getStopRoutes = () => {
    if (!selectedStop?.properties?.stop_id) return [];

    // デモ用の路線データ（実際の実装では、selectedStopから路線情報を取得）
    const demoRoutes = ["023", "025", "041", "099", "410", "416"];
    return demoRoutes;
  };

  if (!isOpen || !selectedStop) return null;

  return (
    <>
      {/* Desktop Version (from right) */}
      <div
        className={`hidden md:block fixed top-0 right-0 h-full w-80 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
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
          <div className="border-t border-gray-700 pt-4">
            <h4 className="font-semibold text-white mb-2">Delay Status</h4>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {getDelaySymbol(
                      stopDelays[selectedStop?.properties?.stop_id] || 0
                    )}
                  </span>
                  <span className="text-white font-medium">
                    {getDelayLevelName(
                      stopDelays[selectedStop?.properties?.stop_id] || 0
                    )}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400">
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
                {getStopRoutes().map((route) => {
                  const delay = routeDelays[route] || 0;
                  return (
                    <div
                      key={route}
                      className="flex items-center justify-between bg-gray-800 p-2 rounded cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        setSelectedRoute(route);
                        setShowForecast(true);
                      }}
                    >
                      <span className="text-gray-300">Route {route}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getDelaySymbol(delay)}</span>
                        <span className="text-sm text-gray-400">
                          {getDelayLevelName(delay)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 位置情報 */}
          <div className="border-t border-gray-700 pt-4">
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
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
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
          <div className="border-t border-gray-700 pt-3">
            <h4 className="font-semibold text-white mb-2 text-sm">
              Delay Status
            </h4>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {getDelaySymbol(
                      stopDelays[selectedStop?.properties?.stop_id] || 0
                    )}
                  </span>
                  <span className="text-white font-medium text-sm">
                    {getDelayLevelName(
                      stopDelays[selectedStop?.properties?.stop_id] || 0
                    )}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400">
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
              <div className="space-y-1">
                {getStopRoutes().map((route) => {
                  const delay = routeDelays[route] || 0;
                  return (
                    <div
                      key={route}
                      className="flex items-center justify-between bg-gray-800 p-2 rounded text-xs cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        setSelectedRoute(route);
                        setShowForecast(true);
                      }}
                    >
                      <span className="text-gray-300">Route {route}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{getDelaySymbol(delay)}</span>
                        <span className="text-xs text-gray-400">
                          {getDelayLevelName(delay)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 位置情報 */}
          <div className="border-t border-gray-700 pt-3">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-96 max-w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                6-Hour Forecast - Route {selectedRoute}
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
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => {
                const hour = new Date();
                hour.setHours(hour.getHours() + i);
                const delay = Math.floor(Math.random() * 6);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-800 p-3 rounded"
                  >
                    <div>
                      <div className="text-white font-medium">
                        {hour.toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {hour.toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getDelaySymbol(delay)}</span>
                      <span className="text-gray-300">
                        {getDelayLevelName(delay)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
