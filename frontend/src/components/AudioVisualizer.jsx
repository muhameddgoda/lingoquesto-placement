import React from "react";

const AudioVisualizer = ({ audioLevel = 0, barCount = 60 }) => {
  // normalize 0..500 -> 0..1
  const level = Math.max(0, Math.min(1, audioLevel / 500));

  return (
    <div className="flex items-end justify-center gap-[3px] h-20 overflow-hidden">
      {Array.from({ length: barCount }).map((_, i) => {
        const center = (barCount - 1) / 2;
        const dist = Math.abs(i - center) / center; // 0..1
        const wave = Math.cos(dist * Math.PI) * 2.7 + 1.3; // 0.3..1.0
        const scale = 0.1 + level * wave * 2.8; // keep some base height
        return (
          <div
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-[#967AFE] to-[#C4B5FD] will-change-transform transition-transform duration-50 ease-out"
            style={{
              transform: `scaleY(${scale})`,
              transformOrigin: "middle",
              height: "100%", // fixed container height; we only scale
              opacity: 1.7 + level * 0.5,
            }}
          />
        );
      })}
    </div>
  );
};

export default React.memo(AudioVisualizer);
