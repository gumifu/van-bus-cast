/**
 * VanBusCast Design System - Colors
 *
 * カラーパレット定義
 */

export const colors = {
  // グラスモーフィズム背景
  glass: {
    light: "bg-white/10",
    medium: "bg-white/20",
    dark: "bg-white/5",
  },

  // テキストカラー
  text: {
    primary: "text-white",
    secondary: "text-gray-300",
    tertiary: "text-gray-400",
    muted: "text-gray-500",
  },

  // ボーダーカラー
  border: {
    default: "border-white/20",
    light: "border-white/10",
    medium: "border-white/30",
  },

  // ルートカラー（バス路線の識別用）
  routes: [
    "#0066CC", // 青
    "#FF6600", // オレンジ
    "#00AA44", // 緑
    "#CC0066", // ピンク
    "#6600CC", // 紫
    "#00CCAA", // シアン
  ],

  // アクセントカラー
  accent: {
    pin: "text-yellow-400",
    pinHover: "hover:text-yellow-400",
    success: "text-green-400",
    warning: "text-orange-400",
    error: "text-red-400",
  },

  // ホバー状態
  hover: {
    default: "hover:bg-white/10",
    medium: "hover:bg-white/20",
    text: "hover:text-white",
  },
} as const;

/**
 * ルートカラーをインデックスで取得
 */
export const getRouteColor = (index: number): string => {
  return colors.routes[index % colors.routes.length];
};


