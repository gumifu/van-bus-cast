/**
 * VanBusCast Design System - Components
 *
 * コンポーネント固有のスタイル定義
 */

import { glassmorphism } from "./glassmorphism";
import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const components = {
  // ボタン
  button: {
    base: `${glassmorphism.rounded.base} transition-colors cursor-pointer`,
    sizes: {
      sm: "px-2 py-1 text-sm",
      base: "px-3 py-1.5 text-base",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
      icon: "w-11 h-11 flex items-center justify-center", // 44x44px (アクセシビリティ推奨最小サイズ)
    },
    variants: {
      primary: `${colors.glass.light} ${colors.text.primary} ${colors.hover.medium} ${colors.border.default}`,
      ghost: `${colors.text.secondary} ${colors.hover.default} ${colors.border.default}`,
      icon: `${colors.text.tertiary} ${colors.hover.default} ${glassmorphism.rounded.full}`,
      close: `${colors.text.tertiary} ${colors.hover.text} ${colors.hover.default} ${glassmorphism.rounded.full} ${typography.sizes.xl} w-11 h-11 flex items-center justify-center`,
    },
  },

  // カード
  card: {
    base: `${glassmorphism.panel.card} ${spacing.padding.base} ${spacing.space.sm}`,
    interactive: `${glassmorphism.panel.card} ${spacing.padding.base} ${spacing.space.sm} ${colors.hover.medium} ${glassmorphism.shadow.hover} cursor-pointer transition-all`,
  },

  // パネル
  panel: {
    base: `${glassmorphism.panel.base} ${colors.text.primary}`,
    mobile: `${glassmorphism.panel.base} ${colors.text.primary} fixed bottom-0 left-0 right-0 transform transition-transform duration-300 ease-in-out z-50 ${glassmorphism.border.top}`,
    desktop: `${glassmorphism.panel.base} ${colors.text.primary} fixed top-0 right-0 h-full transform transition-transform duration-300 ease-out z-50 ${glassmorphism.border.left}`,
  },

  // バッジ（路線番号など）
  badge: {
    base: `${glassmorphism.rounded.md} ${typography.weights.bold} ${colors.text.primary} ${spacing.padding.x.sm} ${spacing.padding.y.xs}`,
    sizes: {
      sm: `${typography.sizes.xs}`,
      base: `${typography.sizes.sm}`,
      md: `${typography.sizes.base}`,
    },
  },

  // 入力フィールド
  input: {
    base: `${glassmorphism.panel.card} ${colors.text.primary} ${spacing.padding.base} ${colors.border.default} ${glassmorphism.rounded.base} focus:outline-none focus:ring-2 focus:ring-white/30`,
  },
} as const;

// componentsFixedは不要になったため削除

