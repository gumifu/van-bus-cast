/**
 * VanBusCast Design System
 *
 * 統一されたデザインシステムのエクスポート
 */

import { colors, getRouteColor } from "./colors";
import { typography } from "./typography";
import { glassmorphism, getGlassPanel } from "./glassmorphism";
import { spacing } from "./spacing";
import { components } from "./components";
import { transitions } from "./transitions";

// 再エクスポート
export { colors, getRouteColor } from "./colors";
export { typography } from "./typography";
export { glassmorphism, getGlassPanel } from "./glassmorphism";
export { spacing } from "./spacing";
export { components } from "./components";
export { transitions } from "./transitions";

// 便利な組み合わせ関数
export const designSystem = {
  colors,
  typography,
  glassmorphism,
  spacing,
  components,
  transitions,
} as const;

