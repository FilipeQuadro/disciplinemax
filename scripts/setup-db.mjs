// Create missing tables via Supabase REST API using service role
// We'll create tables by attempting to use them and then creating them if they fail

const SUPABASE_URL = "https://sigpkpgibybgnszpxyzq.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3MTkzNSwiZXhwIjoyMDk0OTQ3OTM1fQ.g5tS-3iavhOGq3JCorPzfRBfGx4rYS4zPzgYDUNnDts";

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// The Supabase REST API can't create tables directly.
// We need to use the Supabase Dashboard SQL Editor.
// Let's verify what we need and print instructions.

console.log("=".repeat(60));
console.log("DISCIPLINA APP — SETUP DO BANCO DE DADOS");
console.log("=".repeat(60));

const tables = ["books", "bible_goals", "bible_readings", "daily_stats", "pomodoro_sessions", "user_settings", "notification_subscriptions", "notifications_sent", "admin_users", "user_plans", "achievements", "audit_logs", "blocked_users"];

console.log("\n📊 Status das tabelas:\n");
for (const table of tables) {
  const { error } = await sb.from(table).select("id").limit(1);
  const exists = !error || !error.message.includes("not find");
  console.log(`  ${exists ? "✅" : "❌"} ${table}`);
}

console.log("\n" + "=".repeat(60));
console.log("⚠️  TABELAS FALTANDO — Execute o SQL abaixo no Dashboard:");
console.log("   https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql");
console.log("=".repeat(60));
console.log("\nArquivo: scripts/create-tables.sql\n");

import { readFileSync } from "fs";
try {
  const sql = readFileSync("scripts/create-tables.sql", "utf-8");
  console.log(sql);
} catch {
  console.log("(arquivo não encontrado — use o SQL do supabase/rls-policies.sql)");
}
