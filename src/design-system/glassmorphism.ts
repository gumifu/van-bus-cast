/**
 * VanBusCast Design System - Glassmorphism
 *
 * グラスモーフィズムスタイル定義
 */

export const glassmorphism = {
  // 基本パネルスタイル
  panel: {
    base: "bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl",
    card: "bg-white/10 backdrop-blur-md rounded-lg border border-white/20 shadow-lg",
    light: "bg-white/5 backdrop-blur-sm border border-white/10",
  },

  // 背景とぼかし
  backdrop: {
    xl: "backdrop-blur-xl",
    md: "backdrop-blur-md",
    sm: "backdrop-blur-sm",
  },

  // シャドウ
  shadow: {
    sm: "shadow-sm",
    base: "shadow-lg",
    lg: "shadow-2xl",
    hover: "hover:shadow-xl",
  },

  // ボーダー
  border: {
    default: "border border-white/20",
    light: "border border-white/10",
    top: "border-t border-white/20",
    bottom: "border-b border-white/20",
    left: "border-l border-white/20",
    right: "border-r border-white/20",
  },

  // 角丸
  rounded: {
    none: "rounded-none",
    sm: "rounded-sm",
    base: "rounded-lg",
    md: "rounded-md",
    full: "rounded-full",
  },
} as const;

/**
 * 完全なグラスモーフィズムパネルクラス名を取得
 */
export const getGlassPanel = (variant: "base" | "card" | "light" = "base"): string => {
  return glassmorphism.panel[variant];
};


