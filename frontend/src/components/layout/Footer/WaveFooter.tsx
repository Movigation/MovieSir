import React from "react";
import type { WaveFooterProps } from "@/components/layout/Footer/WaveFooter.types";
import { waveLayers, defaultTexts } from "@/components/layout/Footer/WaveFooter.utils";

const WaveFooter: React.FC<WaveFooterProps> = ({
  title = defaultTexts.title,
  description = defaultTexts.description,
  showButton = false,
}) => {
  return (
    <footer className="relative overflow-hidden bg-[#0d1117] text-white text-center pt-[10vh]">

      {/* Glow Background */}
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900"></div>

      {/* Footer Text Content */}
      <div className="relative z-panel pb-10">
        <h2 className="text-2xl font-light tracking-tight mb-2 text-white/90">
          {title}
        </h2>
        <p className="text-white/50 text-sm max-w-lg mx-auto">
          {description}
        </p>

        {showButton && (
          <button className="mt-5 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-blue-300 transition-all shadow-lg shadow-blue-500/20">
            버튼을 띄울수 있어요
          </button>
        )}
      </div>

      {/* Waves */}
      <div className="relative w-full z-deco">
        <svg
          className="w-full h-[12vh] min-h-[80px]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
        >
          <defs>
            <path
              id="gentle-wave"
              d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z"
            />
          </defs>

          <g>
            {waveLayers.map((layer, i) => (
              <use
                key={i}
                href="#gentle-wave"
                x={layer.x}
                y={layer.y}
                className={layer.className}
              />
            ))}
          </g>
        </svg>
      </div>
    </footer>
  );
};

export default WaveFooter;
