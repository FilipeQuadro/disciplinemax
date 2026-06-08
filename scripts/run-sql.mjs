// Execute SQL via Supabase Management API to create missing tables
const SUPABASE_REF = process.env.SUPABASE_REF || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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
