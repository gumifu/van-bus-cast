"use client";

interface GoogleMapsControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreen: () => void;
  onMyLocation: () => void;
  onLayerToggle: () => void;
  onStreetView: () => void;
  isFullscreen: boolean;
  showLayers: boolean;
}

export default function GoogleMapsControls({
  onZoomIn,
  onZoomOut,
  onFullscreen,
  onMyLocation,
  onLayerToggle,
  onStreetView,
  isFullscreen,
  showLayers,
}: GoogleMapsControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
      {/* ズームコントロール */}
      <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <button
          onClick={onZoomIn}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-800 transition-colors border-b border-gray-700 cursor-pointer"
          title="ズームイン"
        >
          <svg
            className="w-5 h-5 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>
        <button
          onClick={onZoomOut}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
          title="ズームアウト"
        >
          <svg
            className="w-5 h-5 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 12H6"
            />
          </svg>
        </button>
      </div>

      {/* 現在地ボタン */}
      <button
        onClick={onMyLocation}
        className="w-10 h-10 bg-gray-900 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
        title="現在地"
      >
        <svg
          className="w-5 h-5 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* レイヤー切り替えボタン */}
      {/* <button
        onClick={onLayerToggle}
        className={`w-10 h-10 rounded-lg shadow-lg border flex items-center justify-center transition-colors ${
          showLayers
            ? "bg-gray-700 text-white border-gray-600"
            : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800"
        }`}
        title="レイヤー"
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
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button> */}

      {/* ストリートビューボタン */}
      {/* <button
        onClick={onStreetView}
        className="w-10 h-10 bg-gray-900 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
        title="ストリートビュー"
      >
        <svg
          className="w-5 h-5 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </button> */}

      {/* フルスクリーンボタン */}
      <button
        onClick={onFullscreen}
        className="w-10 h-10 bg-gray-900 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
        title={isFullscreen ? "フルスクリーン終了" : "フルスクリーン"}
      >
        {isFullscreen ? (
          <svg
            className="w-5 h-5 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v4.5M15 15h4.5m0 0l-5.5 5.5"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
