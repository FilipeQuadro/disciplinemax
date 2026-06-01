import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, getInstanceState, cleanPhone, STATE_ERRORS } from "@/lib/whatsapp";

/**
 * Server-side proxy for testing WhatsApp messages.
 * The Green-API blocks CORS (403 on preflight), so browser fetch fails.
 * This route also checks instance state BEFORE sending, because Green-API
 * returns success (idMessage) even when the instance is disconnected —
 * the message gets queued but never delivered.
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

  // Step 1: Check instance state first
  const state = await getInstanceState(idInstance, apiTokenInstance);

  if (!state) {
    return NextResponse.json({
      ok: false,
      stateInstance: null,
      error: "Instância não encontrada ou credenciais inválidas. Verifique o Instance ID e API Token no painel do Green-API.",
    }, { status: 422 });
  }

  if (state !== "authorized") {
    return NextResponse.json({
      ok: false,
      stateInstance: state,
      error: STATE_ERRORS[state] || `Estado da instância: ${state}`,
    }, { status: 422 });
  }

  // Step 2: Instance is authorized — send the message
  const cleanNum = cleanPhone(phone);
  const result = await sendWhatsAppMessage(idInstance, apiTokenInstance, cleanNum, message || "✅ Teste DisciplinaMax!");

  return NextResponse.json({
    ...result,
    stateInstance: state,
  }, { status: result.ok ? 200 : 422 });
}
