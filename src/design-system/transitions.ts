/**
 * VanBusCast Design System - Transitions
 *
 * アニメーションとトランジション定義
 */

export const transitions = {
  // トランジションタイプ
  type: {
    all: "transition-all",
    colors: "transition-colors",
    transform: "transition-transform",
    opacity: "transition-opacity",
  },

  // トランジション時間
  duration: {
    fast: "duration-150",
    base: "duration-300",
    slow: "duration-500",
    verySlow: "duration-700",
  },

  // イージング
  easing: {
    linear: "ease-linear",
    in: "ease-in",
    out: "ease-out",
    inOut: "ease-in-out",
  },

  // よく使う組み合わせ
  common: {
    colors: "transition-colors duration-300",
    transform: "transition-transform duration-300 ease-in-out",
    all: "transition-all duration-300 ease-in-out",
    panel: "transform transition-transform duration-300 ease-in-out",
  },
} as const;


