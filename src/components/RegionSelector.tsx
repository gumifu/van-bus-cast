"use client";

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
}

export default function RegionSelector({
  regions,
  selectedRegion,
  onRegionSelect,
  isPanelOpen,
}: RegionSelectorProps) {
  return (
    <div
      className={`absolute top-4 bg-black bg-opacity-75 text-white p-3 rounded max-w-3xs transition-all duration-300 ease-in-out ${
        isPanelOpen ? "right-88" : "right-4"
      }`}
    >
      <h3 className="font-semibold text-sm mb-3">地域表示</h3>
      <div className="space-y-2">
        {regions.map((region) => (
          <button
            key={region.id}
            onClick={() => onRegionSelect(region.id)}
            className={`w-full text-left p-2 rounded text-xs transition-colors ${
              selectedRegion === region.id
                ? "bg-gray-700 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {region.name}
          </button>
        ))}
      </div>
    </div>
  );
}
