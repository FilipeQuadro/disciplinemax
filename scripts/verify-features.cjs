const fs = require('fs');
let env = {};
const lines = fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
for (const line of lines) {
  const idx = line.indexOf('=');
  env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
}

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Test achievements table
  const { data: ach, error: achErr } = await sb.from('achievements').select('*').limit(1);
  console.log('achievements:', achErr ? achErr.message : 'OK (' + (ach?.length || 0) + ' rows)');

  // Test streak freeze columns  
  const { data: settings, error: sfErr } = await sb.from('user_settings').select('id, streak_freeze_available').limit(1);
  console.log('streak_freeze_available:', sfErr ? sfErr.message : 'OK');

  // If missing, try adding via upsert workaround - won't work for DDL
  if (sfErr) {
    console.log('\n⚠️  Run in Supabase SQL Editor:');
    console.log("ALTER TABLE user_settings ADD COLUMN streak_freeze_available INTEGER DEFAULT 1;");
    console.log("ALTER TABLE user_settings ADD COLUMN streak_freeze_used INTEGER DEFAULT 0;");
    console.log("ALTER TABLE user_settings ADD COLUMN streak_freeze_reset_month TEXT DEFAULT '';");
  }

  // Test weekly API
  const APP_URL = 'https://disciplinemax.onrender.com';
  const res = await fetch(`${APP_URL}/api/cron/weekly?secret=${env.CRON_SECRET}`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (res) {
    const data = await res.json().catch(() => ({}));
    console.log('weekly API:', res.status, JSON.stringify(data).substring(0, 100));
  } else {
    console.log('weekly API: timeout (Render cold start)');
  }

  // Test login page
  const loginRes = await fetch(`${APP_URL}/login`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (loginRes) {
    const html = await loginRes.text();
    const hasLogin = html.includes('login') || html.includes('Entrar') || html.includes('email');
    console.log('login page:', loginRes.status, hasLogin ? 'has login content' : 'client-rendered');
  } else {
    console.log('login page: timeout');
  }
})();
