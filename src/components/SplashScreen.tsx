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
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{
        opacity: [1, 1, 0],
        filter: ["blur(0px)", "blur(0px)", "blur(2px)"],
      }}
      transition={{
        duration: 1.2,
        delay: 3.2, // マーク(1.2s) + タイプ(1.4s) + ホールド(0.6s) = 3.2s
        ease: "easeInOut",
      }}
      onAnimationComplete={onComplete}
    >
      {/* 既存の背景（変更しない） */}
      <div className="absolute inset-0 w-full h-full">
        {/* 円形グラデーション背景 */}
        <div
          className="absolute inset-0 w-full h-full"
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
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(60px)",
            WebkitBackdropFilter: "blur(60px)",
          }}
        />
      </div>

      {/* ロゴコンテナ（中央揃え） */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4">
        {/* ロゴマーク */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: [0, 1],
            scale: [0.85, 1.04, 1],
          }}
          transition={{
            duration: 1.2,
            times: [0, 0.7, 1],
            ease: [0.33, 1, 0.68, 1],
          }}
          className="relative"
        >
          <Image
            src="/logo-mark.svg"
            alt="VanBusCast Logo Mark"
            width={907}
            height={1000}
            className="w-36 h-36 md:w-40 md:h-40"
            priority
            style={{
              filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5))",
            }}
          />
        </motion.div>

        {/* ロゴタイプ */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{
            opacity: [0, 1],
            scaleX: [0, 1.06, 1],
          }}
          transition={{
            duration: 1.4,
            times: [0, 0.8, 1],
            ease: [0.22, 1, 0.36, 1],
            delay: 1.2, // マークの後に開始
          }}
          style={{
            transformOrigin: "center",
          }}
          className="relative"
        >
          <Image
            src="/logo-type.svg"
            alt="VanBusCast Logo Type"
            width={479}
            height={137}
            className="h-8 md:h-10 w-auto"
            priority
            style={{
              filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5))",
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
