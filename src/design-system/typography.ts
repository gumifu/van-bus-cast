/**
 * VanBusCast Design System - Typography
 *
 * タイポグラフィ定義（フォントサイズ、ウェイト、行間など）
 */

export const typography = {
  // フォントサイズ（モバイル → デスクトップ）
  sizes: {
    xs: "text-xs",
    sm: "text-sm md:text-sm",
    base: "text-base md:text-base",
    baseMobile: "text-base md:text-sm", // モバイルで大きく、デスクトップで小さく
    lg: "text-lg",
    xl: "text-xl md:text-lg", // モバイルで大きく、デスクトップで標準
    "2xl": "text-2xl",
  },

  // フォントウェイト
  weights: {
    light: "font-light",
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  },

  // 見出しスタイル
  headings: {
    h1: "text-2xl font-bold text-white",
    h2: "text-xl md:text-lg font-semibold text-white",
    h3: "text-lg md:text-base font-semibold text-white",
    h4: "text-base md:text-sm font-semibold text-white",
    h5: "text-sm font-medium text-gray-300",
  },
} as const;


