"use client";

import { useEffect, useState } from "react";

export function BackgroundParticles() {
  const [particles, setParticles] = useState<Array<{ id: number; size: number; left: string; duration: string; delay: string; color: string }>>([]);

  useEffect(() => {
    const colors = ["#D4AF37", "#7C6BBD", "#3ABAB4", "#E8844A"];
    const p = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1.5,
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 20 + 20}s`,
      delay: `${Math.random() * 15}s`,
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
