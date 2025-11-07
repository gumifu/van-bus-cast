"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import SplashScreenLegacy from "./SplashScreenLegacy";

interface SplashScreenProps {
  onComplete: () => void;
}

// 新旧スプラッシュの切り替えフラグ（コンポーネントレベル）
// true にすると旧スプラッシュに戻る
const useLegacy = false;

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  // レガシー版を使用する場合は、レガシー版を返す
  if (useLegacy) {
    return <SplashScreenLegacy onComplete={onComplete} />;
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 1.2,
        delay: 2.8, // マークの左移動完了(2.6s) + ホールド(0.2s) = 2.8s
        ease: "easeInOut",
      }}
      onAnimationComplete={onComplete}
      style={{
        background: "#000000",
        position: "fixed",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        minWidth: "100%",
        minHeight: "100%",
      }}
    >
      {/* 円形グラデーション背景 */}
      <div
        className="absolute top-0 left-0 right-0 bottom-0 w-full h-full"
        style={{
          background: `
            radial-gradient(circle at 30% 20%, #FF00FF 0%, transparent 50%),
            radial-gradient(circle at 70% 50%, #8B00FF 0%, transparent 50%),
            radial-gradient(circle at 50% 80%, #0000FF 0%, transparent 50%)
          `,
        }}
      />

      {/* ぼかし付き黒幕（ほぼ黒） */}
      <div
        className="absolute top-0 left-0 right-0 bottom-0 w-full h-full"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(60px)",
          WebkitBackdropFilter: "blur(60px)",
        }}
      />

      {/* ロゴコンテナ（マークとタイプを囲む） */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="relative flex items-center">
          {/* ロゴマーク */}
          <motion.div
            initial={{ opacity: 0, y: 30, x: 10 }}
            animate={{
              opacity: [0, 1, 1],
              y: [30, 0, 0], // 中央の少し下から中央に
              x: [10, 10, -12], // 最初は少し右に配置して中央に見えるように、その後左に移動
            }}
            transition={{
              duration: 2.6, // フェードイン(1.2s) + 左移動(1.4s)
              times: [0, 0.46, 1], // 1.2sで中央、その後左移動
              ease: [0.33, 1, 0.68, 1],
            }}
            className="relative"
          >
            <Image
              src="/logo-mark.svg"
              alt="VanBusCast Logo Mark"
              width={907}
              height={1000}
              className="w-12 h-12 md:w-16 md:h-16"
              priority
              style={{
                filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5))",
              }}
            />
          </motion.div>

          {/* ロゴタイプ（左から出現、マークの右側に配置） */}
          <motion.div
            style={{
              overflow: "hidden",
              display: "flex",
              justifyContent: "flex-start",
            }}
            className="relative ml-0.5 md:ml-1"
          >
            <motion.div
              initial={{ clipPath: "inset(0 100% 0 0%)", opacity: 0 }}
              animate={{
                clipPath: [
                  "inset(0 100% 0 0%)", // 左から開始（右側100%隠す）
                  "inset(0 0% 0 0%)", // 完全に表示
                  "inset(0 0% 0 0%)", // 最後まで表示
                ],
                opacity: [0, 0.4, 1], // フェードイン（clipPathと同期）
              }}
              transition={{
                duration: 1.4,
                times: [0, 0.6, 1], // clipPathとopacityのタイミングを統一
                ease: [0.22, 1, 0.36, 1],
                delay: 1.2,
              }}
            >
              <Image
                src="/logo-type.svg"
                alt="VanBusCast Logo Type"
                width={479}
                height={137}
                className="h-12 md:h-16 w-auto"
                priority
                style={{
                  filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5))",
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
