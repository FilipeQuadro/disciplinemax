// Create missing tables via Supabase Management API
const SUPABASE_URL = "https://sigpkpgibybgnszpxyzq.supabase.co";

// We'll use the service role key to create tables via direct SQL
// The Supabase JS client with service role can bypass RLS but can't create tables
// We need to use the Supabase Management API or the SQL editor

// Alternative: Use the REST API to check what we have and create the minimum needed
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ3BrcGdpYnliZ25zenB4eXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3MTkzNSwiZXhwIjoyMDk0OTQ3OTM1fQ.g5tS-3iavhOGq3JCorPzfRBfGx4rYS4zPzgYDUNnDts";

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Check which core tables already exist
const coreTables = ["books", "bible_goals", "bible_readings", "daily_stats", "pomodoro_sessions", "user_settings", "notification_subscriptions", "notifications_sent"];

console.log("=== Checking core tables ===");
for (const table of coreTables) {
  const { error } = await sb.from(table).select("id").limit(1);
  console.log(`${error ? "❌" : "✅"} ${table}${error ? " — " + error.message.substring(0, 60) : ""}`);
}

// Try to create missing tables using the Supabase SQL API
console.log("\n=== Creating missing tables ===");

const tablesToCreate = {
  admin_users: `CREATE TABLE IF NOT EXISTS admin_users (
    user_id TEXT PRIMARY KEY,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    added_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  user_plans: `CREATE TABLE IF NOT EXISTS user_plans (
    user_id TEXT PRIMARY KEY,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  achievements: `CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    badge_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_key)
  )`,

  audit_logs: `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  blocked_users: `CREATE TABLE IF NOT EXISTS blocked_users (
    user_id TEXT PRIMARY KEY,
    reason TEXT,
    blocked_by TEXT,
    blocked_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};

// We can't create tables via REST API directly — we need the SQL editor
// Let's output the SQL that needs to be run manually
console.log("\n⚠️  The following SQL needs to be run in the Supabase SQL Editor:");
console.log("   https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql\n");

let fullSQL = "-- Create missing tables\n\n";
for (const [name, sql] of Object.entries(tablesToCreate)) {
  fullSQL += sql + ";\n\n";
}

// Add RLS policies
fullSQL += `-- Enable RLS
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

console.log(fullSQL);

// Also write to a file for easy copy-paste
import { writeFileSync } from "fs";
writeFileSync("scripts/create-tables.sql", fullSQL);
console.log("\n📝 SQL also saved to scripts/create-tables.sql");
