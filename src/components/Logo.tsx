import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export default function Logo({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  const sizeClasses = {
    sm: { icon: 20, text: "text-base", gap: "gap-1.5" },
    md: { icon: 28, text: "text-xl", gap: "gap-2" },
    lg: { icon: 36, text: "text-2xl", gap: "gap-3" },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center ${currentSize.gap} ${className}`}>
      {/* 天気アイコン（太陽と雲） */}
      <div className="relative flex-shrink-0">
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          {/* 雲（背景） */}
          <path
            d="M12 20C12 16.6863 14.6863 14 18 14C18.3476 14 18.6823 14.0273 19.0091 14.0775C20.0264 11.2686 22.6841 9.33337 25.6667 9.33337C29.0552 9.33337 31.8095 12.0877 31.8095 15.4762C31.8095 15.7467 31.7857 16.0124 31.7409 16.2709C33.2571 16.6624 34.4762 17.9333 34.4762 19.5238C34.4762 21.439 33.0152 23 31.1 23H19.6667C17.7515 23 16.3333 21.439 16.3333 19.5238C16.3333 17.9333 17.5524 16.6624 19.0686 16.2709C19.0238 16.0124 19 15.7467 19 15.4762C19 14.6667 19.2381 13.9048 19.619 13.2667C18.8571 12.8571 17.9524 12.619 17 12.619C14.2381 12.619 12 14.8571 12 17.619V20Z"
            fill="url(#cloudGradient)"
            opacity="0.8"
          />
          {/* 太陽（前景・アクセント） */}
          <circle
            cx="20"
            cy="14"
            r="8"
            fill="url(#sunGradient)"
          />
          {/* 太陽の光線（抽象的な交通表現） */}
          <g opacity="0.3">
            <path
              d="M20 4L20 2M20 26L20 28M28 14L30 14M10 14L8 14M25.66 6.34L26.95 5.05M14.05 22.95L12.76 24.24M25.66 21.66L26.95 22.95M14.05 5.05L12.76 6.34"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-yellow-300"
            />
          </g>
          {/* グラデーション定義 */}
          <defs>
            <linearGradient id="sunGradient" x1="12" y1="6" x2="28" y2="22">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFA500" />
              <stop offset="100%" stopColor="#FF8C00" />
            </linearGradient>
            <linearGradient id="cloudGradient" x1="12" y1="14" x2="34" y2="23">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="50%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* テキスト */}
      {showText && (
        <div className={`${currentSize.text} font-light tracking-tight`}>
          <span className="text-white">Van</span>
          <span className="text-gray-300">Bus</span>
          <span className="text-white">Cast</span>
        </div>
      )}
    </div>
  );
}

