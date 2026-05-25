const fs = require('fs');
let env = {};
const lines = fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
for (const line of lines) {
  const idx = line.indexOf('=');
  env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = url.replace('https://', '').replace('.supabase.co', '');

// Use Supabase Management API v1 with personal access token or
// Use the PostgreSQL direct connection via the REST API
// Since we can't run DDL via REST, we'll work around it

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(url, key);

(async () => {
  // Add streak freeze columns via the Supabase API
  // The only way to run DDL remotely is through the Management API with a PAT
  // Since we don't have that, we'll check if the columns exist and warn
  
  const { data, error } = await sb.from('user_settings').select('*').limit(1).single();
  if (data) {
    const hasSf = 'streak_freeze_available' in data;
    if (!hasSf) {
      console.log('⚠️  Run in Supabase SQL Editor:');
      console.log("ALTER TABLE user_settings ADD COLUMN streak_freeze_available INTEGER DEFAULT 1;");
      console.log("ALTER TABLE user_settings ADD COLUMN streak_freeze_used INTEGER DEFAULT 0;");
      console.log("ALTER TABLE user_settings ADD COLUMN streak_freeze_reset_month TEXT DEFAULT '';");
    } else {
      console.log('✅ streak freeze columns exist');
    }
  }
})();
