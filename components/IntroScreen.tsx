"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";

export function IntroScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setVisible(false), 600);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={`intro-screen ${fadeOut ? "fade-out" : ""}`}>
      <div className="intro-logo">
        <Target size={36} className="text-white" />
      </div>
      <p className="intro-title">DisciplinaApp</p>
      <p className="intro-subtitle">Seu mentor de estudos e disciplina diária</p>
      <div className="intro-loader">
        <div className="intro-loader-bar" />
      </div>
    </div>
  );
}
