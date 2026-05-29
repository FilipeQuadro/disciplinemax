"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";

export function PwaInstallListener() {
  const setPwaInstallPrompt = useStore((s) => s.setPwaInstallPrompt);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [setPwaInstallPrompt]);
  return null;
}
