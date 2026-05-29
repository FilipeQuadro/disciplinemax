// Server-side Web Push — DO NOT import from client components (uses Node.js 'net'/'tls')
import webpush from "web-push";

export async function sendWebPush(
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: { title: string; body: string; tag?: string }
) {
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPrivateKey || !vapidPublicKey) return { sent: 0, failed: 0 };

  webpush.setVapidDetails("mailto:disciplinemax@app.com", vapidPublicKey, vapidPrivateKey);

  const data = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, data);
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
