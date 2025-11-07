"use client";

interface PinnedStop {
  stopId: string;
  stop_name: string;
  stop_id: string;
  stop_code: string;
  geometry: {
    coordinates: [number, number];
  };
}

interface PinnedStopsPanelProps {
  pinnedStops: Set<string>;
  pinnedStopsData: { [key: string]: any };
  onStopClick: (stopData: any) => void;
  onRemovePin: (stopId: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onMapToggle?: () => void;
  is3DMode?: boolean;
}

export default function PinnedStopsPanel({
  pinnedStops,
  pinnedStopsData,
  onStopClick,
  onRemovePin,
  isVisible,
  onToggleVisibility,
  onMapToggle,
  is3DMode,
}: PinnedStopsPanelProps) {
  const pinnedStopsList = Array.from(pinnedStops).map((stopId) => {
    const stopData = pinnedStopsData[stopId];
    console.log(`Pinned stop ${stopId}:`, stopData);
    return {
      stopId,
      ...stopData,
    };
  });

  console.log("PinnedStopsPanel - pinnedStops:", pinnedStops);
  console.log("PinnedStopsPanel - pinnedStopsData:", pinnedStopsData);
  console.log("PinnedStopsPanel - pinnedStopsList:", pinnedStopsList);

  return (
    <>
      {/* スマホ時のPinボタンと3Dトグルのコンテナ */}
      <div className="md:hidden fixed bottom-4 left-4 z-20 flex items-center gap-2">
        {/* Pinボタン */}
        <button
          onClick={onToggleVisibility}
          className="bg-white/10 backdrop-blur-xl text-white p-3 rounded-lg shadow-lg border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
          title={isVisible ? "Hide Pinned Stops" : "Show Pinned Stops"}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <span className="text-sm font-medium">
              {pinnedStopsList.length} Pinned
            </span>
            <span className="text-xs">{isVisible ? "▼" : "▲"}</span>
          </div>
        </button>

        {/* 3D表示トグル */}
        {onMapToggle && (
          <div className="bg-white/10 backdrop-blur-xl rounded-lg shadow-lg border border-white/20 p-3 flex items-center gap-2">
            <span className="text-sm text-white">3D</span>
            <button
              onClick={onMapToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer ${
                is3DMode ? "bg-blue-600" : "bg-gray-600"
              }`}
              aria-label={is3DMode ? "Switch to 2D view" : "Switch to 3D view"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  is3DMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* デスクトップ時のPinボタン */}
      <button
        onClick={onToggleVisibility}
        className="hidden md:block fixed bottom-4 left-4 z-20 bg-white/10 backdrop-blur-xl text-white p-3 rounded-lg shadow-lg border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
        title={isVisible ? "Hide Pinned Stops" : "Show Pinned Stops"}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <span className="text-sm font-medium">
            {pinnedStopsList.length} Pinned
          </span>
          <span className="text-xs">{isVisible ? "▼" : "▲"}</span>
        </div>
      </button>

      {/* Pinned Stops Panel */}
      {isVisible && (
        <div className="fixed bottom-20 left-4 z-20 w-80 max-h-96 bg-white/10 backdrop-blur-xl rounded-lg shadow-lg border border-white/20 overflow-hidden">
          <div className="p-3 border-b border-white/20">
            <h3 className="text-sm font-semibold text-white">
              Pinned Bus Stops ({pinnedStopsList.length})
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {pinnedStopsList.length > 0 ? (
              <div className="space-y-1 p-2">
                {pinnedStopsList.map((stop) => (
                  <div
                    key={stop.stopId}
                      className="flex items-center justify-between p-2 bg-white/10 rounded hover:bg-white/20 transition-colors group border border-white/10"
                  >
                    <button
                      onClick={() => onStopClick(stop)}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">📍</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {stop.properties?.stop_name ||
                              stop.stop_name ||
                              stop.name ||
                              "Unknown Stop"}
                          </div>
                          <div className="text-gray-400 text-xs">
                            ID:{" "}
                            {stop.properties?.stop_id ||
                              stop.stop_id ||
                              stop.id ||
                              "N/A"}{" "}
                            | Code:{" "}
                            {stop.properties?.stop_code ||
                              stop.stop_code ||
                              stop.code ||
                              "N/A"}
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePin(stop.stopId);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-all p-1 cursor-pointer"
                      title="Remove Pin"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">
                No pinned stops yet
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
