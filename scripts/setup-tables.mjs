// Create missing tables via Supabase Management API
// This uses the /v1/projects/{ref}/sql endpoint

import { readFileSync } from "fs";

const SUPABASE_REF = "sigpkpgibybgnszpxyzq";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3MTkzNSwiZXhwIjoyMDk0OTQ3OTM1fQ.g5tS-3iavhOGq3JCorPzfRBfGx4rYS4zPzgYDUNnDts";

const sql = readFileSync("scripts/create-tables.sql", "utf-8");

// Try the Supabase Platform API
const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "apikey": SERVICE_KEY,
  },
  body: JSON.stringify({ query: sql }),
});

if (res.ok) {
  const data = await res.json();
  console.log("✅ Tables created successfully via Management API!");
  console.log(JSON.stringify(data, null, 2).substring(0, 500));
} else {
  const err = await res.text();
  console.log(`❌ Management API error (${res.status}): ${err.substring(0, 200)}`);

  // Fallback: try direct PostgreSQL connection via the pooler URL
  console.log("\n🔄 Trying pg_query RPC...");

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(`https://${SUPABASE_REF}.supabase.co`, SERVICE_KEY);

  // Try using the built-in exec_sql function if it exists
  const { error } = await sb.rpc("exec_sql", { query: sql });
  if (!error) {
    console.log("✅ Tables created via RPC!");
  } else {
    console.log(`❌ RPC error: ${error.message}`);
    console.log("\n" + "=".repeat(60));
    console.log("⚠️  AÇÃO NECESSÁRIA — Execute o SQL manualmente:");
    console.log("=".repeat(60));
    console.log("\n1. Abra o Supabase Dashboard:");
    console.log("   https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql");
    console.log("\n2. Cole o SQL do arquivo: scripts/create-tables.sql");
    console.log("\n3. Clique em 'Run'");
    console.log("\nAs tabelas necessárias são:");
    console.log("  • admin_users   — controle de admins");
    console.log("  • user_plans    — planos dos usuários");
    console.log("  • achievements  — conquistas desbloqueadas");
    console.log("  • audit_logs    — registro de auditoria");
    console.log("  • blocked_users — usuários bloqueados");
  }
}
