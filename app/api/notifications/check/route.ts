import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Book, BibleGoal, DailyStats } from "@/lib/supabase";
import { RateLimitService } from "@/lib/rate-limit";
import { initRequestId } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verify the request's Bearer token is a valid Supabase session.
 * Returns the authenticated user ID, or null if invalid.
 */
async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const sb = createClient(supabaseUrl!, supabaseKey!);
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export async function GET(req: Request) {
  initRequestId(req);

  const rateLimited = RateLimitService.checkRequest(req, "notifications");
  if (rateLimited) return rateLimited;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  // Authenticate the caller
  const callerId = await getAuthUserId(req);
  if (!callerId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");

  // Verify the caller can only check their own data
  if (!userId || userId !== callerId) {
    return NextResponse.json({ error: "Can only check your own goals" }, { status: 403 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  const { data: stats } = await sb
    .from("daily_stats").select("*").eq("date", today).eq("user_id", callerId).maybeSingle();
  const { data: books } = await sb.from("books").select("*").eq("user_id", callerId);
  const { data: bibleGoal } = await sb.from("bible_goals").select("*").eq("user_id", callerId).maybeSingle();

  const totalGoal = (books as Book[] || []).reduce((s: number, b: Book) => s + b.daily_goal, 0);
  const totalRead = (books as Book[] || []).reduce((s: number, b: Book) => s + b.pages_read_today, 0);
  const bibleGoalMet = bibleGoal ? (stats?.bible_chapters_read || 0) >= (bibleGoal as BibleGoal).daily_chapters : true;
  const booksGoalMet = totalRead >= totalGoal;
  const hasPending = !booksGoalMet || !bibleGoalMet;

  let message = "Você tem metas pendentes hoje!";
  if (!booksGoalMet) message += ` Faltam ${totalGoal - totalRead} páginas.`;
  if (!bibleGoalMet) message += ` Bíblia: ${((bibleGoal as BibleGoal)?.daily_chapters || 0) - (stats?.bible_chapters_read || 0)} capítulos.`;

  return NextResponse.json({ hasPending, message });
}
