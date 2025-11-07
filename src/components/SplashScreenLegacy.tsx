"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [containerOpacity, setContainerOpacity] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [logoTranslateY, setLogoTranslateY] = useState(50);
  const [blurAmount, setBlurAmount] = useState(60);

  useEffect(() => {
    // フェードインアニメーション開始（50ms後）
    const fadeInTimer = setTimeout(() => {
      setLogoOpacity(1);
      setLogoTranslateY(0);
    }, 50);

    // 750ms後にフェードアウト開始（ブラーも強くする）
    const fadeOutTimer = setTimeout(() => {
      setLogoOpacity(0);
      setLogoTranslateY(-20);
      setBlurAmount(100); // フェードアウト時にブラーを強く
      // コンテナ全体もフェードアウト
      setContainerOpacity(0);
    }, 750);

    // 1.35秒後に完了コールバック
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1350);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center pointer-events-none"
      style={{
        background: "#000000",
        position: "fixed",
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        minWidth: "100%",
        minHeight: "100%",
        opacity: containerOpacity,
        transition: "opacity 0.6s ease-in-out",
        willChange: "opacity",
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
          backdropFilter: `blur(${blurAmount}px)`,
          WebkitBackdropFilter: `blur(${blurAmount}px)`,
          transition:
            "backdrop-filter 0.6s ease-in-out, -webkit-backdrop-filter 0.6s ease-in-out",
          willChange: "backdrop-filter",
        }}
      />

      {/* ロゴ */}
      <div
        className="relative z-10"
        style={{
          opacity: logoOpacity,
          transform: `translateY(${logoTranslateY}px)`,
          transition: "opacity 0.6s ease-in-out, transform 0.6s ease-in-out",
          willChange: "opacity, transform",
        }}
      >
        <Image
          src="/logo_full.svg"
          alt="VanBusCast Logo"
          width={4502}
          height={1000}
          className="w-[30vw] max-w-[300px] h-auto"
          priority
          style={{
            filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5))",
          }}
        />
      </div>
    </div>
  );
}
