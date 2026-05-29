// Server-side Web Push — DO NOT import from client components (uses Node.js 'net'/'tls')
import webpush from "web-push";

// Initialize VAPID once at module level
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
if (vapidPrivateKey && vapidPublicKey) {
  webpush.setVapidDetails("mailto:disciplinemax@app.com", vapidPublicKey, vapidPrivateKey);
}

export interface PushResult {
  sent: number;
  failed: number;
  expiredEndpoints: string[];
}

export async function sendWebPush(
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: { title: string; body: string; tag?: string }
): Promise<PushResult> {
  if (!vapidPrivateKey || !vapidPublicKey) return { sent: 0, failed: 0, expiredEndpoints: [] };

  const data = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, data);
      sent++;
    } catch (err: any) {
      // 410 Gone or 404 = subscription expired — mark for cleanup
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expiredEndpoints.push(sub.endpoint);
      }
      failed++;
    }
  }
  return { sent, failed, expiredEndpoints };
}

/**
 * Remove expired push subscriptions from the database.
 * Called after sendWebPush returns expired endpoints.
 */
export async function cleanupExpiredSubscriptions(
  supabase: any,
  expiredEndpoints: string[]
): Promise<number> {
  if (!supabase || expiredEndpoints.length === 0) return 0;
  let removed = 0;
  for (const endpoint of expiredEndpoints) {
    const { error } = await supabase
      .from("notification_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (!error) removed++;
  }
  return removed;
}
