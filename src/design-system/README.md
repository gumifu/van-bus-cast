# VanBusCast Design System

VanBusCastアプリケーションの統一されたデザインシステムです。

## 概要

このデザインシステムは、グラスモーフィズム（Glassmorphism）を基調とした、モダンで一貫性のあるUIコンポーネントとスタイルを提供します。

## 基本原則

1. **Glassmorphism**: 半透明の背景、ぼかし効果、柔らかなボーダー
2. **アクセシビリティ**: 最小タッチターゲット 44x44px、適切なコントラスト比
3. **レスポンシブ**: モバイルファースト、デスクトップでも快適な表示
4. **一貫性**: すべてのコンポーネントで統一されたスタイル言語

## 使用方法

### 基本的なインポート

```typescript
import { colors, typography, glassmorphism, spacing, components, transitions } from '@/design-system';
```

### カラー

```typescript
// グラスモーフィズム背景
<div className={colors.glass.light}>

// テキストカラー
<span className={colors.text.primary}>Primary Text</span>
<span className={colors.text.secondary}>Secondary Text</span>

// ルートカラーを取得
const routeColor = getRouteColor(0); // "#0066CC"
```

### タイポグラフィ

```typescript
// フォントサイズ（モバイル → デスクトップ）
<h1 className={typography.headings.h1}>Heading 1</h1>
<p className={typography.sizes.baseMobile}>Responsive Text</p>

// フォントウェイト
<span className={typography.weights.semibold}>Semibold Text</span>
```

### Glassmorphism

```typescript
// パネルスタイル
<div className={glassmorphism.panel.base}>
  Content
</div>

// カードスタイル
<div className={glassmorphism.panel.card}>
  Card Content
</div>

// 便利な関数
<div className={getGlassPanel("base")}>
  Content
</div>
```

### スペーシング

```typescript
// パディング
<div className={spacing.padding.base}>
  <div className={spacing.padding.x.md}>Horizontal Padding</div>
  <div className={spacing.padding.y.base}>Vertical Padding</div>
</div>

// マージン
<div className={spacing.margin.top.base}>
  <div className={spacing.margin.bottom.md}>Spaced Content</div>
</div>

// ギャップ
<div className={`flex ${spacing.gap.base}`}>
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// スペース（子要素間）
<div className={spacing.space.base}>
  <div>Child 1</div>
  <div>Child 2</div>
</div>
```

### コンポーネント

```typescript
// ボタン
<button className={`${components.button.base} ${components.button.sizes.icon} ${components.button.variants.close}`}>
  ×
</button>

// カード
<div className={components.card.base}>
  Card Content
</div>

// インタラクティブカード
<div className={components.card.interactive}>
  Clickable Card
</div>

// パネル
<div className={components.panel.mobile}>
  Mobile Panel
</div>

// バッジ
<span className={`${components.badge.base} ${components.badge.sizes.base}`} style={{ backgroundColor: routeColor }}>
  Route 17
</span>
```

### トランジション

```typescript
// 色のトランジション
<div className={transitions.common.colors}>
  Hover me
</div>

// パネルのスライドアニメーション
<div className={transitions.common.panel}>
  Slide Panel
</div>
```

## 実装例

### シンプルなパネル

```typescript
import { glassmorphism, colors, spacing, typography } from '@/design-system';

function SimplePanel() {
  return (
    <div className={`${glassmorphism.panel.base} ${colors.text.primary} ${spacing.padding.base}`}>
      <h2 className={typography.headings.h2}>Panel Title</h2>
      <p className={typography.sizes.base}>Panel content goes here.</p>
    </div>
  );
}
```

### インタラクティブなカード

```typescript
import { components, colors, typography } from '@/design-system';

function RouteCard({ route, destination, delay }) {
  const routeColor = getRouteColor(routeIndex);

  return (
    <div className={components.card.interactive}>
      <div className="flex items-center gap-2">
        <span
          className={`${components.badge.base} ${components.badge.sizes.base}`}
          style={{ backgroundColor: routeColor }}
        >
          {route}
        </span>
        <span className={typography.sizes.base}>{destination}</span>
      </div>
    </div>
  );
}
```

### モバイルパネル

```typescript
import { components, transitions } from '@/design-system';

function MobilePanel({ isOpen, onClose }) {
  return (
    <div
      className={`${components.panel.mobile} ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {/* Panel content */}
    </div>
  );
}
```

## ファイル構造

```
src/design-system/
├── index.ts              # メインエクスポート
├── colors.ts             # カラーパレット
├── typography.ts         # タイポグラフィ
├── glassmorphism.ts     # グラスモーフィズムスタイル
├── spacing.ts            # スペーシング
├── components.ts         # コンポーネントスタイル
├── transitions.ts        # アニメーション・トランジション
└── README.md            # このドキュメント
```

## ガイドライン

### カラー使用

- メインテキスト: `colors.text.primary` (white)
- セカンダリテキスト: `colors.text.secondary` (gray-300)
- ターティアリテキスト: `colors.text.tertiary` (gray-400)
- ルート識別: `getRouteColor(index)` を使用

### フォントサイズ

- モバイルで大きく、デスクトップで小さくする場合は `typography.sizes.baseMobile` を使用
- 見出しは `typography.headings` を使用
- 本文は `typography.sizes.base` または `typography.sizes.baseMobile` を使用

### Glassmorphism

- パネル: `glassmorphism.panel.base`
- カード: `glassmorphism.panel.card`
- 軽い背景: `glassmorphism.panel.light`

### スペーシング

- コンポーネント間: `spacing.space.base` (space-y-3)
- パディング: `spacing.padding.base` (p-3)
- マージン: `spacing.margin.top.base` など、コンテキストに応じて選択

### アクセシビリティ

- すべてのインタラクティブ要素は最小 44x44px (`components.button.sizes.icon`)
- 適切なコントラスト比を維持
- `aria-label` を適切に使用

## 更新履歴

- 2024: 初期バージョン作成


