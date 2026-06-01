import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

/**
 * Server-side proxy for testing WhatsApp messages.
 * The Green-API blocks CORS (403 on preflight), so browser fetch fails.
 * This route lets the client call our server, which calls Green-API server-to-server.
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

  const result = await sendWhatsAppMessage(idInstance, apiTokenInstance, phone, message || "✅ Teste DisciplinaMax!");

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
