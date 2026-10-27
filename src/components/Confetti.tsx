import React, { useEffect, useState } from "react";

export const Confetti = ({ active }: { active: boolean }) => {
  const [particles, setParticles] = useState<
    {
      id: number;
      left: number;
      delay: number;
      duration: number;
      color: string;
    }[]
  >([]);

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: ["#4ade80", "#38bdf8", "#c084fc", "#fbbf24", "#f87171"][
          Math.floor(Math.random() * 5)
        ],
      }));
      setParticles(newParticles);

      const timeout = setTimeout(() => setParticles([]), 5000);
      return () => clearTimeout(timeout);
    }
  }, [active]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-10px] w-2.5 h-2.5 rounded-sm animate-confetti"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};
