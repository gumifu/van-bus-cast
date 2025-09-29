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
}

export default function PinnedStopsPanel({
  pinnedStops,
  pinnedStopsData,
  onStopClick,
  onRemovePin,
  isVisible,
  onToggleVisibility,
}: PinnedStopsPanelProps) {
  const pinnedStopsList = Array.from(pinnedStops).map((stopId) => ({
    stopId,
    ...pinnedStopsData[stopId],
  }));

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggleVisibility}
        className="fixed bottom-4 left-4 z-20 bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700 hover:bg-gray-800 transition-colors"
        title={isVisible ? "Hide Pinned Stops" : "Show Pinned Stops"}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <span className="text-sm font-medium">{pinnedStops.size} Pinned</span>
          <span className="text-xs">{isVisible ? "▼" : "▲"}</span>
        </div>
      </button>

      {/* Pinned Stops Panel */}
      {isVisible && (
        <div className="fixed bottom-20 left-4 z-20 w-80 max-h-96 bg-gray-900 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">
              Pinned Bus Stops ({pinnedStops.size})
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {pinnedStopsList.length > 0 ? (
              <div className="space-y-1 p-2">
                {pinnedStopsList.map((stop) => (
                  <div
                    key={stop.stopId}
                    className="flex items-center justify-between p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors group"
                  >
                    <button
                      onClick={() => onStopClick(stop)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">📍</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium truncate">
                            {stop.properties?.stop_name || "Unknown Stop"}
                          </div>
                          <div className="text-gray-400 text-xs">
                            ID: {stop.properties?.stop_id || "N/A"} | Code:{" "}
                            {stop.properties?.stop_code || "N/A"}
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePin(stop.stopId);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1"
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
