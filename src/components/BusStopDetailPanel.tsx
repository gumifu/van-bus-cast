"use client";

interface Region {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
}

interface BusArrival {
  routeNumber: string;
  destination: string;
  arrivalTime: string;
  status: "on-time" | "delayed" | "cancelled";
  color: string;
}

interface BusStopDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStop: any;
  delayLevel: number;
  regions: Region[];
  selectedRegion: string;
  onRegionSelect: (regionId: string) => void;
  getDelaySymbol: (level: number) => string;
  getDelayLevelName: (level: number) => string;
  pinnedStops: Set<string>;
  onTogglePin: (stopId: string, stopData: any) => void;
  busArrivals: BusArrival[];
  onRefreshArrivals: () => void;
}

export default function BusStopDetailPanel({
  isOpen,
  onClose,
  selectedStop,
  delayLevel,
  regions,
  selectedRegion,
  onRegionSelect,
  getDelaySymbol,
  getDelayLevelName,
  pinnedStops,
  onTogglePin,
  busArrivals,
  onRefreshArrivals,
}: BusStopDetailPanelProps) {
  return (
    <>
      {/* Desktop Version (from right) */}
      <div
        className={`hidden md:block fixed top-0 right-0 h-full w-80 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Bus Stop Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedStop &&
              selectedStop.properties &&
              selectedStop.geometry && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-white">
                        {selectedStop.properties.stop_name || "Unknown Stop"}
                      </h3>
                      {selectedStop && selectedStop.properties && (
                        <button
                          onClick={() =>
                            onTogglePin(
                              selectedStop.properties.stop_id,
                              selectedStop
                            )
                          }
                          className={`p-1.5 rounded transition-colors ${
                            pinnedStops.has(selectedStop.properties.stop_id)
                              ? "bg-gray-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                          title={
                            pinnedStops.has(selectedStop.properties.stop_id)
                              ? "Unpin"
                              : "Pin"
                          }
                        >
                          📍
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex justify-between">
                        <span className="font-medium">Stop ID:</span>
                        <span className="text-gray-400">
                          {selectedStop.properties.stop_id || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Stop Code:</span>
                        <span className="text-gray-400">
                          {selectedStop.properties.stop_code || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Wheelchair Access:</span>
                        <span className="text-gray-400">
                          {selectedStop.properties.wheelchair_boarding === 1
                            ? "Yes"
                            : selectedStop.properties.wheelchair_boarding === 2
                            ? "No"
                            : "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 路線情報 */}
                  {selectedStop.properties.route_short_names &&
                    Array.isArray(selectedStop.properties.route_short_names) &&
                    selectedStop.properties.route_short_names.length > 0 && (
                      <div className="border-t border-gray-700 pt-4">
                        <h4 className="font-semibold text-white mb-3">
                          Routes at this Stop
                        </h4>
                        <div className="space-y-2">
                          {Array.isArray(
                            selectedStop.properties.route_short_names
                          ) &&
                            selectedStop.properties.route_short_names.map(
                              (route: string, index: number) => {
                                // 対応する行き先を取得
                                const headsigns = Array.isArray(
                                  selectedStop.properties.trip_headsigns
                                )
                                  ? selectedStop.properties.trip_headsigns
                                  : [];
                                const routeHeadsigns = headsigns.filter(
                                  (h: string) => h.startsWith(route)
                                );

                                return (
                                  <div
                                    key={`${route}-${index}`}
                                    className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="bg-blue-600 text-white px-2.5 py-1 rounded-md font-bold text-sm">
                                        {route}
                                      </span>
                                    </div>
                                    {routeHeadsigns.length > 0 && (
                                      <div className="space-y-1 text-xs text-gray-400">
                                        {Array.isArray(routeHeadsigns) &&
                                          routeHeadsigns.map(
                                            (
                                              headsign: string,
                                              hIndex: number
                                            ) => (
                                              <div
                                                key={hIndex}
                                                className="pl-2 border-l-2 border-blue-600"
                                              >
                                                {headsign}
                                              </div>
                                            )
                                          )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}
                        </div>
                      </div>
                    )}

                  {/* バス到着情報 */}
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-white">Bus Arrivals</h4>
                      <button
                        onClick={onRefreshArrivals}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                    {busArrivals && busArrivals.length > 0 ? (
                      <div className="space-y-2">
                        {busArrivals.map((arrival, index) => (
                          <div
                            key={index}
                            className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="px-2.5 py-1 rounded-md font-bold text-sm text-white"
                                  style={{ backgroundColor: arrival.color }}
                                >
                                  {arrival.routeNumber}
                                </span>
                                <span className="text-gray-300 text-sm">
                                  {arrival.destination}
                                </span>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  arrival.status === "on-time"
                                    ? "bg-green-900 text-green-300"
                                    : arrival.status === "delayed"
                                    ? "bg-yellow-900 text-yellow-300"
                                    : "bg-red-900 text-red-300"
                                }`}
                              >
                                {arrival.status === "on-time"
                                  ? "On Time"
                                  : arrival.status === "delayed"
                                  ? "Delayed"
                                  : "Cancelled"}
                              </span>
                            </div>
                            <div className="text-gray-400 text-sm">
                              Arrives in: {arrival.arrivalTime}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm text-center py-4">
                        No bus arrivals available
                      </div>
                    )}
                  </div>

                  {/* 位置情報 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-2">Location</h4>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Latitude:</span>
                        <span>
                          {selectedStop.geometry.coordinates?.[1]?.toFixed(6) ||
                            "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Longitude:</span>
                        <span>
                          {selectedStop.geometry.coordinates?.[0]?.toFixed(6) ||
                            "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 遅延状況 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">
                      Delay Status
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {getDelaySymbol(delayLevel)}
                        </span>
                        <div>
                          <div className="text-white font-medium">
                            {getDelayLevelName(delayLevel)}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Last updated: {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6時間予報 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">
                      6-Hour Forecast
                    </h4>
                    <div className="space-y-2">
                      {Array.from({ length: 6 }, (_, i) => {
                        const hour = new Date();
                        hour.setHours(hour.getHours() + i + 1);
                        const randomDelay = Math.floor(Math.random() * 5);
                        return (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-gray-800 p-3 rounded"
                          >
                            <span className="text-gray-300">
                              {hour.getHours()}:00
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {getDelaySymbol(randomDelay)}
                              </span>
                              <span className="text-sm text-gray-400">
                                {getDelayLevelName(randomDelay)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 地域表示 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">
                      Region Display
                    </h4>
                    <div className="space-y-2">
                      {regions.map((region) => (
                        <button
                          key={region.id}
                          onClick={() => onRegionSelect(region.id)}
                          className={`w-full text-left p-2 rounded text-sm transition-colors ${
                            selectedRegion === region.id
                              ? "bg-gray-700 text-white"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {region.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* アラート */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">Alerts</h4>
                    <div className="space-y-2">
                      <div className="bg-yellow-900 border border-yellow-700 rounded p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">⚠️</span>
                          <span className="text-yellow-200 text-sm">
                            Peak delay expected in 2 hours
                          </span>
                        </div>
                      </div>
                      <div className="bg-red-900 border border-red-700 rounded p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">🚨</span>
                          <span className="text-red-200 text-sm">
                            Major delays on Route 2
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Mobile Version (from bottom) */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="h-96 flex flex-col">
          {/* ヘッダー */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Bus Stop Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedStop &&
              selectedStop.properties &&
              selectedStop.geometry && (
                <div className="space-y-4">
                  {/* 基本情報 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">Basic Info</h3>
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between items-center">
                        <span>Stop Name:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white">
                            {selectedStop.properties.stop_name || "不明"}
                          </span>
                          {selectedStop && selectedStop.properties && (
                            <button
                              onClick={() =>
                                onTogglePin(
                                  selectedStop.properties.stop_id,
                                  selectedStop
                                )
                              }
                              className={`p-1 rounded transition-colors ${
                                pinnedStops.has(selectedStop.properties.stop_id)
                                  ? "bg-gray-600 text-white"
                                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              }`}
                              title={
                                pinnedStops.has(selectedStop.properties.stop_id)
                                  ? "Unpin"
                                  : "Pin"
                              }
                            >
                              📍
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Stop ID:</span>
                        <span className="text-white">
                          {selectedStop.properties.stop_id || "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stop Code:</span>
                        <span className="text-white">
                          {selectedStop.properties.stop_code || "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wheelchair Access:</span>
                        <span className="text-white">
                          {selectedStop.properties.wheelchair_boarding === 1
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 路線情報 */}
                  {selectedStop.properties.route_short_names &&
                    Array.isArray(selectedStop.properties.route_short_names) &&
                    selectedStop.properties.route_short_names.length > 0 && (
                      <div className="border-t border-gray-700 pt-4">
                        <h4 className="font-semibold text-white mb-3">
                          Routes at this Stop
                        </h4>
                        <div className="space-y-2">
                          {Array.isArray(
                            selectedStop.properties.route_short_names
                          ) &&
                            selectedStop.properties.route_short_names.map(
                              (route: string, index: number) => {
                                // 対応する行き先を取得
                                const headsigns = Array.isArray(
                                  selectedStop.properties.trip_headsigns
                                )
                                  ? selectedStop.properties.trip_headsigns
                                  : [];
                                const routeHeadsigns = headsigns.filter(
                                  (h: string) => h.startsWith(route)
                                );

                                return (
                                  <div
                                    key={`${route}-${index}`}
                                    className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="bg-blue-600 text-white px-2.5 py-1 rounded-md font-bold text-sm">
                                        {route}
                                      </span>
                                    </div>
                                    {routeHeadsigns.length > 0 && (
                                      <div className="space-y-1 text-xs text-gray-400">
                                        {Array.isArray(routeHeadsigns) &&
                                          routeHeadsigns.map(
                                            (
                                              headsign: string,
                                              hIndex: number
                                            ) => (
                                              <div
                                                key={hIndex}
                                                className="pl-2 border-l-2 border-blue-600"
                                              >
                                                {headsign}
                                              </div>
                                            )
                                          )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            )}
                        </div>
                      </div>
                    )}

                  {/* バス到着情報 */}
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-white">Bus Arrivals</h4>
                      <button
                        onClick={onRefreshArrivals}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        🔄
                      </button>
                    </div>
                    {busArrivals && busArrivals.length > 0 ? (
                      <div className="space-y-2">
                        {busArrivals.map((arrival, index) => (
                          <div
                            key={index}
                            className="bg-gray-800 rounded-lg p-2 border border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="px-2 py-0.5 rounded-md font-bold text-xs text-white"
                                  style={{ backgroundColor: arrival.color }}
                                >
                                  {arrival.routeNumber}
                                </span>
                                <span className="text-gray-300 text-xs">
                                  {arrival.destination}
                                </span>
                              </div>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  arrival.status === "on-time"
                                    ? "bg-green-900 text-green-300"
                                    : arrival.status === "delayed"
                                    ? "bg-yellow-900 text-yellow-300"
                                    : "bg-red-900 text-red-300"
                                }`}
                              >
                                {arrival.status === "on-time"
                                  ? "On Time"
                                  : arrival.status === "delayed"
                                  ? "Delayed"
                                  : "Cancelled"}
                              </span>
                            </div>
                            <div className="text-gray-400 text-xs">
                              {arrival.arrivalTime}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs text-center py-4">
                        No bus arrivals available
                      </div>
                    )}
                  </div>

                  {/* 遅延状況 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-2">遅延状況</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {getDelaySymbol(delayLevel)}
                      </span>
                      <span className="text-white">
                        {getDelayLevelName(delayLevel)}
                      </span>
                    </div>
                  </div>

                  {/* 6時間予報 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">6時間予報</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {Array.from({ length: 6 }, (_, i) => {
                        const hour = new Date().getHours() + i;
                        const randomDelay = Math.floor(Math.random() * 5);
                        return (
                          <div key={i} className="text-center">
                            <div className="text-gray-400">{hour % 24}:00</div>
                            <div className="text-lg">
                              {getDelaySymbol(randomDelay)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getDelayLevelName(randomDelay)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 位置情報 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">Location</h4>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Latitude:</span>
                        <span className="text-white">
                          {selectedStop.geometry.coordinates?.[1]?.toFixed(6) ||
                            "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Longitude:</span>
                        <span className="text-white">
                          {selectedStop.geometry.coordinates?.[0]?.toFixed(6) ||
                            "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 地域表示 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">地域表示</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {regions.map((region) => (
                        <button
                          key={region.id}
                          onClick={() => onRegionSelect(region.id)}
                          className={`p-2 rounded text-xs transition-colors ${
                            selectedRegion === region.id
                              ? "bg-gray-700 text-white"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {region.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* アラート */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">アラート</h4>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="bg-red-900 bg-opacity-30 p-2 rounded">
                        <span className="text-red-400">⚠️</span> Peak delay
                        expected in 2 hours
                      </div>
                      <div className="bg-yellow-900 bg-opacity-30 p-2 rounded">
                        <span className="text-yellow-400">ℹ️</span> Some routes
                        diverted due to construction
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
