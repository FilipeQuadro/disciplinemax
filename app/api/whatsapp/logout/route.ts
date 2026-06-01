import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for logging out Green-API instance.
 * Required before generating a new QR code if the old session expired.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { idInstance, apiTokenInstance } = body;

  if (!idInstance || !apiTokenInstance) {
    return NextResponse.json({ ok: false, error: "Instance ID e API Token são obrigatórios." }, { status: 400 });
  }

  try {
    const url = `https://api.greenapi.com/waInstance${idInstance}/logout/${apiTokenInstance}`;
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();

    if (data.isLogout === true || res.ok) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: data?.error || data?.message || `HTTP ${res.status}` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro ao desconectar instância" });
  }
}
