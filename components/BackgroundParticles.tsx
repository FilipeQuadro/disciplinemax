"use client";

import { useEffect, useState } from "react";

export function BackgroundParticles() {
  const [particles, setParticles] = useState<Array<{ id: number; size: number; left: string; duration: string; delay: string; color: string }>>([]);

  useEffect(() => {
    const colors = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981"];
    const p = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 15 + 15}s`,
      delay: `${Math.random() * 10}s`,
      color: colors[i % colors.length],
    }));
    setParticles(p);
  }, []);

  return (
    <div className="bg-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="bg-particle"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            background: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
