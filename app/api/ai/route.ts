import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getApiKey(): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  // Fallback: ler do Supabase
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    const sb = createClient(url, key);
    const { data } = await sb.from("user_settings").select("gemini_api_key").limit(1).single();
    return data?.gemini_api_key || null;
  } catch { return null; }
}

export async function POST(req: Request) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.8 },
        }),
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: "Gemini API call failed" }, { status: 500 });
  }
}
