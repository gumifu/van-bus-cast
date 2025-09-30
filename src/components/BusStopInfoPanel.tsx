"use client";

interface BusStopInfoPanelProps {
  isVisible: boolean;
  onClose: () => void;
  userLocation: [number, number] | null;
}

export default function BusStopInfoPanel({
  isVisible,
  onClose,
  userLocation,
}: BusStopInfoPanelProps) {
  if (!isVisible) return null;

  return (
    <>
      {/* デスクトップ版 */}
      <div className="hidden md:block absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded max-w-xs">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-sm">バス停クラスタリング</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg ml-2"
          >
            ×
          </button>
        </div>
        <p className="text-xs mb-1">Translinkの全バス停をGeoJSONで表示</p>
        {userLocation && (
          <div className="text-xs text-gray-300 mb-2">
            <p className="font-semibold">あなたの位置:</p>
            <p>緯度: {userLocation[1].toFixed(6)}</p>
            <p>経度: {userLocation[0].toFixed(6)}</p>
          </div>
        )}
        <div className="mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>個別バス停</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
            <span>クラスター（小）</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>クラスター（中）</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
            <span>クラスター（大）</span>
          </div>
        </div>

        <p className="text-xs text-gray-300 mt-2">
          ズームアウト: クラスター表示
          <br />
          ズームイン: 個別バス停表示
        </p>
      </div>

      {/* モバイル版（下部1/3） */}
      <div className="md:hidden h-1/3 bg-gray-900 text-white p-4 overflow-y-auto flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">バス停情報</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">クラスタリング説明</h4>
            <p className="text-xs text-gray-300 mb-3">
              Translinkの全バス停をGeoJSONで表示
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>個別バス停</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                <span>クラスター（小）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span>クラスター（中）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                <span>クラスター（大）</span>
              </div>
            </div>
          </div>

          {userLocation && (
            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-2">あなたの位置</h4>
              <div className="text-xs text-gray-300">
                <p>緯度: {userLocation[1].toFixed(6)}</p>
                <p>経度: {userLocation[0].toFixed(6)}</p>
              </div>
            </div>
          )}

          <div className="border-t pt-3">
            <h4 className="font-semibold text-sm mb-2">操作方法</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <p>• ズームアウト: クラスター表示</p>
              <p>• ズームイン: 個別バス停表示</p>
              <p>• バス停をタップ: 詳細情報表示</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
