import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppMessage, getInstanceState, cleanPhone, checkWhatsapp, STATE_ERRORS
} from "@/lib/whatsapp";

/**
 * Full diagnostic test for WhatsApp:
 * 1. Check instance state (authorized?)
 * 2. Verify phone number exists on WhatsApp (checkWhatsapp)
 * 3. Send message using the CORRECT chatId (lid-based if returned)
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

  // Step 2: Verify phone number exists on WhatsApp
  const waCheck = await checkWhatsapp(idInstance, apiTokenInstance, cleanNum);
  console.log(`[WhatsApp Test] checkWhatsapp: exists=${waCheck.exists} chatId=${waCheck.chatId} error=${waCheck.error}`);

  if (waCheck.error && !waCheck.exists) {
    return NextResponse.json({
      ok: false,
      step: "checkWhatsapp",
      phoneChecked: cleanNum,
      existsOnWhatsApp: false,
      error: `Não foi possível verificar se o número ${cleanNum} está no WhatsApp: ${waCheck.error}`,
    }, { status: 422 });
  }

  if (!waCheck.exists) {
    return NextResponse.json({
      ok: false,
      step: "checkWhatsapp",
      phoneChecked: cleanNum,
      existsOnWhatsApp: false,
      error: `O número ${cleanNum} NÃO está no WhatsApp. Verifique o número (deve ter código do país, ex: 5511987654321).`,
    }, { status: 422 });
  }

  // Step 3: Send using the RESOLVED chatId (may be lid-based!)
  const resolvedChatId = waCheck.chatId;
  console.log(`[WhatsApp Test] Sending to resolved chatId: ${resolvedChatId}`);

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
    existsOnWhatsApp: waCheck.exists,
    resolvedChatId,
  }, { status: result.ok ? 200 : 422 });
}
