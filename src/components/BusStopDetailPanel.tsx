"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Chart.jsの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 時刻をカナダ式（12時間制AM/PM）に変換（秒なし）
const formatCanadianTime = (timeStr: string): string => {
  if (!timeStr) return "N/A";
  try {
    const isoDate = new Date(timeStr);
    if (!isNaN(isoDate.getTime())) {
      const hour24 = isoDate.getHours();
      const minute = String(isoDate.getMinutes()).padStart(2, "0");
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 < 12 ? "AM" : "PM";
      return `${hour12}:${minute} ${ampm}`;
    }
  } catch (e) {}
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hour24 = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2];
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 < 12 ? "AM" : "PM";
    return `${hour12}:${minute} ${ampm}`;
  }
  return timeStr;
};

// 遅延グラフコンポーネント（Chart.js使用）
function DelayChart({ arrivals }: { arrivals: any[] }) {
  const chartData = useMemo(() => {
    if (!arrivals || arrivals.length === 0) return null;

    // 3時間以内の到着のみをフィルタリング（ミリ秒単位）
    const now = new Date();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3時間 = 10,800,000ミリ秒

    // 時刻をパースする関数
    const parseTime = (timeStr: string): Date | null => {
      if (!timeStr) return null;
      try {
        const isoDate = new Date(timeStr);
        if (!isNaN(isoDate.getTime())) {
          return isoDate;
        }
      } catch (e) {}
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
      if (!timeMatch) return null;
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

    // 3時間以内の到着のみをフィルタリング
    const filteredArrivals = arrivals.filter((arrival: any) => {
      const rawTime =
        arrival.scheduled_arrival_time ||
        arrival.arrival_time ||
        arrival.next_arrival_time ||
        arrival.estimated_arrival_time ||
        "";

      if (!rawTime) return false;

      const arrivalTime = parseTime(rawTime);
      if (!arrivalTime) return false;

      // 過去の時刻の場合は、明日の時刻として扱う
      let actualArrivalTime: Date;
      if (arrivalTime < now) {
        const tomorrowTime = new Date(arrivalTime);
        tomorrowTime.setDate(tomorrowTime.getDate() + 1);
        if (tomorrowTime < now) {
          tomorrowTime.setDate(tomorrowTime.getDate() + 1);
        }
        actualArrivalTime = tomorrowTime;
      } else {
        actualArrivalTime = arrivalTime;
      }

      const timeDiff = actualArrivalTime.getTime() - now.getTime();
      return timeDiff >= 0 && timeDiff <= THREE_HOURS_MS;
    });

    if (filteredArrivals.length === 0) return null;

    // 秒単位の遅延を取得
    const delaysInSeconds = filteredArrivals
      .map((arrival) => {
        const delaySeconds = arrival.predicted_delay_seconds;
        if (delaySeconds === null || delaySeconds === undefined) return null;
        return delaySeconds;
      })
      .filter((d): d is number => d !== null);

    if (delaysInSeconds.length === 0) return null;

    // 到着時刻を取得（時間表示用）
    const labels = filteredArrivals.map((arrival) => {
      const timeStr = arrival.arrival_time || arrival.next_arrival_time || "";
      return formatCanadianTime(timeStr);
    });

    // 分単位の遅延（表示用）
    const delaysInMinutes = delaysInSeconds.map((s) => s / 60);

    // 最大・最小遅延を計算
    const maxDelay = Math.max(...delaysInMinutes);
    const minDelay = Math.min(...delaysInMinutes);
    const delayRange = Math.max(maxDelay - minDelay, 5); // 最小範囲は5分

    // Y軸のスケールを5分単位で計算
    // 遅延の幅が5分以下なら5分単位、5分超なら10分単位、10分超なら15分単位...と設定
    const stepSize = 5;
    const rangeInSteps = Math.ceil(delayRange / stepSize);
    const yAxisMax = Math.ceil(maxDelay / stepSize) * stepSize + stepSize; // 上に少し余白
    const yAxisMin = Math.floor(minDelay / stepSize) * stepSize - stepSize; // 下に少し余白

    // データポイントの色を決定
    const pointBackgroundColors = delaysInMinutes.map((delay) => {
      if (delay === 0) return "rgb(34, 197, 94)"; // 緑 - On Time
      if (delay < 0) return "rgb(59, 130, 246)"; // 青 - Early
      if (delay <= 2) return "rgb(251, 191, 36)"; // 黄 - Delayed
      return "rgb(239, 68, 68)"; // 赤 - Severely Delayed
    });

    return {
      labels,
      delays: delaysInMinutes,
      delaysInSeconds,
      maxDelay,
      minDelay,
      delayRange,
      yAxisMax,
      yAxisMin,
      pointBackgroundColors,
      arrivals: filteredArrivals,
    };
  }, [arrivals]);

  if (!chartData) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No delay data available for chart
      </div>
    );
  }

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Delay (min)",
        data: chartData.delays,
        borderColor: "rgba(59, 130, 246, 0.8)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        pointBackgroundColor: chartData.pointBackgroundColors,
        pointBorderColor: "rgba(255, 255, 255, 0.8)",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        titleColor: "rgba(255, 255, 255, 0.9)",
        bodyColor: "rgba(255, 255, 255, 0.7)",
        borderColor: "rgba(255, 255, 255, 0.3)",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context: any) {
            const index = context.dataIndex;
            const arrival = chartData.arrivals[index];
            const delaySeconds = chartData.delaysInSeconds[index];
            const delayMin = chartData.delays[index];

            let tooltipText = [
              `Delay: ${delaySeconds >= 0 ? "+" : ""}${delaySeconds.toFixed(
                0
              )}s (${delayMin >= 0 ? "+" : ""}${delayMin.toFixed(1)}min)`,
            ];

            if (arrival?.trip_headsign) {
              tooltipText.push(`Destination: ${arrival.trip_headsign}`);
            }

            // Scheduled時刻を計算
            const arrivalTime =
              arrival?.arrival_time || arrival?.next_arrival_time || "";
            if (arrivalTime && arrival?.predicted_delay_seconds !== null) {
              try {
                const arrivalDate = new Date(arrivalTime);
                if (!isNaN(arrivalDate.getTime())) {
                  const delayMs = arrival.predicted_delay_seconds * 1000;
                  const scheduledDate = new Date(
                    arrivalDate.getTime() - delayMs
                  );
                  tooltipText.push(
                    `Scheduled: ${formatCanadianTime(
                      scheduledDate.toISOString()
                    )}`
                  );
                }
              } catch (e) {}
            }

            return tooltipText;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Time",
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            size: 12,
            weight: "normal" as const,
          },
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.5)",
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      y: {
        title: {
          display: true,
          text: "Delay (min)",
          color: "rgba(255, 255, 255, 0.7)",
          font: {
            size: 12,
            weight: "normal" as const,
          },
        },
        min: chartData.yAxisMin,
        max: chartData.yAxisMax,
        ticks: {
          stepSize: 5, // 5分単位
          color: "rgba(255, 255, 255, 0.5)",
          callback: function (value: any) {
            return value >= 0 ? `+${value}` : `${value}`;
          },
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="relative w-full">
      <div style={{ height: "250px", width: "100%" }}>
        <Line data={data} options={options} />
      </div>
      {/* 凡例と統計 */}
      <div className="mt-8 flex items-center justify-between text-xs text-gray-300">
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
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Severely Delayed</span>
          </div>
        </div>
        <div className="text-gray-400">
          Max: {chartData.maxDelay.toFixed(1)}min | Min:{" "}
          {chartData.minDelay.toFixed(1)}min
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
  routeDelays: { [key: string]: number | null };
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
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeData, setRouteData] = useState<any>(null); // APIレスポンス全体を保存
  const [routeFirstArrivals, setRouteFirstArrivals] = useState<{
    [route: string]: {
      destination: string;
      scheduledTime: string;
      predictedTime: string;
      arrivalTimeFormatted: string; // HH:MM:SS形式の時刻
      delayMinutes: number | null; // 遅延分数（モーダルの最初の到着時刻から、nullを許容）
    };
  }>({});

  // 選択されたルートの詳細な到着時刻を取得
  useEffect(() => {
    const fetchRouteArrivals = async () => {
      if (!selectedRoute || !selectedStopId) {
        setRouteArrivals([]);
        return;
      }

      setLoadingArrivals(true);
      try {
        // routeIdMappingが存在する場合は、ルート固有のAPIエンドポイントを使用
        // 存在しない場合は、全ルートのAPIからフィルタリング
        let data: any;

        if (routeIdMapping[selectedRoute]) {
          const routeId = routeIdMapping[selectedRoute];
          const response = await fetch(
            `/api/stops/${selectedStopId}/routes/${routeId}/predictions`
          );

          if (!response.ok) {
            console.error("Failed to fetch route arrivals:", response.status);
            setRouteArrivals([]);
            setLoadingArrivals(false);
            return;
          }

          data = await response.json();
        } else {
          // routeIdMappingが存在しない場合は、全ルートのAPIから取得してフィルタリング
          const response = await fetch(
            `/api/stops/${selectedStopId}/predictions`
          );

          if (!response.ok) {
            console.error("Failed to fetch stop predictions:", response.status);
            setRouteArrivals([]);
            setLoadingArrivals(false);
            return;
          }

          data = await response.json();

          // trip_headsignから路線番号を抽出する関数
          const extractRouteNumber = (
            tripHeadsign: string | null | undefined
          ): string | null => {
            if (!tripHeadsign) return null;
            const match = tripHeadsign.match(/^(\d+)/);
            return match ? match[1] : null;
          };

          // 選択されたルート番号と一致する到着のみをフィルタリング
          if (data.arrivals && Array.isArray(data.arrivals)) {
            data.arrivals = data.arrivals.filter((arrival: any) => {
              const routeNumber = extractRouteNumber(
                arrival.trip_headsign || ""
              );
              return routeNumber === selectedRoute;
            });
          }
        }

        if (data.arrivals && Array.isArray(data.arrivals)) {
          const now = new Date();
          const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3時間 = 10,800,000ミリ秒

          // 時刻をパースする関数（fetchAllRouteFirstArrivalsと同じロジック）
          const parseTime = (timeStr: string): Date | null => {
            if (!timeStr) return null;
            try {
              const isoDate = new Date(timeStr);
              if (!isNaN(isoDate.getTime())) {
                return isoDate;
              }
            } catch (e) {}
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
            if (!timeMatch) return null;
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

          // 3時間以内の到着のみをフィルタリング（nullの予測値も含める）
          const filteredArrivals = data.arrivals.filter((arrival: any) => {
            // 3時間以内の到着のみをフィルタリング
            const rawTime =
              arrival.scheduled_arrival_time ||
              arrival.arrival_time ||
              arrival.next_arrival_time ||
              arrival.estimated_arrival_time ||
              "";

            if (!rawTime) return false;

            const arrivalTime = parseTime(rawTime);
            if (!arrivalTime) return false;

            // 過去の時刻の場合は、明日の時刻として扱う
            let actualArrivalTime: Date;
            if (arrivalTime < now) {
              const tomorrowTime = new Date(arrivalTime);
              tomorrowTime.setDate(tomorrowTime.getDate() + 1);
              if (tomorrowTime < now) {
                tomorrowTime.setDate(tomorrowTime.getDate() + 1);
              }
              actualArrivalTime = tomorrowTime;
            } else {
              actualArrivalTime = arrivalTime;
            }

            const timeDiff = actualArrivalTime.getTime() - now.getTime();
            return timeDiff >= 0 && timeDiff <= THREE_HOURS_MS;
          });

          setRouteArrivals(filteredArrivals);
          setRouteData(data); // APIレスポンス全体を保存

          // デバッグログ
          if (process.env.NODE_ENV === "development") {
            console.log("BusStopDetailPanel: fetchRouteArrivals", {
              selectedRoute,
              routeIdMapping: routeIdMapping[selectedRoute],
              totalArrivals: data.arrivals?.length || 0,
              filteredArrivals: filteredArrivals.length,
              route: data.route,
              fullData: data,
            });
          }
        } else {
          setRouteArrivals([]);
          setRouteData(null);

          // デバッグログ
          if (process.env.NODE_ENV === "development") {
            console.warn("BusStopDetailPanel: No arrivals data", {
              selectedRoute,
              data,
            });
          }
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
        setLoadingRoutes(false);
        return;
      }

      setLoadingRoutes(true);
      try {
        const response = await fetch(
          `/api/stops/${selectedStopId}/predictions`
        );

        if (!response.ok) {
          console.error("Failed to fetch stop predictions:", response.status);
          setLoadingRoutes(false);
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

          // 各ルートの全ての到着情報を集計（nullの予測値も含める - Scheduled時刻を表示するため）
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
              delayMinutes: number | null;
            };
          } = {};

          // クリックした時点の現在時刻を取得（useEffectの実行時点）
          const clickTime = new Date();

          // 3時間以内の到着のみをフィルタリング（ミリ秒単位）
          const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3時間 = 10,800,000ミリ秒

          // 各ルートで現在時刻に最も近い未来の到着情報を選択（3時間以内のみ）
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
              let actualArrivalTime: Date;
              if (arrivalTime < clickTime) {
                // 過去の時刻の場合は、明日の時刻として扱う
                const tomorrowTime = new Date(arrivalTime);
                tomorrowTime.setDate(tomorrowTime.getDate() + 1);

                // 明日でも過去の場合（例: 深夜の時刻）、さらに1日加算
                if (tomorrowTime < clickTime) {
                  tomorrowTime.setDate(tomorrowTime.getDate() + 1);
                }
                actualArrivalTime = tomorrowTime;
              } else {
                actualArrivalTime = arrivalTime;
              }

              const timeDiff =
                actualArrivalTime.getTime() - clickTime.getTime();

              // 3時間以内の到着のみを考慮
              if (
                timeDiff >= 0 &&
                timeDiff <= THREE_HOURS_MS &&
                timeDiff < closestTimeDiff
              ) {
                closestTimeDiff = timeDiff;
                closestArrival = arrival;
                // 使用する時刻も更新
                arrival._parsedTime = actualArrivalTime;
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

            // 遅延予想時間を計算（nullの場合はScheduled時刻を表示）
            let predictedTime = scheduledTime; // デフォルトはScheduled時刻
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
                : null;

            firstArrivals[routeNumber] = {
              destination: destination,
              scheduledTime: scheduledTime,
              predictedTime: predictedTime,
              arrivalTimeFormatted: arrivalTimeFormatted,
              delayMinutes: delayMinutes,
            };
          });

          setRouteFirstArrivals(firstArrivals);
        } else {
          // arrivalsが存在しない、または空の場合
          console.warn("BusStopDetailPanel: No arrivals data or empty array");
          setRouteFirstArrivals({});
        }
      } catch (error) {
        console.error("Error fetching route first arrivals:", error);
        setRouteFirstArrivals({});
      } finally {
        setLoadingRoutes(false);
      }
    };

    fetchAllRouteFirstArrivals();
  }, [selectedStopId, isOpen]);

  // 選択したバス停に停まる路線を取得
  const getStopRoutes = () => {
    if (!selectedStop?.properties?.stop_id) return [];

    // routeDelaysとrouteFirstArrivalsの両方からルートを取得
    // 予測値がnullの場合でも、Scheduled時刻を表示するため
    const routeSet = new Set<string>();

    // routeDelaysに含まれるルートを追加
    Object.keys(routeDelays).forEach((routeId) => {
      if (routeDelays[routeId] !== undefined) {
        routeSet.add(routeId);
      }
    });

    // routeFirstArrivalsに含まれるルートも追加（予測値がnullの場合でもScheduled時刻を表示）
    Object.keys(routeFirstArrivals).forEach((routeId) => {
      routeSet.add(routeId);
    });

    const stopRoutes = Array.from(routeSet);

    // デバッグログ
    if (process.env.NODE_ENV === "development") {
      console.log("BusStopDetailPanel: getStopRoutes", {
        routeDelays: Object.keys(routeDelays),
        routeFirstArrivals: Object.keys(routeFirstArrivals),
        stopRoutes: stopRoutes,
      });
    }

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
          <h2 className="text-lg font-semibold">Bus Stop Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors text-xl w-11 h-11 flex items-center justify-center cursor-pointer"
            aria-label="Close bus stop details"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto h-full">
          {/* バス停情報 */}
          <div>
            <div className="flex items-center justify-between mb-2 text-lg pr-1">
              <h3 className="font-semibold text-white">
                {selectedStop.properties?.stop_name || "Unknown Stop"}
              </h3>
              <button
                onClick={() => {
                  if (selectedStop?.properties?.stop_id) {
                    onTogglePin(selectedStop.properties.stop_id, selectedStop);
                  }
                }}
                className={`w-11 h-11 flex items-center justify-center rounded text-lg hover:bg-gray-700 transition-colors cursor-pointer ${
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
                aria-label={
                  selectedStop?.properties?.stop_id &&
                  pinnedStops.has(selectedStop.properties.stop_id)
                    ? "Remove pin from this bus stop"
                    : "Pin this bus stop"
                }
              >
                📍
              </button>
            </div>
            {/* Delay Status */}
            {stopDelays[selectedStop?.properties?.stop_id] !== null &&
              stopDelays[selectedStop?.properties?.stop_id] !== undefined && (
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow-lg">
                  <h3 className="font-semibold text-white mb-2 text-sm">
                    Delay Status
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {getDelayLevelName(
                          stopDelays[selectedStop?.properties?.stop_id]!
                        )}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-2xl">
                        {getDelaySymbol(
                          stopDelays[selectedStop?.properties?.stop_id]!
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-300">
                    Last updated:{" "}
                    {new Date().toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              )}
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
          <div className="mt-4 border-t border-white/20 pt-4">
            <h4 className="text-white mb-3 font-semibold">Route Delays</h4>
            {loadingRoutes ? (
              <div
                className="text-center py-4 flex items-center justify-center gap-2"
                style={{
                  animation: "fadeIn 0.3s ease-in",
                }}
              >
                <span className="text-gray-400 text-sm">Loading...</span>
              </div>
            ) : getStopRoutes().length > 0 ? (
              <div className="space-y-2">
                {getStopRoutes().map((route, index) => {
                  const delay = routeDelays[route];
                  const hasDelayInfo = delay !== null && delay !== undefined;
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
                    <button
                      key={route}
                      className="w-full text-left bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20 cursor-pointer hover:bg-white/20 transition-all shadow-lg hover:shadow-xl"
                      onClick={() => {
                        setSelectedRoute(route);
                        setShowForecast(true);
                      }}
                      aria-label={`View details for route ${route}`}
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
                        {hasDelayInfo && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">
                              {getDelayLevelName(delay)}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span className="text-lg">
                              {getDelaySymbol(delay)}
                            </span>
                          </div>
                        )}
                      </div>
                      {routeFirstArrivals[route] && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Scheduled:</span>
                            <span className="text-white font-medium">
                              {routeFirstArrivals[route].scheduledTime}
                            </span>
                          </div>
                          {routeFirstArrivals[route].predictedTime &&
                            routeFirstArrivals[route].predictedTime !==
                              routeFirstArrivals[route].scheduledTime && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">
                                  Predicted:
                                </span>
                                <span className="text-white font-medium">
                                  {routeFirstArrivals[route].predictedTime}
                                </span>
                              </div>
                            )}
                          {routeFirstArrivals[route].predictedTime ===
                            routeFirstArrivals[route].scheduledTime && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">Predicted:</span>
                              <span className="text-white font-medium">
                                {routeFirstArrivals[route].predictedTime} (On
                                Time)
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                No data
              </div>
            )}
          </div>

          {/* 位置情報 */}
          <div className="border-t border-white/20 pt-4">
            <h3 className="font-semibold text-white mb-2">Location</h3>
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
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-xl text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-t border-white/20 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          willChange: "transform",
        }}
      >
        <div className="flex items-center justify-between p-3 border-b border-white/20">
          <h2 className="text-lg font-semibold">Bus Stop Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors text-xl w-11 h-11 flex items-center justify-center cursor-pointer"
            aria-label="Close bus stop details"
          >
            ×
          </button>
        </div>

        <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
          {/* バス停情報 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white text-lg">
                {selectedStop.properties?.stop_name || "Unknown Stop"}
              </h3>
              <button
                onClick={() => {
                  if (selectedStop?.properties?.stop_id) {
                    onTogglePin(selectedStop.properties.stop_id, selectedStop);
                  }
                }}
                className={`w-11 h-11 flex items-center justify-center rounded text-base hover:bg-gray-700 transition-colors ${
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
                aria-label={
                  selectedStop?.properties?.stop_id &&
                  pinnedStops.has(selectedStop.properties.stop_id)
                    ? "Remove pin from this bus stop"
                    : "Pin this bus stop"
                }
              >
                📍
              </button>
            </div>
            {/* Delay Status */}
            {stopDelays[selectedStop?.properties?.stop_id] !== null &&
              stopDelays[selectedStop?.properties?.stop_id] !== undefined && (
                <div className="border-t border-white/20 pt-3">
                  <h3 className="font-semibold text-white mb-2 text-base">
                    Delay Status
                  </h3>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20 shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-base">
                          {getDelayLevelName(
                            stopDelays[selectedStop?.properties?.stop_id]!
                          )}
                        </span>
                        <span className="text-gray-400">|</span>
                        <span className="text-2xl">
                          {getDelaySymbol(
                            stopDelays[selectedStop?.properties?.stop_id]!
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      Last updated:{" "}
                      {new Date().toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              )}
            <div className="space-y-1 text-sm text-gray-400 mt-2">
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
          <div className="mt-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Route Delays
            </h4>
            {loadingRoutes ? (
              <div
                className="text-center py-3 flex items-center justify-center gap-2"
                style={{
                  animation: "fadeIn 0.3s ease-in",
                }}
              >
                <span className="text-gray-400 text-sm">Loading...</span>
              </div>
            ) : getStopRoutes().length > 0 ? (
              <div className="space-y-2">
                {getStopRoutes().map((route, index) => {
                  const delay = routeDelays[route];
                  const hasDelayInfo = delay !== null && delay !== undefined;
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
                    <button
                      key={route}
                      className="w-full text-left bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20 cursor-pointer hover:bg-white/20 transition-all shadow-lg hover:shadow-xl"
                      onClick={() => {
                        setSelectedRoute(route);
                        setShowForecast(true);
                      }}
                      aria-label={`View details for route ${route}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-md font-bold text-sm text-white"
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
                        {hasDelayInfo && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-400">
                              {getDelayLevelName(delay)}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span className="text-lg">
                              {getDelaySymbol(delay)}
                            </span>
                          </div>
                        )}
                      </div>
                      {routeFirstArrivals[route] && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Scheduled:</span>
                            <span className="text-white font-medium text-sm">
                              {routeFirstArrivals[route].scheduledTime}
                            </span>
                          </div>
                          {routeFirstArrivals[route].predictedTime &&
                            routeFirstArrivals[route].predictedTime !==
                              routeFirstArrivals[route].scheduledTime && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">
                                  Predicted:
                                </span>
                                <span className="text-white font-medium text-sm">
                                  {routeFirstArrivals[route].predictedTime}
                                </span>
                              </div>
                            )}
                          {routeFirstArrivals[route].predictedTime ===
                            routeFirstArrivals[route].scheduledTime && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Predicted:</span>
                              <span className="text-white font-medium text-sm">
                                {routeFirstArrivals[route].predictedTime} (On
                                Time)
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-3 text-gray-400 text-sm">
                No data
              </div>
            )}
          </div>

          {/* 位置情報 */}
          <div className="border-t border-white/20 pt-3">
            <h3 className="font-semibold text-white mb-2 text-base">
              Location
            </h3>
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

      {/* 3-Hour Forecast Modal */}
      {showForecast && selectedRoute && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 w-[90vw] max-w-6xl mx-4 max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                {/* 路線番号バッジ */}
                {(() => {
                  // メインパネルと同じ色配列
                  const colors = [
                    "#0066CC", // 青
                    "#FF6600", // オレンジ
                    "#00AA44", // 緑
                    "#CC0066", // ピンク
                    "#6600CC", // 紫
                    "#00CCAA", // シアン
                  ];

                  // 選択された路線のインデックスを取得
                  const stopRoutes = getStopRoutes();
                  const routeIndex = stopRoutes.indexOf(selectedRoute || "");
                  const color =
                    routeIndex >= 0
                      ? colors[routeIndex % colors.length]
                      : "#0066CC"; // デフォルト色

                  return (
                    <span
                      className="px-3 py-1 rounded-md font-bold text-base md:text-sm text-white"
                      style={{ backgroundColor: color }}
                    >
                      {selectedRoute}
                    </span>
                  );
                })()}
                {/* 目的地 */}
                {routeFirstArrivals[selectedRoute]?.destination && (
                  <span className="text-white font-medium text-base md:text-base">
                    {routeFirstArrivals[selectedRoute].destination}
                  </span>
                )}
                {/* 遅延ステータス */}
                {selectedRoute &&
                  routeDelays[selectedRoute] !== undefined &&
                  routeDelays[selectedRoute] !== null && (
                    <>
                      <span className="text-gray-400 text-base md:text-sm">
                        {getDelayLevelName(routeDelays[selectedRoute]!)}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-xl md:text-lg">
                        {getDelaySymbol(routeDelays[selectedRoute]!)}
                      </span>
                    </>
                  )}
              </div>
              <div className="flex items-center gap-2">
                {/* URLコピーボタン */}
                {/* <button
                  onClick={async (e) => {
                    if (selectedStopId) {
                      const url = `${window.location.origin}${window.location.pathname}?stop=${selectedStopId}`;

                      // フォールバック方法: テキストエリアを使う
                      const fallbackCopy = (): boolean => {
                        try {
                          const textArea = document.createElement("textarea");
                          textArea.value = url;
                          textArea.style.position = "fixed";
                          textArea.style.left = "-999999px";
                          textArea.style.top = "-999999px";
                          document.body.appendChild(textArea);
                          textArea.focus();
                          textArea.select();
                          const successful = document.execCommand("copy");
                          document.body.removeChild(textArea);
                          return successful;
                        } catch (err) {
                          console.error("Fallback copy failed:", err);
                          return false;
                        }
                      };

                      try {
                        // モダンブラウザのクリップボードAPIを試す
                        if (
                          navigator.clipboard &&
                          navigator.clipboard.writeText
                        ) {
                          await navigator.clipboard.writeText(url);
                        } else {
                          // フォールバック方法を使用
                          if (!fallbackCopy()) {
                            throw new Error("Both clipboard methods failed");
                          }
                        }

                        // コピー成功のフィードバック（一時的にボタンを変更）
                        const button = e.currentTarget;
                        if (button) {
                          const originalText = button.textContent || "";
                          button.textContent = "✓";
                          button.classList.add("text-green-400");
                          setTimeout(() => {
                            if (button) {
                              button.textContent = originalText;
                              button.classList.remove("text-green-400");
                            }
                          }, 2000);
                        }
                      } catch (err) {
                        console.error("Failed to copy URL:", err);
                        // エラー時はpromptでURLを表示して手動コピーを促す
                        prompt("Please copy the URL (Ctrl+C / Cmd+C):", url);
                      }
                    }
                  }}
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors text-lg w-11 h-11 flex items-center justify-center cursor-pointer"
                  title="Copy URL"
                  aria-label="Copy URL to clipboard"
                >
                  📋
                </button> */}
                <button
                  onClick={() => {
                    setShowForecast(false);
                    setSelectedRoute(null);
                    setRouteData(null);
                  }}
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors text-xl w-11 h-11 flex items-center justify-center cursor-pointer"
                  aria-label="Close forecast modal"
                >
                  ×
                </button>
              </div>
            </div>
            {loadingArrivals ? (
              <div className="text-center py-8 flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin opacity-60"></div>
                <span className="text-gray-400 text-base animate-pulse">
                  Loading...
                </span>
              </div>
            ) : routeArrivals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左側カラム: グラフと天気情報 */}
                <div className="space-y-4">
                  <h3 className="text-base md:text-sm font-semibold text-white mb-3">
                    Delay Trend
                  </h3>
                  {/* 遅延グラフ */}
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                    <DelayChart arrivals={routeArrivals} />
                  </div>
                </div>

                {/* 右側カラム: Route情報と到着時刻リスト */}
                <div className="space-y-4">
                  {/* Route情報 */}
                  {routeData?.route && (
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                      <h3 className="text-base md:text-sm font-semibold text-white mb-3">
                        Route Information
                      </h3>
                      <div className="space-y-2 text-sm md:text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Route:</span>
                          <span className="text-white">
                            {routeData.route.route_id ||
                              routeData.route.route_short_name ||
                              selectedRoute}
                          </span>
                        </div>
                        {routeData.route.route_long_name && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Route Name:</span>
                            <span className="text-white truncate ml-2 max-w-[180px] text-right">
                              {routeData.route.route_long_name}
                            </span>
                          </div>
                        )}
                        {routeData.route.route_type && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Route Type:</span>
                            <span className="text-white">
                              {routeData.route.route_type}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 到着時刻リスト */}
                  <div>
                    <h3 className="text-base md:text-sm font-semibold text-white mb-3">
                      Arrival Times
                    </h3>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                      {routeArrivals.map((arrival: any, index: number) => {
                        const delayMinutes =
                          arrival.predicted_delay_seconds !== null &&
                          arrival.predicted_delay_seconds !== undefined
                            ? Math.max(
                                0,
                                Math.round(arrival.predicted_delay_seconds / 60)
                              )
                            : null;
                        // scheduled_arrival_timeを優先的に使用（nullの場合でも表示）
                        const arrivalTime =
                          arrival.scheduled_arrival_time ||
                          arrival.arrival_time ||
                          arrival.next_arrival_time ||
                          arrival.estimated_arrival_time ||
                          "";

                        // 予測時間を計算（scheduled_arrival_timeを基準に遅延を加算）
                        let predictedTime =
                          arrival.scheduled_arrival_time || arrivalTime;
                        
                        // デバッグログ：条件確認
                        console.log("predictedTime debug:", {
                          scheduled_arrival_time: arrival.scheduled_arrival_time,
                          predicted_delay_seconds: arrival.predicted_delay_seconds,
                          arrivalTime: arrivalTime,
                          hasScheduled: !!arrival.scheduled_arrival_time,
                          hasDelay: arrival.predicted_delay_seconds !== null && arrival.predicted_delay_seconds !== undefined,
                        });
                        
                        if (
                          arrival.scheduled_arrival_time &&
                          arrival.predicted_delay_seconds !== null &&
                          arrival.predicted_delay_seconds !== undefined
                        ) {
                          try {
                            const scheduledDate = new Date(
                              arrival.scheduled_arrival_time
                            );
                            if (!isNaN(scheduledDate.getTime())) {
                              const delayMs =
                                arrival.predicted_delay_seconds * 1000;
                              const predictedDate = new Date(
                                scheduledDate.getTime() + delayMs
                              );
                              predictedTime = predictedDate.toISOString();
                              // デバッグログ
                              console.log("predictedTime calculation:", {
                                scheduled: arrival.scheduled_arrival_time,
                                delaySeconds: arrival.predicted_delay_seconds,
                                delayMs: delayMs,
                                predicted: predictedTime,
                              });
                            } else {
                              console.warn("Invalid scheduled date:", arrival.scheduled_arrival_time);
                            }
                          } catch (e) {
                            console.error(
                              "Error calculating predictedTime:",
                              e,
                              arrival.scheduled_arrival_time
                            );
                            // パースに失敗した場合はScheduled時刻を使用
                          }
                        } else if (
                          !arrival.scheduled_arrival_time &&
                          arrivalTime
                        ) {
                          // scheduled_arrival_timeがない場合はarrivalTimeを使用
                          predictedTime = arrivalTime;
                        }

                        // 時刻をカナダ式（12時間制AM/PM）に変換（秒なし、XX:YY PM形式）
                        const formatCanadianTime = (
                          timeStr: string
                        ): string => {
                          if (!timeStr) return "N/A";
                          try {
                            const isoDate = new Date(timeStr);
                            if (!isNaN(isoDate.getTime())) {
                              const hour24 = isoDate.getHours();
                              const minute = String(
                                isoDate.getMinutes()
                              ).padStart(2, "0");
                              const hour12 =
                                hour24 === 0
                                  ? 12
                                  : hour24 > 12
                                  ? hour24 - 12
                                  : hour24;
                              const ampm = hour24 < 12 ? "AM" : "PM";
                              return `${hour12}:${minute} ${ampm}`;
                            }
                          } catch (e) {}
                          // ISO形式でない場合、HH:MM:SS形式から抽出
                          const timeMatch = timeStr.match(
                            /(\d{1,2}):(\d{2})(?::(\d{2}))?/
                          );
                          if (timeMatch) {
                            const hour24 = parseInt(timeMatch[1], 10);
                            const minute = timeMatch[2];
                            const hour12 =
                              hour24 === 0
                                ? 12
                                : hour24 > 12
                                ? hour24 - 12
                                : hour24;
                            const ampm = hour24 < 12 ? "AM" : "PM";
                            return `${hour12}:${minute} ${ampm}`;
                          }
                          return timeStr;
                        };

                        return (
                          <div
                            key={index}
                            className="bg-white/10 backdrop-blur-md p-3 rounded border border-white/20 shadow-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div>
                                  <div className="text-white font-medium text-base md:text-base">
                                    {formatCanadianTime(predictedTime)}
                                  </div>
                                  <div className="text-gray-400 text-base md:text-sm">
                                    {arrival.trip_headsign || "Unknown"}
                                  </div>
                                  {/* Scheduled時刻を表示（予測時間がある場合は区別する） */}
                                  {arrival.scheduled_arrival_time && (
                                    <div className="text-gray-500 text-sm md:text-xs mt-1">
                                      Scheduled:{" "}
                                      {formatCanadianTime(
                                        arrival.scheduled_arrival_time
                                      )}
                                    </div>
                                  )}
                                  {!arrival.scheduled_arrival_time &&
                                    arrivalTime && (
                                      <div className="text-gray-500 text-sm md:text-xs mt-1">
                                        Scheduled:{" "}
                                        {formatCanadianTime(arrivalTime)}
                                      </div>
                                    )}
                                </div>
                              </div>
                              <div className="text-right">
                                {delayMinutes !== null &&
                                delayMinutes !== undefined ? (
                                  <div className="flex items-center gap-2 justify-end">
                                    <span className="text-gray-300 text-base md:text-sm font-medium">
                                      {getDelayLevelName(delayMinutes)}
                                    </span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-2xl">
                                      {getDelaySymbol(delayMinutes)}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 justify-end">
                                    <span className="text-gray-300 text-base md:text-sm font-medium">
                                      Scheduled
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* 追加情報: Region, Stop, Scheduled Timeなど */}
                            <div className="">
                              {arrival.scheduled_arrival_time && (
                                <div className="flex justify-between">
                                  <span>Scheduled:</span>
                                  <span className="text-gray-300">
                                    {formatCanadianTime(
                                      arrival.scheduled_arrival_time
                                    )}
                                  </span>
                                </div>
                              )}
                              {arrival.stop_name && (
                                <div className="flex justify-between">
                                  <span>Stop:</span>
                                  <span className="text-gray-300 truncate ml-2 max-w-[200px] text-right">
                                    {arrival.stop_name}
                                  </span>
                                </div>
                              )}
                              {arrival.stop_id && (
                                <div className="flex justify-between">
                                  <span>Stop ID:</span>
                                  <span className="text-gray-300">
                                    {arrival.stop_id}
                                  </span>
                                </div>
                              )}
                              {arrival.region_name && (
                                <div className="flex justify-between">
                                  <span>Region:</span>
                                  <span className="text-gray-300 capitalize">
                                    {arrival.region_name}
                                  </span>
                                </div>
                              )}
                              {arrival.region_id && !arrival.region_name && (
                                <div className="flex justify-between">
                                  <span>Region ID:</span>
                                  <span className="text-gray-300 capitalize">
                                    {arrival.region_id}
                                  </span>
                                </div>
                              )}
                              {arrival.route_id && (
                                <div className="flex justify-between">
                                  <span>Route ID:</span>
                                  <span className="text-gray-300">
                                    {arrival.route_id}
                                  </span>
                                </div>
                              )}
                              {arrival.vehicle_id && (
                                <div className="flex justify-between">
                                  <span>Vehicle ID:</span>
                                  <span className="text-gray-300">
                                    {arrival.vehicle_id}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
