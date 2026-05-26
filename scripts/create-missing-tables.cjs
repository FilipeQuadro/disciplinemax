// Run with: node scripts/create-missing-tables.cjs
// Creates the 5 missing tables via Supabase service role REST API inserts
// (DDL must be run manually in Supabase Dashboard → SQL Editor)

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MISSING_TABLES = [
  "admin_users",
  "user_plans",
  "achievements",
  "audit_logs",
  "blocked_users",
];

async function checkTables() {
  console.log("Checking tables...\n");
  const results = {};
  for (const table of MISSING_TABLES) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      results[table] = "MISSING";
      console.log(`❌ ${table}: MISSING — ${error.message}`);
    } else {
      results[table] = "EXISTS";
      console.log(`✅ ${table}: EXISTS (${data.length} rows)`);
    }
  }
  return results;
}

async function main() {
  const results = await checkTables();

  const missing = Object.entries(results)
    .filter(([, v]) => v === "MISSING")
    .map(([k]) => k);

  if (missing.length > 0) {
    console.log(
      `\n⚠️  ${missing.length} table(s) need to be created manually.`
    );
    console.log(
      `Go to Supabase Dashboard → SQL Editor and run the contents of:`
    );
    console.log(`  supabase/rls-policies.sql (sections 4-8)`);
    console.log(`  OR scripts/create-tables.sql`);
    console.log(`\nMissing tables: ${missing.join(", ")}`);
  } else {
    console.log("\n✅ All tables exist!");
  }
}

main();
