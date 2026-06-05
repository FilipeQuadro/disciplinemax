-- =============================================================
-- Migration 013: Gamification Batch RPC
-- Replaces 30+ sequential queries in the gamification pipeline
-- with a single function that computes achievement state and
-- challenge state in one pass.
-- =============================================================

CREATE OR REPLACE FUNCTION compute_gamification_state(p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_streak_data RECORD;
  v_books_completed INTEGER;
  v_total_pages INTEGER;
  v_bible_count INTEGER;
  v_pomodoro_count INTEGER;
  v_challenges_completed INTEGER;
  v_week_ago TEXT := to_char(CURRENT_DATE - INTERVAL '7 days', 'YYYY-MM-DD');
  v_week_stats JSONB;
  v_books_finished_week INTEGER;
BEGIN
  -- Streak data
  SELECT current_streak, longest_streak INTO v_streak_data
  FROM user_streaks WHERE user_id = p_user_id LIMIT 1;

  -- Book stats (single scan)
  SELECT
    count(*) FILTER (WHERE current_page >= total_pages),
    coalesce(sum(current_page), 0)
  INTO v_books_completed, v_total_pages
  FROM books WHERE user_id = p_user_id;

  -- Bible chapters total
  SELECT count(*) INTO v_bible_count
  FROM bible_readings WHERE user_id = p_user_id;

  -- Pomodoros total
  SELECT count(*) INTO v_pomodoro_count
  FROM pomodoro_sessions
  WHERE user_id = p_user_id AND completed = true;

  -- Challenges completed
  SELECT count(*) INTO v_challenges_completed
  FROM user_challenges
  WHERE user_id = p_user_id AND completed = true;

  -- Week stats for challenges
  SELECT coalesce(jsonb_agg(row_to_json(ws)), '[]'::jsonb) INTO v_week_stats
  FROM (
    SELECT
      coalesce(sum(pomodoros_completed), 0) AS pomodoros_this_week,
      coalesce(sum(books_pages_read), 0) AS pages_this_week,
      coalesce(sum(bible_chapters_read), 0) AS bible_this_week,
      count(*) FILTER (WHERE goals_completed = true) AS goals_this_week
    FROM daily_stats
    WHERE user_id = p_user_id AND date >= v_week_ago
  ) ws;

  -- Books finished this week
  SELECT count(*) INTO v_books_finished_week
  FROM books
  WHERE user_id = p_user_id
    AND current_page >= total_pages
    AND updated_at >= v_week_ago;

  RETURN jsonb_build_object(
    'achievementState', jsonb_build_object(
      'streak', coalesce(v_streak_data.current_streak, 0),
      'longestStreak', coalesce(v_streak_data.longest_streak, 0),
      'booksCompleted', coalesce(v_books_completed, 0),
      'totalPagesRead', coalesce(v_total_pages, 0),
      'bibleChaptersTotal', coalesce(v_bible_count, 0),
      'pomodorosTotal', coalesce(v_pomodoro_count, 0),
      'challengesCompleted', coalesce(v_challenges_completed, 0)
    ),
    'challengeState', jsonb_build_object(
      'streak', coalesce(v_streak_data.current_streak, 0),
      'pomodorosThisWeek', (v_week_stats->0->>'pomodoros_this_week')::int,
      'pagesThisWeek', (v_week_stats->0->>'pages_this_week')::int,
      'bibleChaptersThisWeek', (v_week_stats->0->>'bible_this_week')::int,
      'goalsCompletedThisWeek', (v_week_stats->0->>'goals_this_week')::int,
      'booksCompletedThisWeek', coalesce(v_books_finished_week, 0)
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;
