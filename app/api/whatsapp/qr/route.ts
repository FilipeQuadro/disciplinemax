import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for getting WhatsApp QR code from Green-API.
 * Returns base64 PNG image for the user to scan with WhatsApp.
 * QR code is refreshed every ~20 seconds by Green-API.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { idInstance, apiTokenInstance } = body;

  if (!idInstance || !apiTokenInstance) {
    return NextResponse.json(
      { ok: false, error: "Instance ID e API Token são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const url = `https://api.greenapi.com/waInstance${idInstance}/qr/${apiTokenInstance}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (data.type === "qrCode") {
      return NextResponse.json({ ok: true, qrBase64: data.message });
    }

    if (data.type === "alreadyLogged") {
      return NextResponse.json({ ok: true, alreadyAuthorized: true, message: "Instância já está conectada ao WhatsApp!" });
    }

    if (data.type === "error") {
      // "Instance has auth" means need to logout first
      if (data.message?.includes("auth") || data.message?.includes("log out")) {
        return NextResponse.json({
          ok: false,
          needLogout: true,
          error: "Sessão expirada. Clique em 'Desconectar' para gerar um novo QR Code.",
        });
      }
      return NextResponse.json({ ok: false, error: data.message });
    }

    return NextResponse.json({ ok: false, error: `Resposta inesperada: ${JSON.stringify(data)}` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro ao buscar QR Code" });
  }
}
