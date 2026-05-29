"use client";

import { useEffect, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { registerServiceWorker, setupPeriodicSync, subscribeToPush } from "@/lib/notifications";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";

export function NotificationInit() {
  const { notificationsEnabled, setNotificationsEnabled, books, bibleGoal, todayBibleChapters, settings } = useStore();
  const { user } = useAuth();
  const notifTimes = useMemo(() =>
    settings?.notification_times?.length ? settings.notification_times : ["07:00", "12:00", "19:00"],
    [settings?.notification_times]
  );

  // Register service worker once
  useEffect(() => {
    registerServiceWorker().then((reg) => {
      if (reg) setupPeriodicSync(reg);
    });
  }, []);

  // Restore notificationsEnabled from browser permission on mount
  // Also ensure push subscription exists so server-side push works when tab is closed
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      if (!notificationsEnabled) {
        setNotificationsEnabled(true);
      }
      // Ensure push subscription exists for server-side delivery
      registerServiceWorker().then(async (reg) => {
        if (!reg) return;
        const existingSub = await reg.pushManager.getSubscription();
        if (!existingSub) {
          await subscribeToPush(reg);
        }
      });
    }
  }, []);

  // Capacitor Push (iOS/Android)
  useEffect(() => {
    const registerCapacitorPush = async () => {
      if (typeof window === "undefined") return;
      const platform = Capacitor.getPlatform?.() ?? "web";
      if (platform === "web") return;

      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") return;

        await PushNotifications.register();

        PushNotifications.addListener("registration", async (token) => {
          if (!user?.id) return;
          const { supabase: sb } = await import("@/lib/supabase");
          const { data: { session } } = await sb!.auth.getSession();
          const authToken = session?.access_token || "";
          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
            body: JSON.stringify({
              user_id: user.id,
              platform: "apns",
              device_token: token.value,
              bundle_id: process.env.NEXT_PUBLIC_APNS_BUNDLE_ID || "br.com.disciplina.app",
            }),
          });
        });

        PushNotifications.addListener("registrationError", (error) => {
          console.error("Capacitor Push registration error:", error);
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push notification received:", notification);
        });
      } catch (error) {
        console.error("Capacitor Push initialization failed:", error);
      }
    };

    registerCapacitorPush();
  }, []);

  // Browser notifications — uses settings times with 5-minute tolerance
  // Uses ref to track fired notifications so we don't re-notify within the window
  useEffect(() => {
    if (!notificationsEnabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const firedToday = new Map<string, number>(); // time_slot → timestamp of last fire

    const checkAndNotify = () => {
      const now = new Date();
      const brt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(now);
      const [brtH, brtM] = brt.split(":").map(Number);
      const currentMinutes = brtH * 60 + brtM;
      const today = now.toISOString().split("T")[0];

      // Clean old entries from previous days
      const keysToDelete: string[] = [];
      firedToday.forEach((_, key) => {
        if (!key.startsWith(today)) keysToDelete.push(key);
      });
      keysToDelete.forEach((key) => firedToday.delete(key));

      const totalPagesGoal = books.reduce((s, b) => s + b.daily_goal, 0);
      const totalPagesRead = books.reduce((s, b) => s + b.pages_read_today, 0);
      const booksGoalMet = totalPagesRead >= totalPagesGoal;
      const bibleGoalMet = bibleGoal ? todayBibleChapters >= bibleGoal.daily_chapters : true;

      if (booksGoalMet && bibleGoalMet) return;

      // 5-minute tolerance window
      const matched = notifTimes.find((t) => {
        const [h, m] = t.split(":").map(Number);
        const nm = h * 60 + m;
        return currentMinutes >= nm && currentMinutes < nm + 5;
      });

      if (!matched) return;

      // Dedup: only fire once per time slot per day
      const dedupKey = `${today}_${matched}`;
      if (firedToday.has(dedupKey)) return;
      firedToday.set(dedupKey, Date.now());

      const pending = [];
      if (!booksGoalMet) pending.push(`📚 ${totalPagesGoal - totalPagesRead} páginas de livros`);
      if (!bibleGoalMet) pending.push(`✝️ ${(bibleGoal?.daily_chapters || 0) - todayBibleChapters} capítulos da Bíblia`);

      if (pending.length > 0) {
        new Notification("🎯 Metas pendentes!", {
          body: "Faltam: " + pending.join(" · "),
          icon: "/icon-192.png",
          tag: "disciplina-scheduled",
          requireInteraction: true,
        });
      }
    };

    // Check immediately, then every 30 seconds for better coverage
    checkAndNotify();
    const interval = setInterval(checkAndNotify, 30000);
    return () => clearInterval(interval);
  }, [notificationsEnabled, books, bibleGoal, todayBibleChapters, notifTimes]);

  return null;
}
