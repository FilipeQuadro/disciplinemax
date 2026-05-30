"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/notifications";

/**
 * Registers the Service Worker on first app load.
 * This ensures offline support, push notifications, and the branded
 * loading screen work for ALL users — not just those who click
 * "Ativar notificações" in settings.
 */
export function SwRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
