const fs = require('fs');
let env = {};
try {
  const lines = fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
  for (const line of lines) {
    const idx = line.indexOf('=');
    env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
  }
} catch (e) { console.error('env error', e.message); process.exit(1); }

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function runSQL(sql) {
  // Use Supabase SQL via REST - insert a dummy row to create table won't work
  // We need to use the management API
  const projectRef = url.replace('https://', '').replace('.supabase.co', '');
  const res = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/pgmeta`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  }).catch(() => null);
  return res;
}

(async () => {
  // Method: use the supabase-js fromSql or direct insert to verify
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(url, key);

  // Try creating achievements table by inserting (it will fail if table doesn't exist)
  const { error: testErr } = await sb.from('achievements').select('id').limit(1);
  if (testErr && testErr.code === '42P01') {
    console.log('⚠️  achievements table does not exist');
    console.log('⚠️  Run this SQL in Supabase SQL Editor:\n');
    console.log(`CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT DEFAULT 'default_user',
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_available INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_used INTEGER DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_reset_month TEXT DEFAULT '';

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert" ON achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "achievements_update" ON achievements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "achievements_delete" ON achievements FOR DELETE USING (true);`);
    process.exit(1);
  } else {
    console.log('✅ achievements table exists');
  }

  // Check streak freeze columns
  const { error: sfErr } = await sb.from('user_settings').select('streak_freeze_available').limit(1);
  if (sfErr) {
    console.log('⚠️  streak_freeze columns missing, run ALTER TABLE in SQL Editor');
  } else {
    console.log('✅ streak_freeze columns exist');
  }
})();
