"use client";

import { useState, useEffect } from "react";

interface GoogleMapsSearchBarProps {
  onSearch: (query: string) => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  placeholder?: string;
}

interface SearchSuggestion {
  stop_name: string;
  stop_id: string;
  stop_code: string;
  coordinates: [number, number];
  region?: string;
  type?: string;
}

// 地域データ
const regions = [
  {
    id: "vancouver",
    name: "Vancouver",
    center: [49.2827, -123.1207],
    zoom: 12,
  },
  {
    id: "downtown",
    name: "Downtown",
    center: [49.2827, -123.1207],
    zoom: 15,
  },
  {
    id: "richmond",
    name: "Richmond",
    center: [49.1631, -123.1336],
    zoom: 12,
  },
  { id: "burnaby", name: "Burnaby", center: [49.2488, -122.9805], zoom: 12 },
  { id: "surrey", name: "Surrey", center: [49.1913, -122.849], zoom: 12 },
];

export default function GoogleMapsSearchBar({
  onSearch,
  onSearchStart,
  onSearchEnd,
  placeholder = "Search places",
}: GoogleMapsSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 地域名を検索
  const searchRegions = (query: string) => {
    const queryLower = query.toLowerCase();
    return regions
      .filter(
        (region) =>
          region.name.toLowerCase().includes(queryLower) ||
          region.id.toLowerCase().includes(queryLower)
      )
      .map((region) => ({
        stop_name: region.name,
        stop_id: region.id,
        stop_code: "",
        coordinates: region.center as [number, number],
        region: region.name,
        type: "Region",
      }));
  };

  // バス停の地域を判定する関数
  const getRegionForStop = (coordinates: [number, number]) => {
    const [lng, lat] = coordinates;

    // 簡易的な地域判定（実際の境界に基づく）
    if (lat >= 49.25 && lat <= 49.32 && lng >= -123.2 && lng <= -123.05) {
      return "Downtown";
    } else if (
      lat >= 49.15 &&
      lat <= 49.25 &&
      lng >= -123.2 &&
      lng <= -123.05
    ) {
      return "Vancouver";
    } else if (lat >= 49.1 && lat <= 49.2 && lng >= -123.2 && lng <= -123.05) {
      return "Richmond";
    } else if (lat >= 49.2 && lat <= 49.3 && lng >= -123.0 && lng <= -122.9) {
      return "Burnaby";
    } else if (lat >= 49.1 && lat <= 49.2 && lng >= -123.0 && lng <= -122.7) {
      return "Surrey";
    }
    return "Vancouver";
  };

  // 検索候補を取得
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      onSearchEnd?.();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/data/stops.geojson");
      const data = await response.json();

      let allSuggestions: SearchSuggestion[] = [];

      // 地域名を検索
      const regionSuggestions = searchRegions(query);
      allSuggestions = [...regionSuggestions];

      if (data.features) {
        const filteredStops = data.features
          .filter((feature: any) => {
            const stopName = feature.properties?.stop_name?.toLowerCase() || "";
            const stopId = feature.properties?.stop_id?.toString() || "";
            const stopCode = feature.properties?.stop_code?.toString() || "";
            const queryLower = query.toLowerCase();

            return (
              stopName.includes(queryLower) ||
              stopId.includes(queryLower) ||
              stopCode.includes(queryLower)
            );
          })
          .slice(0, 8) // バス停は最大8件まで（地域と合わせて10件）
          .map((feature: any) => {
            const coordinates = feature.geometry.coordinates as [
              number,
              number
            ];
            return {
              stop_name: feature.properties?.stop_name || "Unknown Stop",
              stop_id: feature.properties?.stop_id || "",
              stop_code: feature.properties?.stop_code || "",
              coordinates: coordinates,
              region: getRegionForStop(coordinates),
              type: feature.properties?.type || "Bus Stop",
            };
          });

        allSuggestions = [...allSuggestions, ...filteredStops];
      }

      // 最大10件に制限
      setSuggestions(allSuggestions.slice(0, 10));
      setShowSuggestions(true);
      onSearchStart?.();
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 検索クエリが変更されたときに候補を取得
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300); // 300msの遅延でデバウンス

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.stop_name);
    setShowSuggestions(false);
    onSearch(suggestion.stop_name);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
    onSearchStart?.();
  };

  const handleInputBlur = () => {
    // 少し遅延させてクリックイベントを処理
    setTimeout(() => {
      setShowSuggestions(false);
      onSearchEnd?.();
    }, 200);
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div className="flex items-center">
            {/* 検索アイコン */}
            <div className="pl-4 pr-2">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* 検索入力フィールド */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className="flex-1 py-3 px-2 text-white placeholder-gray-400 focus:outline-none bg-gray-900"
            />

            {/* 検索ボタン */}
            <button
              type="submit"
              className="px-4 py-3 bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </form>

      {/* 検索候補ドロップダウン */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="ml-2">Searching...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.stop_id}-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-3 hover:bg-gray-800 transition-colors border-b border-gray-700 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-white font-medium text-sm">
                        {suggestion.stop_name}
                      </div>
                      {suggestion.type && (
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            suggestion.type === "Region"
                              ? "bg-blue-600 text-blue-100"
                              : "bg-green-600 text-green-100"
                          }`}
                        >
                          {suggestion.type}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {suggestion.type === "Region" ? (
                        <span>Select region</span>
                      ) : (
                        <>
                          {suggestion.region && (
                            <span>{suggestion.region} | </span>
                          )}
                          ID: {suggestion.stop_id} | Code:{" "}
                          {suggestion.stop_code}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {suggestion.type === "Region" ? "🗺️" : "📍"}
                  </div>
                </div>
              </button>
            ))
          ) : searchQuery.length >= 2 ? (
            <div className="p-3 text-center text-gray-400 text-sm">
              No search results found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
