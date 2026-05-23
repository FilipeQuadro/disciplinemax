import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callOllama } from "@/lib/ai";

async function getApiKey(): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
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
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. Gemini
    const apiKey = await getApiKey();
    if (apiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
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
        if (text) return NextResponse.json({ text, provider: "gemini" });
      } catch { /* fallback to Ollama */ }
    }

    // 2. Ollama (local, sem limites)
    const ollamaText = await callOllama(prompt);
    if (ollamaText) {
      return NextResponse.json({ text: ollamaText, provider: "ollama" });
    }

    return NextResponse.json({ text: null, provider: "none" });
  } catch (e) {
    return NextResponse.json({ error: "AI call failed" }, { status: 500 });
  }
}
