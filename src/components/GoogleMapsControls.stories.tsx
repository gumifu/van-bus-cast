import type { Meta, StoryObj } from "@storybook/react";
import GoogleMapsControls from "./GoogleMapsControls";

const meta: Meta<typeof GoogleMapsControls> = {
  title: "Components/GoogleMapsControls",
  component: GoogleMapsControls,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onZoomIn: { action: "zoom-in" },
    onZoomOut: { action: "zoom-out" },
    onMyLocation: { action: "my-location" },
    onFullscreen: { action: "fullscreen" },
    onLayerToggle: { action: "layer-toggle" },
    onStreetView: { action: "street-view" },
    isFullscreen: {
      control: "boolean",
    },
    showLayers: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onZoomIn: () => {},
    onZoomOut: () => {},
    onMyLocation: () => {},
    onFullscreen: () => {},
    onLayerToggle: () => {},
    onStreetView: () => {},
    isFullscreen: false,
    showLayers: false,
  },
};
