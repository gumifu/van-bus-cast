"use client";

import { useState } from "react";

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
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-lg shadow-lg border border-white/20 p-3 w-80 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-white">Region</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white hover:text-gray-300 transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
          title={isExpanded ? "閉じる" : "開く"}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>
      {isExpanded && (
        <div className="space-y-1">
        {regions.map((region) => {
          const delay = regionDelays[region.id] || 0;
          return (
            <button
              key={region.id}
              onClick={() => onRegionSelect(region.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                selectedRegion === region.id
                  ? "bg-white/20 text-white"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{region.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {getDelayLevelName(delay)}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-sm">
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
