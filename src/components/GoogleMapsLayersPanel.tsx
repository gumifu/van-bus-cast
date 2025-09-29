"use client";

interface Layer {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

interface GoogleMapsLayersPanelProps {
  isVisible: boolean;
  onClose: () => void;
  layers: Layer[];
  onLayerToggle: (layerId: string) => void;
}

export default function GoogleMapsLayersPanel({
  isVisible,
  onClose,
  layers,
  onLayerToggle,
}: GoogleMapsLayersPanelProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 z-20 bg-gray-900 rounded-lg shadow-lg border border-gray-700 w-64">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">レイヤー</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* レイヤーリスト */}
      <div className="p-4">
        <div className="space-y-2">
          {layers.map((layer) => (
            <label
              key={layer.id}
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={() => onLayerToggle(layer.id)}
                className="w-4 h-4 text-gray-300 border-gray-600 rounded focus:ring-gray-500 bg-gray-800"
              />
              <span className="text-2xl">{layer.icon}</span>
              <span className="text-gray-200 font-medium">{layer.name}</span>
            </label>
          ))}
        </div>

        {/* 地図タイプ */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            地図タイプ
          </h4>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
              <input
                type="radio"
                name="mapType"
                value="roadmap"
                defaultChecked
                className="w-4 h-4 text-gray-300 border-gray-600 focus:ring-gray-500 bg-gray-800"
              />
              <span className="text-gray-200">標準</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
              <input
                type="radio"
                name="mapType"
                value="satellite"
                className="w-4 h-4 text-gray-300 border-gray-600 focus:ring-gray-500 bg-gray-800"
              />
              <span className="text-gray-200">衛星</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors">
              <input
                type="radio"
                name="mapType"
                value="terrain"
                className="w-4 h-4 text-gray-300 border-gray-600 focus:ring-gray-500 bg-gray-800"
              />
              <span className="text-gray-200">地形</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
