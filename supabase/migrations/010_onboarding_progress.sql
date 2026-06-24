-- Migration 010: Onboarding Progress
-- Persists user onboarding state so they don't lose progress on refresh.

CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step INTEGER NOT NULL DEFAULT 0,
  step_data JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  activation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed ON onboarding_progress(completed);