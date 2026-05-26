import type apn from "@parse/node-apn";

export function createApnsProvider() {
  if (typeof window !== "undefined") return null;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const keyPath = process.env.APNS_KEY_PATH;
  const production = process.env.APNS_PRODUCTION === "true";

  if (!keyId || !teamId || !bundleId || !keyPath) {
    return null;
  }

  try {
    const fs = require("fs") as typeof import("fs");
    const nodeApn = require("@parse/node-apn") as typeof apn;
    return new nodeApn.Provider({
      token: {
        key: fs.readFileSync(keyPath),
        keyId,
        teamId,
      },
      production,
    });
  } catch (error) {
    console.error("APNS provider initialization failed:", error);
    return null;
  }
}

export async function sendApnsNotification(provider: InstanceType<typeof import("@parse/node-apn").Provider>, deviceToken: string, payload: { title: string; body: string; url?: string }) {
  const nodeApn = require("@parse/node-apn") as typeof apn;
  const note = new nodeApn.Notification();
  note.alert = {
    title: payload.title,
    body: payload.body,
  };
  note.topic = process.env.APNS_BUNDLE_ID || "br.com.disciplina.app";
  note.sound = "default";
  note.pushType = "alert";
  note.payload = {
    url: payload.url || "/",
  };

  const response = await provider.send(note, deviceToken);
  if (response.failed && response.failed.length > 0) {
    const error = response.failed[0].response || response.failed[0].error;
    throw new Error(`APNS failed: ${JSON.stringify(error)}`);
  }
  return response;
}
