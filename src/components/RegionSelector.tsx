"use client";

import { useState, useEffect } from "react";

interface Region {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
}

interface RegionSelectorProps {
  regions: Region[];
  selectedRegion: string;
  onRegionSelect: (regionId: string) => void;
  isPanelOpen: boolean;
  regionDelays: { [key: string]: number };
  getDelaySymbol: (level: number) => string;
  getDelayLevelName: (level: number) => string;
}

export default function RegionSelector({
  regions,
  selectedRegion,
  onRegionSelect,
  isPanelOpen,
  regionDelays,
  getDelaySymbol,
  getDelayLevelName,
}: RegionSelectorProps) {
  // モバイルでは閉じた状態、デスクトップでは開いた状態をデフォルトに
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // デスクトップサイズ（md以上）では開いた状態にする
    const checkScreenSize = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        setIsExpanded(true);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-lg shadow-lg border border-white/20 p-2 md:p-3 w-full md:w-80 transition-all duration-300">
      <div className="flex items-center justify-between mb-1 md:mb-2">
        <h3 className="font-semibold text-xs md:text-sm text-white">Region</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:text-gray-300 hover:bg-white/10 rounded-full transition-colors text-base md:text-lg leading-none w-8 h-8 md:w-11 md:h-11 flex items-center justify-center cursor-pointer"
          title={isExpanded ? "Collapse" : "Expand"}
          aria-label={isExpanded ? "Collapse region list" : "Expand region list"}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>
      {isExpanded && (
        <div className="space-y-0.5 md:space-y-1">
        {regions.map((region) => {
          const delay = regionDelays[region.id] || 0;
          return (
            <button
              key={region.id}
              onClick={() => onRegionSelect(region.id)}
              className={`w-full text-left px-2 py-1 md:px-3 md:py-2 rounded text-xs transition-colors ${
                selectedRegion === region.id
                  ? "bg-white/20 text-white"
                  : "text-gray-300 hover:bg-white/10"
              }`}
              aria-label={`Select ${region.name} region`}
              aria-pressed={selectedRegion === region.id}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs">{region.name}</span>
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="text-xs">
                    {getDelayLevelName(delay)}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-xs md:text-sm">
                    {getDelaySymbol(delay)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
