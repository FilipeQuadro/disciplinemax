import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null as any;

export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }
  const today = new Date().toISOString().split("T")[0];

  const { data: stats } = await supabase
    .from("daily_stats").select("*").eq("date", today).eq("user_id", userId).maybeSingle();
  const { data: books } = await supabase.from("books").select("*").eq("user_id", userId);
  const { data: bibleGoal } = await supabase.from("bible_goals").select("*").eq("user_id", userId).maybeSingle();

  const totalGoal = (books || []).reduce((s: number, b: any) => s + b.daily_goal, 0);
  const totalRead = (books || []).reduce((s: number, b: any) => s + b.pages_read_today, 0);
  const bibleGoalMet = bibleGoal ? (stats?.bible_chapters_read || 0) >= bibleGoal.daily_chapters : true;
  const booksGoalMet = totalRead >= totalGoal;
  const hasPending = !booksGoalMet || !bibleGoalMet;

  let message = "Você tem metas pendentes hoje!";
  if (!booksGoalMet) message += ` Faltam ${totalGoal - totalRead} páginas.`;
  if (!bibleGoalMet) message += ` Bíblia: ${(bibleGoal?.daily_chapters || 0) - (stats?.bible_chapters_read || 0)} capítulos.`;

  return NextResponse.json({ hasPending, message });
}
