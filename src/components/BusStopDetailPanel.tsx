"use client";

interface Region {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
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
}: BusStopDetailPanelProps) {
  return (
    <>
      {/* デスクトップ版（右から） */}
      <div
        className={`hidden md:block fixed top-0 right-0 h-full w-80 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">バス停詳細</h2>
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
                  {/* 基本情報 */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {selectedStop.properties.stop_name || "Unknown Stop"}
                    </h3>
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

                  {/* 位置情報 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">位置情報</h4>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>緯度:</span>
                        <span>
                          {selectedStop.geometry.coordinates?.[1]?.toFixed(6) ||
                            "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>経度:</span>
                        <span>
                          {selectedStop.geometry.coordinates?.[0]?.toFixed(6) ||
                            "不明"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 遅延状況 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">遅延状況</h4>
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
                            最終更新: {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6時間予報 */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">6時間予報</h4>
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
                    <h4 className="font-semibold text-white mb-3">地域表示</h4>
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
                    <h4 className="font-semibold text-white mb-3">アラート</h4>
                    <div className="space-y-2">
                      <div className="bg-yellow-900 border border-yellow-700 rounded p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">⚠️</span>
                          <span className="text-yellow-200 text-sm">
                            2時間後に遅延のピークが予想されます
                          </span>
                        </div>
                      </div>
                      <div className="bg-red-900 border border-red-700 rounded p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">🚨</span>
                          <span className="text-red-200 text-sm">
                            Route 2で重大な遅延が発生中
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

      {/* モバイル版（下から） */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="h-96 flex flex-col">
          {/* ヘッダー */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">バス停詳細</h2>
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
                    <h3 className="font-semibold text-white mb-2">基本情報</h3>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>バス停名:</span>
                        <span className="text-white">
                          {selectedStop.properties.stop_name || "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>バス停ID:</span>
                        <span className="text-white">
                          {selectedStop.properties.stop_id || "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>バス停コード:</span>
                        <span className="text-white">
                          {selectedStop.properties.stop_code || "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>車椅子対応:</span>
                        <span className="text-white">
                          {selectedStop.properties.wheelchair_boarding === 1
                            ? "対応"
                            : "非対応"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 位置情報 */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-white mb-2">位置情報</h4>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>緯度:</span>
                        <span className="text-white">
                          {selectedStop.geometry.coordinates?.[1]?.toFixed(6) ||
                            "不明"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>経度:</span>
                        <span className="text-white">
                          {selectedStop.geometry.coordinates?.[0]?.toFixed(6) ||
                            "不明"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 遅延状況 */}
                  <div className="border-t pt-4">
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
                            <div className="text-gray-400">{hour % 24}時</div>
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
                        <span className="text-red-400">⚠️</span>{" "}
                        2時間後に遅延のピークが予想されます
                      </div>
                      <div className="bg-yellow-900 bg-opacity-30 p-2 rounded">
                        <span className="text-yellow-400">ℹ️</span>{" "}
                        工事の影響で一部路線が迂回運行中
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
