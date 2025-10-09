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
    onRegionChange: { action: "region-changed" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedRegion: "vancouver",
    onRegionChange: () => {},
  },
};

export const Burnaby: Story = {
  args: {
    selectedRegion: "burnaby",
    onRegionChange: () => {},
  },
};

export const Richmond: Story = {
  args: {
    selectedRegion: "richmond",
    onRegionChange: () => {},
  },
};

export const Surrey: Story = {
  args: {
    selectedRegion: "surrey",
    onRegionChange: () => {},
  },
};
