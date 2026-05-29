// Gerenciamento de notificações push (Web Push API — client-side)

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (e) {
    console.error("SW registration failed:", e);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

export async function subscribeToPush(registration: ServiceWorkerRegistration) {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("VAPID key not configured");
    return null;
  }
  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    // Get auth token to send with subscription
    const { supabase: sb } = await import("@/lib/supabase");
    const { data: { session } } = await sb!.auth.getSession();
    const authToken = session?.access_token || "";

    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        ...sub.toJSON(),
        user_id: session?.user?.id,
      }),
    });
    return sub;
  } catch (e) {
    console.error("Push subscription failed:", e);
    return null;
  }
}

export async function setupPeriodicSync(registration: ServiceWorkerRegistration) {
  if (!("periodicSync" in registration)) return;
  try {
    const status = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
    if (status.state === "granted") {
      await (registration as any).periodicSync.register("check-goals", {
        minInterval: 60 * 60 * 1000, // 1 hora
      });
    }
  } catch (e) {
    console.log("Periodic sync not supported:", e);
  }
}

export function showLocalNotification(title: string, body: string, url = "/") {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;
  const notif = new Notification(title, {
    body,
    icon: "/icon-192.png",
    tag: "disciplina-local",
  });
  notif.onclick = () => {
    window.focus();
    window.location.href = url;
    notif.close();
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
