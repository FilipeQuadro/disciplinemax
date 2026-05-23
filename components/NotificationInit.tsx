"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { registerServiceWorker, setupPeriodicSync } from "@/lib/notifications";
import { useStore } from "@/store/useStore";

export function NotificationInit() {
  const { notificationsEnabled, books, bibleGoal, todayBibleChapters, settings } = useStore();
  const notifTimes = settings?.notification_times || ["07:00", "12:00", "19:00"];

  useEffect(() => {
    registerServiceWorker().then((reg) => {
      if (reg) setupPeriodicSync(reg);
    });
  }, []);

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
          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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

  // Notificações browser — usa horários do settings com tolerância de 2 min
  useEffect(() => {
    if (!notificationsEnabled) return;
    if (typeof window === "undefined" || Notification.permission !== "granted") return;

    const lastNotified = new Map<string, string>(); // date_time → evitar duplicata

    const checkAndSchedule = () => {
      const now = new Date();
      const brt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(now);
      const [brtH, brtM] = brt.split(":").map(Number);
      const currentMinutes = brtH * 60 + brtM;
      const today = now.toISOString().split("T")[0];

      const totalPagesGoal = books.reduce((s, b) => s + b.daily_goal, 0);
      const totalPagesRead = books.reduce((s, b) => s + b.pages_read_today, 0);
      const booksGoalMet = totalPagesRead >= totalPagesGoal;
      const bibleGoalMet = bibleGoal ? todayBibleChapters >= bibleGoal.daily_chapters : true;

      if (booksGoalMet && bibleGoalMet) return;

      const matched = notifTimes.find((t) => {
        const [h, m] = t.split(":").map(Number);
        const nm = h * 60 + m;
        return currentMinutes >= nm && currentMinutes < nm + 2;
      });

      if (!matched) return;

      const dedupKey = `${today}_${matched}`;
      if (lastNotified.get(today) === matched) return;
      lastNotified.set(today, matched);

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

    const interval = setInterval(checkAndSchedule, 60000);
    checkAndSchedule();
    return () => clearInterval(interval);
  }, [notificationsEnabled, books, bibleGoal, todayBibleChapters, notifTimes]);

  return null;
}
