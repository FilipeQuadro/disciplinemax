import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppMessage, getInstanceState, cleanPhone, checkWhatsapp, STATE_ERRORS
} from "@/lib/whatsapp";

/**
 * Full diagnostic test for WhatsApp:
 * 1. Check instance state (authorized?)
 * 2. Try to resolve chatId via checkWhatsapp (non-blocking — known false negatives for some countries)
 * 3. Send message using resolved chatId (lid) or fallback to phone@c.us
 * 4. Return full diagnostic info
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { idInstance, apiTokenInstance, phone, message } = body;

  if (!idInstance || !apiTokenInstance || !phone) {
    return NextResponse.json(
      { ok: false, error: "Instance ID, API Token e número são obrigatórios." },
      { status: 400 }
    );
  }

  const cleanNum = cleanPhone(phone);

  // Step 1: Check instance state
  const state = await getInstanceState(idInstance, apiTokenInstance);
  console.log(`[WhatsApp Test] phone=${cleanNum} state=${state}`);

  if (!state) {
    return NextResponse.json({
      ok: false,
      step: "getState",
      error: "Instância não encontrada ou credenciais inválidas. Verifique o Instance ID e API Token no painel do Green-API.",
    }, { status: 422 });
  }

  if (state !== "authorized") {
    return NextResponse.json({
      ok: false,
      step: "getState",
      stateInstance: state,
      error: STATE_ERRORS[state] || `Estado da instância: ${state}`,
    }, { status: 422 });
  }

  // Step 2: Try to resolve chatId via checkWhatsapp (NON-BLOCKING)
  // Green-API checkWhatsapp has known false negatives for some countries (BR included).
  // We only use it to discover lid-based chatIds — if it fails, we fall back to phone@c.us.
  let resolvedChatId: string | undefined;
  let existsOnWhatsApp: boolean | null = null;

  try {
    const waCheck = await checkWhatsapp(idInstance, apiTokenInstance, cleanNum);
    console.log(`[WhatsApp Test] checkWhatsapp: exists=${waCheck.exists} chatId=${waCheck.chatId} error=${waCheck.error}`);

    if (waCheck.exists && waCheck.chatId) {
      resolvedChatId = waCheck.chatId;
      existsOnWhatsApp = true;
    } else if (waCheck.exists === false) {
      existsOnWhatsApp = false;
      // Don't block — known false negatives. Still try to send.
      console.warn(`[WhatsApp Test] checkWhatsapp returned exists=false for ${cleanNum}. Sending anyway — known false negatives for some countries.`);
    }
  } catch (e) {
    console.warn(`[WhatsApp Test] checkWhatsapp error (non-blocking):`, e);
  }

  // Step 3: Send message using resolved chatId or fallback to phone@c.us
  console.log(`[WhatsApp Test] Sending to ${resolvedChatId || `${cleanNum}@c.us`}`);

  const result = await sendWhatsAppMessage(
    idInstance,
    apiTokenInstance,
    cleanNum,
    message || "✅ Teste DisciplinaMax!",
    { resolvedChatId }
  );

  return NextResponse.json({
    ...result,
    step: "sendMessage",
    stateInstance: state,
    phoneChecked: cleanNum,
    existsOnWhatsApp,
    resolvedChatId: resolvedChatId || `${cleanNum}@c.us`,
  }, { status: result.ok ? 200 : 422 });
}
