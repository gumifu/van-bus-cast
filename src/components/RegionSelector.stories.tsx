import type { Meta, StoryObj } from "@storybook/react";
import RegionSelector from "./RegionSelector";

const meta: Meta<typeof RegionSelector> = {
  title: "Components/RegionSelector",
  component: RegionSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    selectedRegion: {
      control: "select",
      options: ["vancouver", "burnaby", "richmond", "surrey"],
    },
    onRegionSelect: { action: "region-selected" },
    isPanelOpen: {
      control: "boolean",
    },
    regionDelays: {
      control: "object",
    },
    getDelaySymbol: { action: "get-delay-symbol" },
    getDelayLevelName: { action: "get-delay-level-name" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const getDelaySymbol = (level: number) => {
  if (level === 0) return "☀️";
  if (level <= 2) return "🌤️";
  if (level <= 5) return "☁️";
  return "⛈️";
};

const getDelayLevelName = (level: number) => {
  if (level === 0) return "On Time";
  if (level <= 2) return `${level} min delay`;
  if (level <= 5) return `${level} min delay`;
  return `${level}+ min delay`;
};

export const Default: Story = {
  args: {
    regions: [
      {
        id: "vancouver",
        name: "Vancouver",
        center: [-123.1207, 49.2827],
        zoom: 12,
      },
      {
        id: "burnaby",
        name: "Burnaby",
        center: [-122.9749, 49.2488],
        zoom: 12,
      },
      {
        id: "richmond",
        name: "Richmond",
        center: [-123.1338, 49.1666],
        zoom: 12,
      },
      {
        id: "surrey",
        name: "Surrey",
        center: [-122.849, 49.1913],
        zoom: 12,
      },
    ],
    selectedRegion: "vancouver",
    onRegionSelect: () => {},
    isPanelOpen: false,
    regionDelays: {
      vancouver: 2,
      burnaby: 3,
      richmond: 1,
      surrey: 4,
    },
    getDelaySymbol,
    getDelayLevelName,
  },
};

export const Burnaby: Story = {
  args: {
    regions: [
      {
        id: "vancouver",
        name: "Vancouver",
        center: [-123.1207, 49.2827],
        zoom: 12,
      },
      {
        id: "burnaby",
        name: "Burnaby",
        center: [-122.9749, 49.2488],
        zoom: 12,
      },
    ],
    selectedRegion: "burnaby",
    onRegionSelect: () => {},
    isPanelOpen: true,
    regionDelays: {
      vancouver: 2,
      burnaby: 3,
    },
    getDelaySymbol,
    getDelayLevelName,
  },
};

export const Richmond: Story = {
  args: {
    regions: [
      {
        id: "richmond",
        name: "Richmond",
        center: [-123.1338, 49.1666],
        zoom: 12,
      },
    ],
    selectedRegion: "richmond",
    onRegionSelect: () => {},
    isPanelOpen: true,
    regionDelays: {
      richmond: 1,
    },
    getDelaySymbol,
    getDelayLevelName,
  },
};

export const Surrey: Story = {
  args: {
    regions: [
      {
        id: "surrey",
        name: "Surrey",
        center: [-122.849, 49.1913],
        zoom: 12,
      },
    ],
    selectedRegion: "surrey",
    onRegionSelect: () => {},
    isPanelOpen: true,
    regionDelays: {
      surrey: 4,
    },
    getDelaySymbol,
    getDelayLevelName,
  },
};
