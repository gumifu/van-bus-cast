import type { Meta, StoryObj } from "@storybook/react";
import GoogleMapsSearchBar from "./GoogleMapsSearchBar";

const meta: Meta<typeof GoogleMapsSearchBar> = {
  title: "Components/GoogleMapsSearchBar",
  component: GoogleMapsSearchBar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onSearch: { action: "search" },
    onSearchStart: { action: "search-started" },
    onSearchEnd: { action: "search-ended" },
    placeholder: {
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Search places (e.g., Downtown, Richmond)",
    onSearch: () => {},
    onSearchStart: () => {},
    onSearchEnd: () => {},
  },
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder: "Enter your destination...",
    onSearch: () => {},
    onSearchStart: () => {},
    onSearchEnd: () => {},
  },
};

export const BusStopSearch: Story = {
  args: {
    placeholder: "Search bus stops (e.g., Granville Station)",
    onSearch: () => {},
    onSearchStart: () => {},
    onSearchEnd: () => {},
  },
};
