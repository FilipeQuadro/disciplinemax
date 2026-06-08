// Create missing tables in Supabase via the Management API
// This script uses the Supabase PostgreSQL direct connection

const SUPABASE_URL = process.env.SUPABASE_URL || "https://sigpkpgibybgnszpxyzq.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

import { createClient } from "@supabase/supabase-js";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function tableExists(name) {
  const { error } = await sb.from(name).select("id").limit(1);
  return !error || !error.message.includes("not find");
}

// Try creating tables via REST API by inserting and handling errors
// This is a workaround since we can't run DDL via REST

const missing = [];
for (const t of ["admin_users", "user_plans", "achievements", "audit_logs", "blocked_users"]) {
  if (!(await tableExists(t))) missing.push(t);
}

if (missing.length === 0) {
  console.log("✅ All tables exist!");
  process.exit(0);
}

console.log(`❌ Missing tables: ${missing.join(", ")}`);
console.log("\nAttempting to create via Supabase query endpoint...");

// Use the Supabase /sql endpoint (available in newer versions)
const sql = `
-- Create missing tables
CREATE TABLE IF NOT EXISTS admin_users (
  user_id TEXT PRIMARY KEY,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_plans (
  user_id TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_users (
  user_id TEXT PRIMARY KEY,
  reason TEXT,
  blocked_by TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admin_users_select" ON admin_users FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_plans_select" ON user_plans FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_plans_insert" ON user_plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_plans_update" ON user_plans FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "achievements_select" ON achievements FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "achievements_insert" ON achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "achievements_update" ON achievements FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "achievements_delete" ON achievements FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (actor_id = auth.uid()::text);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "blocked_users_select" ON blocked_users FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date);

-- Auto-create user_plans for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_plans (user_id, plan) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`;

// Try the /query endpoint
try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log("✅ Tables created via RPC!");
  } else {
    const err = await res.text();
    console.log(`❌ RPC not available: ${err.substring(0, 100)}`);
    console.log("\n📝 Please run the SQL manually:");
    console.log("   Dashboard: https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql");
  }
} catch (e) {
  console.log("❌ Direct SQL execution not available");
  console.log("\n📝 Please run the SQL manually:");
  console.log("   Dashboard: https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql");
}

// Verify
console.log("\n📊 Verifying tables after attempt...");
for (const t of missing) {
  const exists = await tableExists(t);
  console.log(`  ${exists ? "✅" : "❌"} ${t}`);
}
