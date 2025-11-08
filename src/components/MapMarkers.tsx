import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

interface MapMarkersProps {
  map: mapboxgl.Map | null;
  userLocation: [number, number] | null;
  animationFrameRef: React.MutableRefObject<number | null>;
}

export const MapMarkers = ({
  map,
  userLocation,
  animationFrameRef,
}: MapMarkersProps) => {
  const pinIconAddedRef = useRef(false);

  // SF Symbolsスタイルのピンアイコンをマップに追加
  const addPinIcon = () => {
    if (!map || pinIconAddedRef.current) {
      return;
    }


    // 既存のアイコンを削除
    if (map.hasImage("pin-icon")) {
      map.removeImage("pin-icon");
    }

    // CanvasでSF Symbolsスタイルのピンアイコンを作成
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context");
      return;
    }

    const size = 32;
    canvas.width = size;
    canvas.height = size;

    // 背景を透明にする
    ctx.clearRect(0, 0, size, size);

    // SF Symbolsスタイルのピンアイコンを描画
    // メインの円形部分
    ctx.fillStyle = "#007AFF"; // SF Blue
    ctx.beginPath();
    ctx.arc(size / 2, size / 2 - 2, 10, 0, 2 * Math.PI);
    ctx.fill();

    // 内側の白い円
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2 - 2, 6, 0, 2 * Math.PI);
    ctx.fill();

    // 中央のドット
    ctx.fillStyle = "#007AFF";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2 - 2, 2, 0, 2 * Math.PI);
    ctx.fill();

    // 下部の三角形（ピンの先端）
    ctx.fillStyle = "#007AFF";
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2 + 8);
    ctx.lineTo(size / 2 - 6, size - 2);
    ctx.lineTo(size / 2 + 6, size - 2);
    ctx.closePath();
    ctx.fill();

    // 影を追加（SF Symbolsスタイル）
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // CanvasをImageDataに変換して追加
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    map.addImage("pin-icon", imageData);
    pinIconAddedRef.current = true;
  };

  // ユーザーの位置をMapboxレイヤーとして追加
  const addUserLocationMarker = (location: [number, number]) => {
    if (!map || !map.isStyleLoaded()) {
      setTimeout(() => addUserLocationMarker(location), 1000);
      return;
    }


    // ピンアイコンを追加
    addPinIcon();

    // 既存のユーザー位置ソースとレイヤーを削除
    if (map.getSource("user-location")) {
      if (map.getLayer("user-location-pulse")) {
        map.removeLayer("user-location-pulse");
      }
      if (map.getLayer("user-location-pulse-2")) {
        map.removeLayer("user-location-pulse-2");
      }
      if (map.getLayer("user-location-center")) {
        map.removeLayer("user-location-center");
      }
      map.removeSource("user-location");
    }

    // ユーザー位置のGeoJSONデータを作成
    const userLocationGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: location,
          },
          properties: {
            id: "user-location",
          },
        },
      ],
    };

    // ユーザー位置のソースを追加
    map.addSource("user-location", {
      type: "geojson",
      data: userLocationGeoJSON,
    });

    // アニメーション用のCSSを追加
    if (!document.getElementById("user-location-styles")) {
      const style = document.createElement("style");
      style.id = "user-location-styles";
      style.textContent = `
        @keyframes ping-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes animate-ping {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animate-ping {
          animation: animate-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .selected-bus-stop {
          animation: pulse 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }

    // パルス効果の円レイヤー（アニメーション用）
    map.addLayer({
      id: "user-location-pulse",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": {
          base: 1.75,
          stops: [
            [12, 20],
            [22, 180],
          ],
        },
        "circle-color": "#3b82f6",
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          0.3,
          22,
          0.1,
        ],
        "circle-stroke-width": 0,
      },
    });

    // アニメーション用の追加レイヤー
    map.addLayer({
      id: "user-location-pulse-2",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": {
          base: 1.75,
          stops: [
            [12, 30],
            [22, 200],
          ],
        },
        "circle-color": "#3b82f6",
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          0.2,
          22,
          0.05,
        ],
        "circle-stroke-width": 0,
      },
    });

    // 中心の円レイヤー
    map.addLayer({
      id: "user-location-center",
      type: "circle",
      source: "user-location",
      paint: {
        "circle-radius": {
          base: 1.75,
          stops: [
            [12, 8],
            [22, 24],
          ],
        },
        "circle-color": "#3b82f6",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    });


    // アニメーション効果を追加
    let startTime = Date.now();

    const animatePulse = () => {
      if (!map || !map.isStyleLoaded()) return;

      const elapsed = (Date.now() - startTime) / 1000;
      const pulse1Opacity = Math.max(0, 0.3 * Math.sin(elapsed * 2) + 0.1);
      const pulse2Opacity = Math.max(
        0,
        0.2 * Math.sin(elapsed * 2 + Math.PI / 2) + 0.05
      );

      // パルスレイヤーの透明度を更新
      if (map.getLayer("user-location-pulse")) {
        map.setPaintProperty(
          "user-location-pulse",
          "circle-opacity",
          pulse1Opacity
        );
      }
      if (map.getLayer("user-location-pulse-2")) {
        map.setPaintProperty(
          "user-location-pulse-2",
          "circle-opacity",
          pulse2Opacity
        );
      }

      animationFrameRef.current = requestAnimationFrame(animatePulse);
    };

    animatePulse();

    // クリックイベントを追加
    if (map) {
      map.on("click", "user-location-center", (e) => {
        if (e.features && e.features.length > 0 && map) {
          new mapboxgl.Popup({ offset: 25 })
            .setLngLat(location)
            .setHTML(
              `
              <div class="p-2">
                <h3 class="font-semibold text-sm text-blue-600">あなたの位置</h3>
                <p class="text-xs text-gray-600 mt-1">
                  緯度: ${location[1].toFixed(6)}<br>
                  経度: ${location[0].toFixed(6)}
                </p>
              </div>
            `
            )
            .addTo(map);
        }
      });

      // ホバー効果
      map.on("mouseenter", "user-location-center", () => {
        if (map) {
          map.getCanvas().style.cursor = "pointer";
        }
      });

      map.on("mouseleave", "user-location-center", () => {
        if (map) {
          map.getCanvas().style.cursor = "";
        }
      });
    }
  };

  // ユーザー位置が変更された時にマーカーを更新
  useEffect(() => {
    if (map && userLocation && map.isStyleLoaded()) {
      addUserLocationMarker(userLocation);
    } else if (map && userLocation) {
      // マップのスタイルが読み込まれるまで待機
      const checkStyleLoaded = () => {
        if (map.isStyleLoaded()) {
          addUserLocationMarker(userLocation);
        } else {
          setTimeout(checkStyleLoaded, 100);
        }
      };
      checkStyleLoaded();
    }
  }, [map, userLocation]);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return null; // このコンポーネントはレンダリングしない
};

export default MapMarkers;
