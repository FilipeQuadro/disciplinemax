// Migration: Add achievements table + streak freeze columns
// Run this in Supabase SQL Editor

const SQL = `
-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT DEFAULT 'default_user',
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- Streak freeze columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_available INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_used INTEGER DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_reset_month TEXT DEFAULT '';

-- RLS for achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select" ON achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert" ON achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "achievements_update" ON achievements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "achievements_delete" ON achievements FOR DELETE USING (true);
`;

console.log("Run this SQL in Supabase SQL Editor:\n");
console.log(SQL);
