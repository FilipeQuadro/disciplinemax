"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { registerServiceWorker, setupPeriodicSync } from "@/lib/notifications";
import { useStore } from "@/store/useStore";

// Horários padrão de notificação
const DEFAULT_TIMES = ["07:00", "12:00", "15:00", "19:00", "21:00"];

export function NotificationInit() {
  const { notificationsEnabled, books, bibleGoal, todayBibleChapters } = useStore();

  useEffect(() => {
    // Registrar SW silenciosamente
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

  useEffect(() => {
    if (!notificationsEnabled) return;
    if (typeof window === "undefined" || Notification.permission !== "granted") return;

    // Agenda notificações nos horários configurados
    const checkAndSchedule = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      
      const totalPagesGoal = books.reduce((s, b) => s + b.daily_goal, 0);
      const totalPagesRead = books.reduce((s, b) => s + b.pages_read_today, 0);
      const booksGoalMet = totalPagesRead >= totalPagesGoal;
      const bibleGoalMet = bibleGoal ? todayBibleChapters >= bibleGoal.daily_chapters : true;
      const allDone = booksGoalMet && bibleGoalMet;

      if (allDone) return; // Não notificar se tudo foi feito

      if (DEFAULT_TIMES.includes(currentTime)) {
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
      }
    };

    // Checar a cada minuto
    const interval = setInterval(checkAndSchedule, 60000);
    checkAndSchedule(); // checar imediatamente ao ativar
    return () => clearInterval(interval);
  }, [notificationsEnabled, books, bibleGoal, todayBibleChapters]);

  return null;
}
