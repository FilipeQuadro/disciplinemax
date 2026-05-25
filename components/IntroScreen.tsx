"use client";

import { useEffect, useState } from "react";
import { FlameKindling } from "lucide-react";

export function IntroScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setVisible(false), 800);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={`intro-screen ${fadeOut ? "fade-out" : ""}`}>
      <div className="intro-logo">
        <FlameKindling size={32} className="text-[#0B0E14]" />
      </div>
      <p className="intro-title">DisciplinaMax</p>
      <p className="intro-subtitle">Mentor de Disciplina</p>
      <div className="intro-loader">
        <div className="intro-loader-bar" />
      </div>
    </div>
  );
}
