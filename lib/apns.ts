import fs from "fs";
import apn from "@parse/node-apn";

export function createApnsProvider() {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const keyPath = process.env.APNS_KEY_PATH;
  const production = process.env.APNS_PRODUCTION === "true";

  if (!keyId || !teamId || !bundleId || !keyPath) {
    return null;
  }

  try {
    return new apn.Provider({
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

export async function sendApnsNotification(provider: apn.Provider, deviceToken: string, payload: { title: string; body: string; url?: string }) {
  const note = new apn.Notification();
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
