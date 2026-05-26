// Execute SQL via Supabase Management API to create missing tables
const SUPABASE_REF = "sigpkpgibybgnszpxyzq";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3MTkzNSwiZXhwIjoyMDk0OTQ3OTM1fQ.g5tS-3iavhOGq3JCorPzfRBfGx4rYS4zPzgYDUNnDts";

import { readFileSync } from "fs";

const sql = readFileSync("scripts/create-tables.sql", "utf-8");

// Use the Supabase SQL API endpoint
const res = await fetch(`https://${SUPABASE_REF}.supabase.co/rest/v1/rpc/pgmeta`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (res.ok) {
  console.log("✅ Tables created successfully!");
} else {
  const text = await res.text();
  console.log(`❌ Error (${res.status}): ${text.substring(0, 200)}`);
  console.log("\n📝 Please run the SQL manually in the Supabase Dashboard:");
  console.log("   https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql");
  console.log("\n   File: scripts/create-tables.sql");
}
