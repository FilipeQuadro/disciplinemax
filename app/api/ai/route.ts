import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callOllama } from "@/lib/ai";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const STATIC_MESSAGES = [
  "Hoje é o primeiro dia do resto da sua jornada. Comece agora! 🚀",
  "A consistência é o segredo dos grandes. Continue firme! 💪",
  "Você está construindo um hábito poderoso. Não desista! 🔥",
  "O sucesso é a soma de pequenos esforços repetidos dia após dia. 📖",
  "Mas os que esperam no SENHOR renovam as suas forças. Isaías 40:31 ✨",
  "Tudo posso naquele que me fortalece. Filipenses 4:13 🙏",
  "Sê forte e corajoso! Não se apavore nem desanime. Josué 1:9 🦁",
  "A leitura diária transforma a mente e fortalece o espírito. 📚",
];

function getStaticMessage(): string {
  const hour = new Date().getHours();
  return STATIC_MESSAGES[hour % STATIC_MESSAGES.length];
}

async function getApiKey(): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    const sb = createClient(url, key);
    const { data } = await sb.from("user_settings").select("gemini_api_key").limit(1).maybeSingle();
    return data?.gemini_api_key || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
    const { prompt } = body;
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. Gemini
    const apiKey = await getApiKey();
    if (apiKey) {
      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 100, temperature: 0.8 },
            }),
          },
          15_000
        );
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        if (text) return NextResponse.json({ text, provider: "gemini" });
      } catch { /* fallback to Ollama */ }
    }

    // 2. Ollama (local, sem limites)
    try {
      const ollamaText = await callOllama(prompt);
      if (ollamaText) {
        return NextResponse.json({ text: ollamaText, provider: "ollama" });
      }
    } catch { /* fallback to static */ }

    // 3. Static fallback — never return null or error
    return NextResponse.json({ text: getStaticMessage(), provider: "static" });
  } catch {
    // Even on unexpected errors, return a static message instead of 500
    return NextResponse.json({ text: getStaticMessage(), provider: "static" });
  }
}
