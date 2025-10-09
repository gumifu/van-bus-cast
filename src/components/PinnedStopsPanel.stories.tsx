import type { Meta, StoryObj } from "@storybook/react";
import PinnedStopsPanel from "./PinnedStopsPanel";

const meta: Meta<typeof PinnedStopsPanel> = {
  title: "Components/PinnedStopsPanel",
  component: PinnedStopsPanel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    pinnedStops: {
      control: "object",
    },
    pinnedStopsData: {
      control: "object",
    },
    onPinnedStopClick: { action: "pinned-stop-clicked" },
    onRemovePin: { action: "pin-removed" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    pinnedStops: new Set(),
    pinnedStopsData: {},
    onPinnedStopClick: () => {},
    onRemovePin: () => {},
  },
};

export const WithPinnedStops: Story = {
  args: {
    pinnedStops: new Set(["12345", "67890"]),
    pinnedStopsData: {
      "12345": {
        stop_id: "12345",
        stop_name: "Granville Station",
        stop_code: "GRAN",
        geometry: {
          type: "Point",
          coordinates: [-123.1207, 49.2827],
        },
      },
      "67890": {
        stop_id: "67890",
        stop_name: "Waterfront Station",
        stop_code: "WATR",
        geometry: {
          type: "Point",
          coordinates: [-123.1115, 49.2859],
        },
      },
    },
    onPinnedStopClick: () => {},
    onRemovePin: () => {},
  },
};
