// Script to create missing tables in Supabase
const SUPABASE_URL = "https://sigpkpgibybgnszpxyzq.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3MTkzNSwiZXhwIjoyMDk0OTQ3OTM1fQ.g5tS-3iavhOGq3JCorPzfRBfGx4rYS4zPzgYDUNnDts";

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return res;
}

// Since we can't use RPC directly, let's verify via the REST API
async function checkTables() {
  const tables = ["audit_logs", "blocked_users", "admin_users", "user_plans", "achievements"];

  for (const table of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
    });

    if (res.ok) {
      console.log(`✅ ${table} — exists and accessible`);
    } else {
      const err = await res.text();
      console.log(`❌ ${table} — ${res.status}: ${err.substring(0, 80)}`);
    }
  }
}

checkTables();
