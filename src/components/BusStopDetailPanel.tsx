"use client";

import { useState, useEffect, useMemo } from "react";

// 遅延グラフコンポーネント
function DelayChart({ arrivals }: { arrivals: any[] }) {
  const chartData = useMemo(() => {
    if (!arrivals || arrivals.length === 0) return null;

    const delays = arrivals
      .map((arrival) => {
        const delaySeconds = arrival.predicted_delay_seconds;
        if (delaySeconds === null || delaySeconds === undefined) return null;
        return Math.round(delaySeconds / 60); // 秒を分に変換
      })
      .filter((d): d is number => d !== null);

    if (delays.length === 0) return null;

    const maxDelay = Math.max(...delays.map(Math.abs));
    const minDelay = Math.min(...delays);
    const range = Math.max(Math.abs(maxDelay), Math.abs(minDelay)) || 1;
    const maxRange = Math.max(Math.abs(maxDelay), Math.abs(minDelay), 5); // 最小範囲を5分に設定

    const width = 300;
    const height = 120;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const centerY = padding + chartHeight / 2;

    // グラフのポイントを計算（中央を0として、上下に分布）
    const points = delays.map((delay, index) => {
      const x = padding + (chartWidth / (delays.length - 1 || 1)) * index;
      // 中央を0として、上方向が正（遅延）、下方向が負（早到）
      const y = centerY - (delay / maxRange) * (chartHeight / 2) * 0.9;
      return { x, y, delay };
    });

    // パスを生成
    const pathData = points
      .map((point, index) => {
        return index === 0
          ? `M ${point.x} ${point.y}`
          : `L ${point.x} ${point.y}`;
      })
      .join(" ");

    return { points, pathData, width, height, maxDelay, minDelay, padding };
  }, [arrivals]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No delay data available for chart
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        width={chartData.width}
        height={chartData.height}
        className="w-full"
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
      >
        {/* グリッド線 */}
        <defs>
          <linearGradient id="delayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
          </linearGradient>
        </defs>

        {/* 中央の基準線（On Time） */}
        <line
          x1={chartData.padding}
          y1={chartData.height / 2}
          x2={chartData.width - chartData.padding}
          y2={chartData.height / 2}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* グラフエリアの背景（グラデーション） */}
        <path
          d={`${chartData.pathData} L ${chartData.width - chartData.padding} ${
            chartData.height / 2
          } L ${chartData.padding} ${chartData.height / 2} Z`}
          fill="url(#delayGradient)"
          opacity="0.3"
        />

        {/* 遅延線 */}
        <path
          d={chartData.pathData}
          fill="none"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* データポイント */}
        {chartData.points.map((point, index) => {
          const color =
            point.delay === 0
              ? "rgb(34, 197, 94)"
              : point.delay < 0
              ? "rgb(59, 130, 246)"
              : point.delay <= 2
              ? "rgb(251, 191, 36)"
              : "rgb(239, 68, 68)";

          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}

        {/* Y軸ラベル */}
        <text
          x={10}
          y={chartData.height / 2 + 4}
          fill="rgba(255, 255, 255, 0.6)"
          fontSize="10"
          textAnchor="middle"
        >
          0
        </text>
        {/* 最大値ラベル */}
        {chartData.maxDelay > 0 && (
          <text
            x={10}
            y={chartData.padding + 10}
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="9"
            textAnchor="middle"
          >
            +{chartData.maxDelay}min
          </text>
        )}
        {/* 最小値ラベル（負の値の場合） */}
        {chartData.minDelay < 0 && (
          <text
            x={10}
            y={chartData.height - chartData.padding + 14}
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="9"
            textAnchor="middle"
          >
            {chartData.minDelay}min
          </text>
        )}
      </svg>

      {/* 凡例と統計 */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>On Time</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Early</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Delayed</span>
          </div>
        </div>
        <div className="text-gray-400">
          Max: {chartData.maxDelay}min | Min: {chartData.minDelay}min
        </div>
      </div>
    </div>
  );
}

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
  const [routeFirstArrivals, setRouteFirstArrivals] = useState<{
    [route: string]: {
      destination: string;
      scheduledTime: string;
      predictedTime: string;
      arrivalTimeFormatted: string; // HH:MM:SS形式の時刻
      delayMinutes: number; // 遅延分数（モーダルの最初の到着時刻から）
    };
  }>({});

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

  // 全ルートの最初の到着情報を取得（定刻と行き先）
  useEffect(() => {
    const fetchAllRouteFirstArrivals = async () => {
      if (!selectedStopId || !isOpen) {
        setRouteFirstArrivals({});
        return;
      }

      try {
        const response = await fetch(
          `/api/stops/${selectedStopId}/predictions`
        );

        if (!response.ok) {
          console.error("Failed to fetch stop predictions:", response.status);
          return;
        }

        const data = await response.json();
        if (data.arrivals && Array.isArray(data.arrivals)) {
          const routeArrivalsMap: {
            [route: string]: any[];
          } = {};

          // trip_headsignから路線番号を抽出する関数（ClientMapと同じロジック）
          const extractRouteNumber = (
            tripHeadsign: string | null | undefined
          ): string | null => {
            if (!tripHeadsign) return null;
            // "44 UBC"のような形式から"44"を抽出（最初の数字）
            const match = tripHeadsign.match(/^(\d+)/);
            return match ? match[1] : null;
          };

          // 各ルートの全ての到着情報を集計
          data.arrivals.forEach((arrival: any) => {
            const routeNumber = extractRouteNumber(arrival.trip_headsign || "");
            if (!routeNumber) return;

            if (!routeArrivalsMap[routeNumber]) {
              routeArrivalsMap[routeNumber] = [];
            }
            routeArrivalsMap[routeNumber].push(arrival);
          });

          // 時間をカナダ式（12時間制AM/PM）に変換
          const formatCanadianTime = (timeStr: string): string => {
            if (!timeStr) return "N/A";

            // ISO 8601形式（例: "2024-01-01T15:04:00Z" または "2024-01-01T15:04:00-08:00"）を処理
            try {
              const isoDate = new Date(timeStr);
              if (!isNaN(isoDate.getTime())) {
                // 現地時間（カナダ）に変換
                const hour24 = isoDate.getHours();
                const minute = String(isoDate.getMinutes()).padStart(2, "0");
                const hour12 =
                  hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                const ampm = hour24 < 12 ? "AM" : "PM";
                return `${hour12}:${minute} ${ampm}`;
              }
            } catch (e) {
              // ISO形式でない場合、次の処理へ
            }

            // HH:MM:SS形式またはHH:MM形式から時間と分を抽出
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
            if (timeMatch) {
              const hour24 = parseInt(timeMatch[1], 10);
              const minute = timeMatch[2];
              const hour12 =
                hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
              const ampm = hour24 < 12 ? "AM" : "PM";
              return `${hour12}:${minute} ${ampm}`;
            }

            // 既に12時間制形式の場合（例: "2:30 PM"）
            if (timeStr.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) {
              return timeStr;
            }

            return timeStr; // その他の形式の場合
          };

          // 時間文字列をDateオブジェクトに変換（タイムゾーンを考慮）
          const parseTime = (timeStr: string): Date | null => {
            if (!timeStr) return null;

            // ISO 8601形式を試す
            try {
              const isoDate = new Date(timeStr);
              if (!isNaN(isoDate.getTime())) {
                return isoDate; // 既に正しいDateオブジェクト
              }
            } catch (e) {
              // ISO形式でない場合、次の処理へ
            }

            // HH:MM:SS形式またはHH:MM形式を処理
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
            if (!timeMatch) return null;

            const now = new Date();
            const hour = parseInt(timeMatch[1], 10);
            const minute = parseInt(timeMatch[2], 10);
            const date = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              hour,
              minute,
              0
            );
            return date;
          };

          const firstArrivals: {
            [route: string]: {
              destination: string;
              scheduledTime: string;
              predictedTime: string;
              arrivalTimeFormatted: string;
              delayMinutes: number;
            };
          } = {};

          // クリックした時点の現在時刻を取得（useEffectの実行時点）
          const clickTime = new Date();

          // 各ルートで現在時刻に最も近い未来の到着情報を選択
          Object.keys(routeArrivalsMap).forEach((routeNumber) => {
            const arrivals = routeArrivalsMap[routeNumber];
            if (arrivals.length === 0) return;

            // 最も近い未来の到着情報を見つける
            let closestArrival: any | null = null;
            let closestTimeDiff = Infinity;

            arrivals.forEach((arrival: any) => {
              // 定刻を優先的に使用
              const rawTime =
                arrival.scheduled_arrival_time ||
                arrival.arrival_time ||
                arrival.next_arrival_time ||
                arrival.estimated_arrival_time ||
                "";

              if (!rawTime) return;

              const arrivalTime = parseTime(rawTime);
              if (!arrivalTime) {
                // デバッグ用
                if (process.env.NODE_ENV === "development") {
                  console.warn(
                    `Route ${routeNumber}: Could not parse time:`,
                    rawTime
                  );
                }
                return;
              }

              // ISO形式の場合、既に正しい時刻になっている
              // HH:MM形式の場合、今日または明日の時刻として扱う
              if (arrivalTime < clickTime) {
                // 過去の時刻の場合は、明日の時刻として扱う
                const tomorrowTime = new Date(arrivalTime);
                tomorrowTime.setDate(tomorrowTime.getDate() + 1);

                // 明日でも過去の場合（例: 深夜の時刻）、さらに1日加算
                if (tomorrowTime < clickTime) {
                  tomorrowTime.setDate(tomorrowTime.getDate() + 1);
                }

                const timeDiff = tomorrowTime.getTime() - clickTime.getTime();
                if (timeDiff >= 0 && timeDiff < closestTimeDiff) {
                  closestTimeDiff = timeDiff;
                  closestArrival = arrival;
                  // 使用する時刻も更新
                  arrival._parsedTime = tomorrowTime;
                }
              } else {
                // 未来の時刻の場合
                const timeDiff = arrivalTime.getTime() - clickTime.getTime();
                if (timeDiff >= 0 && timeDiff < closestTimeDiff) {
                  closestTimeDiff = timeDiff;
                  closestArrival = arrival;
                  arrival._parsedTime = arrivalTime;
                }
              }
            });

            // 最も近い到着情報が見つからなかった場合は最初のものを使用
            if (!closestArrival) {
              closestArrival = arrivals[0];
            }

            // 最も近い到着情報からデータを抽出
            const rawScheduledTime =
              closestArrival.scheduled_arrival_time ||
              closestArrival.arrival_time ||
              closestArrival.next_arrival_time ||
              closestArrival.estimated_arrival_time ||
              "";

            // デバッグ用: 実際のAPIレスポンスを確認
            if (process.env.NODE_ENV === "development") {
              console.log(`Route ${routeNumber}:`, {
                rawTime: rawScheduledTime,
                parsedTime:
                  closestArrival._parsedTime || parseTime(rawScheduledTime),
                clickTime: clickTime,
                arrival: closestArrival,
              });
            }

            // パース済みの時刻がある場合はそれを使用、ない場合はパース
            const scheduledDate =
              closestArrival._parsedTime || parseTime(rawScheduledTime);
            const scheduledTime = scheduledDate
              ? formatCanadianTime(scheduledDate.toISOString())
              : formatCanadianTime(rawScheduledTime);

            // 遅延予想時間を計算
            let predictedTime = "N/A";
            if (
              closestArrival.predicted_delay_seconds !== null &&
              closestArrival.predicted_delay_seconds !== undefined
            ) {
              const baseDate = scheduledDate;
              if (baseDate) {
                const delayMs = closestArrival.predicted_delay_seconds * 1000;
                const predictedDate = new Date(baseDate.getTime() + delayMs);
                predictedTime = formatCanadianTime(predictedDate.toISOString());
              }
            }

            // 行き先から路線番号を完全に削除
            let destination = closestArrival.trip_headsign || "Unknown";
            destination = destination.replace(/^Route\s+\d+\s*-\s*/i, "");
            destination = destination.replace(/^\d+\s+/, "");
            destination = destination.replace(/^\d+/, "").trim();
            if (!destination) {
              destination = "Unknown";
            }

            // モーダルで表示される最初の到着時刻の形式（HH:MM:SS）を作成
            const arrivalTimeFormatted = scheduledDate
              ? `${String(scheduledDate.getHours()).padStart(2, "0")}:${String(
                  scheduledDate.getMinutes()
                ).padStart(2, "0")}:${String(
                  scheduledDate.getSeconds()
                ).padStart(2, "0")}`
              : "";

            // 遅延分数を計算（モーダルで表示される最初の到着時刻から）
            const delayMinutes =
              closestArrival.predicted_delay_seconds !== null &&
              closestArrival.predicted_delay_seconds !== undefined
                ? Math.round(closestArrival.predicted_delay_seconds / 60)
                : 0;

            firstArrivals[routeNumber] = {
              destination: destination,
              scheduledTime: scheduledTime,
              predictedTime: predictedTime,
              arrivalTimeFormatted: arrivalTimeFormatted,
              delayMinutes: delayMinutes,
            };
          });

          setRouteFirstArrivals(firstArrivals);
        }
      } catch (error) {
        console.error("Error fetching route first arrivals:", error);
      }
    };

    fetchAllRouteFirstArrivals();
  }, [selectedStopId, isOpen]);

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
        className={`hidden md:block fixed top-0 right-0 w-80 h-full bg-white/10 backdrop-blur-xl text-white shadow-2xl transform transition-transform duration-300 ease-out z-50 border-l border-white/20 ${
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
            {/* Delay Status */}
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
            <div className="space-y-1 text-sm text-gray-400 mt-3">
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

          {/* 路線別遅延情報 */}
          {getStopRoutes().length > 0 && (
            <div className="mt-4 border-t border-white/20 pt-4">
              <h5 className=" text-white mb-3 font-semibold">Route Delays</h5>
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
                          {routeFirstArrivals[route]?.destination && (
                            <span className="text-white font-medium text-sm">
                              {routeFirstArrivals[route].destination}
                            </span>
                          )}
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
                      {routeFirstArrivals[route] && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Scheduled:</span>
                            <span className="text-white font-medium">
                              {routeFirstArrivals[route].scheduledTime}
                            </span>
                          </div>
                        </div>
                      )}
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
                          {routeFirstArrivals[route]?.destination && (
                            <span className="text-white font-medium text-xs">
                              {routeFirstArrivals[route].destination}
                            </span>
                          )}
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
                      {routeFirstArrivals[route] && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/10">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Scheduled:</span>
                            <span className="text-white font-medium text-xs">
                              {routeFirstArrivals[route].scheduledTime}
                            </span>
                          </div>
                        </div>
                      )}
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
              <div className="space-y-4">
                {/* 遅延グラフ */}
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Delay Trend
                  </h4>
                  <DelayChart arrivals={routeArrivals} />
                </div>

                {/* 到着時刻リスト */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Arrival Times
                  </h4>
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
                </div>
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
