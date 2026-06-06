import { useEffect, useState } from "react";

export default function WaveVisualizer({ isActive }: { isActive: boolean }) {
  const [heights, setHeights] = useState<number[]>(Array(8).fill(8));

  useEffect(() => {
    if (!isActive) {
      setHeights(Array(8).fill(8));
      return;
    }

    const interval = setInterval(() => {
      setHeights(
        Array(8)
          .fill(0)
          .map(() => 8 + Math.random() * 40)
      );
    }, 200);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-end justify-center gap-1.5 h-14">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-2 rounded-full bg-gradient-to-t from-blue-600 to-teal-400 transition-all duration-200 ease-out"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}
