"use client";

import { useEffect } from "react";
import {
  colors,
  typography,
  glassmorphism,
  spacing,
  components,
  transitions,
  getRouteColor,
  designSystem,
} from "@/design-system";

export default function DesignSystemPage() {
  // デザインシステムページではスクロールを有効にする
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            VanBusCast Design System
          </h1>
          <p className="text-gray-300 text-lg">
            統一されたデザイン言語とコンポーネントスタイル
          </p>
        </div>

        {/* カラー */}
        <section className={glassmorphism.panel.base + " " + spacing.padding.lg}>
          <h2 className={typography.headings.h2 + " mb-6"}>Colors</h2>

          <div className={spacing.space.md}>
            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Glassmorphism Backgrounds</h3>
              <div className="flex flex-wrap gap-4">
                <div className={`${colors.glass.light} ${glassmorphism.rounded.base} ${spacing.padding.base} border border-white/20`}>
                  <p className="text-white">bg-white/10</p>
                </div>
                <div className={`${colors.glass.medium} ${glassmorphism.rounded.base} ${spacing.padding.base} border border-white/20`}>
                  <p className="text-white">bg-white/20</p>
                </div>
                <div className={`${colors.glass.dark} ${glassmorphism.rounded.base} ${spacing.padding.base} border border-white/20`}>
                  <p className="text-white">bg-white/5</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Text Colors</h3>
              <div className={spacing.space.base}>
                <p className={colors.text.primary}>Primary Text (text-white)</p>
                <p className={colors.text.secondary}>Secondary Text (text-gray-300)</p>
                <p className={colors.text.tertiary}>Tertiary Text (text-gray-400)</p>
                <p className={colors.text.muted}>Muted Text (text-gray-500)</p>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Route Colors</h3>
              <div className="flex flex-wrap gap-3">
                {colors.routes.map((color, index) => (
                  <div
                    key={index}
                    className={`${components.badge.base} ${components.badge.sizes.base}`}
                    style={{ backgroundColor: color }}
                  >
                    Route {index + 1}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Accent Colors</h3>
              <div className="flex flex-wrap gap-4">
                <span className={colors.accent.pin}>📍 Pin (Yellow)</span>
                <span className={colors.accent.success}>✓ Success (Green)</span>
                <span className={colors.accent.warning}>⚠ Warning (Orange)</span>
                <span className={colors.accent.error}>✕ Error (Red)</span>
              </div>
            </div>
          </div>
        </section>

        {/* タイポグラフィ */}
        <section className={glassmorphism.panel.base + " " + spacing.padding.lg}>
          <h2 className={typography.headings.h2 + " mb-6"}>Typography</h2>

          <div className={spacing.space.md}>
            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Headings</h3>
              <div className={spacing.space.base}>
                <h1 className={typography.headings.h1}>Heading 1</h1>
                <h2 className={typography.headings.h2}>Heading 2</h2>
                <h3 className={typography.headings.h3}>Heading 3</h3>
                <h4 className={typography.headings.h4}>Heading 4</h4>
                <h5 className={typography.headings.h5}>Heading 5</h5>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Font Sizes</h3>
              <div className={spacing.space.base}>
                <p className={typography.sizes.xs}>Extra Small (text-xs)</p>
                <p className={typography.sizes.sm}>Small (text-sm)</p>
                <p className={typography.sizes.base}>Base (text-base)</p>
                <p className={typography.sizes.baseMobile}>Base Mobile (text-base md:text-sm)</p>
                <p className={typography.sizes.lg}>Large (text-lg)</p>
                <p className={typography.sizes.xl}>Extra Large (text-xl)</p>
                <p className={typography.sizes["2xl"]}>2X Large (text-2xl)</p>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Font Weights</h3>
              <div className={spacing.space.base}>
                <p className={typography.weights.light}>Light Weight</p>
                <p className={typography.weights.normal}>Normal Weight</p>
                <p className={typography.weights.medium}>Medium Weight</p>
                <p className={typography.weights.semibold}>Semibold Weight</p>
                <p className={typography.weights.bold}>Bold Weight</p>
              </div>
            </div>
          </div>
        </section>

        {/* Glassmorphism */}
        <section className={glassmorphism.panel.base + " " + spacing.padding.lg}>
          <h2 className={typography.headings.h2 + " mb-6"}>Glassmorphism</h2>

          <div className={spacing.space.md}>
            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Panel Variants</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={glassmorphism.panel.base + " " + spacing.padding.base}>
                  <p className="text-white">Base Panel</p>
                  <p className="text-gray-400 text-sm">backdrop-blur-xl</p>
                </div>
                <div className={glassmorphism.panel.card + " " + spacing.padding.base}>
                  <p className="text-white">Card Panel</p>
                  <p className="text-gray-400 text-sm">backdrop-blur-md</p>
                </div>
                <div className={glassmorphism.panel.light + " " + spacing.padding.base}>
                  <p className="text-white">Light Panel</p>
                  <p className="text-gray-400 text-sm">backdrop-blur-sm</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Shadows</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${glassmorphism.panel.card} ${glassmorphism.shadow.sm} ${spacing.padding.base}`}>
                  <p className="text-white">Shadow Small</p>
                </div>
                <div className={`${glassmorphism.panel.card} ${glassmorphism.shadow.base} ${spacing.padding.base}`}>
                  <p className="text-white">Shadow Base</p>
                </div>
                <div className={`${glassmorphism.panel.card} ${glassmorphism.shadow.lg} ${spacing.padding.base}`}>
                  <p className="text-white">Shadow Large</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Border Radius</h3>
              <div className="flex flex-wrap gap-4">
                <div className={`${glassmorphism.panel.card} ${glassmorphism.rounded.sm} ${spacing.padding.base} w-32`}>
                  <p className="text-white text-sm">Small</p>
                </div>
                <div className={`${glassmorphism.panel.card} ${glassmorphism.rounded.base} ${spacing.padding.base} w-32`}>
                  <p className="text-white text-sm">Base (lg)</p>
                </div>
                <div className={`${glassmorphism.panel.card} ${glassmorphism.rounded.full} ${spacing.padding.base} w-32`}>
                  <p className="text-white text-sm">Full</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* コンポーネント */}
        <section className={glassmorphism.panel.base + " " + spacing.padding.lg}>
          <h2 className={typography.headings.h2 + " mb-6"}>Components</h2>

          <div className={spacing.space.md}>
            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Buttons</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.primary}`}>
                  Primary
                </button>
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.ghost}`}>
                  Ghost
                </button>
                <button className={`${components.button.variants.icon} ${components.button.sizes.icon}`}>
                  Icon
                </button>
                <button className={components.button.variants.close}>
                  ×
                </button>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Button Sizes</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <button className={`${components.button.base} ${components.button.sizes.sm} ${components.button.variants.primary}`}>
                  Small
                </button>
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.primary}`}>
                  Base
                </button>
                <button className={`${components.button.base} ${components.button.sizes.md} ${components.button.variants.primary}`}>
                  Medium
                </button>
                <button className={`${components.button.base} ${components.button.sizes.lg} ${components.button.variants.primary}`}>
                  Large
                </button>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={components.card.base}>
                  <h4 className={typography.headings.h4 + " mb-2"}>Base Card</h4>
                  <p className={typography.sizes.sm + " " + colors.text.secondary}>
                    Standard card with glassmorphism styling
                  </p>
                </div>
                <div className={components.card.interactive}>
                  <h4 className={typography.headings.h4 + " mb-2"}>Interactive Card</h4>
                  <p className={typography.sizes.sm + " " + colors.text.secondary}>
                    Hover for interactive effect
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Badges</h3>
              <div className="flex flex-wrap gap-3">
                {colors.routes.map((color, index) => (
                  <span
                    key={index}
                    className={`${components.badge.base} ${components.badge.sizes.sm}`}
                    style={{ backgroundColor: color }}
                  >
                    Route {index + 1}
                  </span>
                ))}
                <span className={`${components.badge.base} ${components.badge.sizes.base}`} style={{ backgroundColor: getRouteColor(10) }}>
                  Route 17
                </span>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Input Fields</h3>
              <input
                type="text"
                placeholder="Enter text..."
                className={components.input.base + " w-full md:w-80"}
              />
            </div>
          </div>
        </section>

        {/* スペーシング */}
        <section className={glassmorphism.panel.base + " " + spacing.padding.lg}>
          <h2 className={typography.headings.h2 + " mb-6"}>Spacing</h2>

          <div className={spacing.space.md}>
            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Padding</h3>
              <div className={spacing.space.base}>
                <div className={`${colors.glass.light} ${spacing.padding.xs} ${glassmorphism.rounded.base} inline-block`}>
                  <span className="text-white text-xs">xs (p-1)</span>
                </div>
                <div className={`${colors.glass.light} ${spacing.padding.sm} ${glassmorphism.rounded.base} inline-block ml-2`}>
                  <span className="text-white text-xs">sm (p-2)</span>
                </div>
                <div className={`${colors.glass.light} ${spacing.padding.base} ${glassmorphism.rounded.base} inline-block ml-2`}>
                  <span className="text-white text-xs">base (p-3)</span>
                </div>
                <div className={`${colors.glass.light} ${spacing.padding.md} ${glassmorphism.rounded.base} inline-block ml-2`}>
                  <span className="text-white text-xs">md (p-4)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Gap</h3>
              <div className={`flex ${spacing.gap.xs} mb-2`}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${colors.glass.light} ${spacing.padding.base} ${glassmorphism.rounded.base}`}>
                    <span className="text-white text-xs">gap-xs</span>
                  </div>
                ))}
              </div>
              <div className={`flex ${spacing.gap.base} mb-2`}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${colors.glass.light} ${spacing.padding.base} ${glassmorphism.rounded.base}`}>
                    <span className="text-white text-xs">gap-base</span>
                  </div>
                ))}
              </div>
              <div className={`flex ${spacing.gap.lg}`}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${colors.glass.light} ${spacing.padding.base} ${glassmorphism.rounded.base}`}>
                    <span className="text-white text-xs">gap-lg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* トランジション */}
        <section className={glassmorphism.panel.base + " " + spacing.padding.lg}>
          <h2 className={typography.headings.h2 + " mb-6"}>Transitions</h2>

          <div className={spacing.space.md}>
            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Transition Types</h3>
              <div className="flex flex-wrap gap-4">
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.primary} ${transitions.type.colors}`}>
                  Colors
                </button>
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.primary} ${transitions.type.transform}`}>
                  Transform
                </button>
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.primary} ${transitions.type.all}`}>
                  All
                </button>
              </div>
            </div>

            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Durations</h3>
              <div className="flex flex-wrap gap-4">
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.primary} ${transitions.duration.fast}`}>
                  Fast (150ms)
                </button>
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.primary} ${transitions.duration.base}`}>
                  Base (300ms)
                </button>
                <button className={`${components.button.base} ${components.button.sizes.base} ${components.button.variants.primary} ${transitions.duration.slow}`}>
                  Slow (500ms)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 実用例 */}
        <section className={glassmorphism.panel.base + " " + spacing.padding.lg}>
          <h2 className={typography.headings.h2 + " mb-6"}>Usage Examples</h2>

          <div className={spacing.space.md}>
            <div>
              <h3 className={typography.headings.h3 + " mb-3"}>Route Card Example</h3>
              <div className={components.card.interactive + " max-w-md"}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`${components.badge.base} ${components.badge.sizes.base}`}
                      style={{ backgroundColor: getRouteColor(0) }}
                    >
                      17
                    </span>
                    <span className={`${typography.sizes.base} ${colors.text.primary} ${typography.weights.medium}`}>
                      Oak To Downtown
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`${typography.sizes.sm} ${colors.text.tertiary}`}>
                      On Time
                    </span>
                    <span className={colors.text.tertiary}>|</span>
                    <span className={typography.sizes.lg}>☀️</span>
                  </div>
                </div>
                <div className={spacing.margin.top.base + " " + spacing.padding.y.base + " " + glassmorphism.border.light}>
                  <div className="flex items-center justify-between">
                    <span className={colors.text.tertiary + " " + typography.sizes.sm}>Scheduled:</span>
                    <span className={colors.text.primary + " " + typography.sizes.sm + " " + typography.weights.medium}>
                      3:15 PM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

