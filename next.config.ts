import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel用の設定
  output: 'standalone',

  // 静的ファイルの最適化
  images: {
    unoptimized: true,
  },

  // 環境変数の検証
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },

  // Storybookファイルをビルドから除外
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // webpack設定
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントサイドで.storiesファイルを除外
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },

  // パフォーマンス最適化
  // experimental: {
  //   optimizeCss: true,
  // },
};

export default nextConfig;
