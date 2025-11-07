/**
 * VanBusCast Design System - Spacing
 *
 * スペーシング定義（パディング、マージン、ギャップ）
 */

export const spacing = {
  // パディング
  padding: {
    xs: "p-1",
    sm: "p-2",
    base: "p-3",
    md: "p-4",
    lg: "p-6",
    x: {
      xs: "px-1",
      sm: "px-2",
      base: "px-3",
      md: "px-4",
      lg: "px-6",
    },
    y: {
      xs: "py-1",
      sm: "py-2",
      base: "py-3",
      md: "py-4",
      lg: "py-6",
    },
  },

  // マージン
  margin: {
    xs: "m-1",
    sm: "m-2",
    base: "m-3",
    md: "m-4",
    lg: "m-6",
    top: {
      xs: "mt-1",
      sm: "mt-2",
      base: "mt-3",
      md: "mt-4",
      lg: "mt-8",
    },
    bottom: {
      xs: "mb-1",
      sm: "mb-2",
      base: "mb-3",
      md: "mb-4",
      lg: "mb-6",
    },
    x: {
      xs: "mx-1",
      sm: "mx-2",
      base: "mx-3",
      md: "mx-4",
    },
    y: {
      xs: "my-1",
      sm: "my-2",
      base: "my-3",
      md: "my-4",
    },
  },

  // ギャップ
  gap: {
    xs: "gap-1",
    sm: "gap-2",
    base: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  },

  // スペース（子要素間）
  space: {
    xs: "space-y-1",
    sm: "space-y-2",
    base: "space-y-3",
    md: "space-y-4",
    lg: "space-y-6",
    x: {
      xs: "space-x-1",
      sm: "space-x-2",
      base: "space-x-3",
      md: "space-x-4",
    },
  },
} as const;


