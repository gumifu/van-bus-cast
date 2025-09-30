"use client";

interface BusArrival {
  routeNumber: string;
  destination: string;
  arrivalTime: string;
  status: "on-time" | "delayed" | "cancelled";
  color: string;
}

interface BusArrivalsPanelProps {
  isVisible: boolean;
  arrivals: BusArrival[];
  stopName: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function BusArrivalsPanel({
  isVisible,
  arrivals,
  stopName,
  onClose,
  onRefresh,
}: BusArrivalsPanelProps) {
  if (!isVisible) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "on-time":
        return "✅";
      case "delayed":
        return "⚠️";
      case "cancelled":
        return "❌";
      default:
        return "🚌";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "on-time":
        return "On Time";
      case "delayed":
        return "Delayed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-time":
        return "text-green-400";
      case "delayed":
        return "text-yellow-400";
      case "cancelled":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-30 w-80 max-h-96 bg-gray-900 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-semibold text-white">Bus Arrivals</h3>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="text-gray-400 hover:text-white text-sm"
              title="Refresh"
            >
              🔄
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-lg"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-300 truncate">{stopName}</p>
      </div>

      {/* Arrivals List */}
      <div className="max-h-80 overflow-y-auto">
        {arrivals.length > 0 ? (
          <div className="space-y-1 p-2">
            {arrivals.map((arrival, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Route Number */}
                  <div
                    className="w-12 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: arrival.color }}
                  >
                    {arrival.routeNumber}
                  </div>

                  {/* Route Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {arrival.destination}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">
                        {getStatusIcon(arrival.status)}
                      </span>
                      <span className={getStatusColor(arrival.status)}>
                        {getStatusText(arrival.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrival Time */}
                <div className="text-right">
                  <div className="text-white text-lg font-bold">
                    {arrival.arrivalTime}
                  </div>
                  <div className="text-xs text-gray-400">
                    {arrival.status === "delayed" ? "Late" : "Arriving"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-400 text-sm">
            <div className="mb-2">🚌</div>
            <div>No bus arrivals available</div>
            <div className="text-xs mt-1">
              Try refreshing or check back later
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 bg-gray-800">
        <div className="text-xs text-gray-400 text-center">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

