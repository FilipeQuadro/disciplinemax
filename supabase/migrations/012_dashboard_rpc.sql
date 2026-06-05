-- =============================================================
-- Migration 012: Dashboard Aggregation RPC
-- Replaces 10+ sequential client-side fetches with a single DB call.
-- Returns all dashboard data in one JSON response.
-- =============================================================

CREATE OR REPLACE FUNCTION get_dashboard_data(p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_today TEXT := to_char(CURRENT_DATE, 'YYYY-MM-DD');
  v_week_start DATE := date_trunc('week', CURRENT_DATE);
  v_cal_start DATE := CURRENT_DATE - INTERVAL '34 days';
  v_books JSONB;
  v_bible_goal JSONB;
  v_settings JSONB;
  v_today_stats JSONB;
  v_bible_today_count INTEGER;
  v_streak INTEGER;
  v_week_stats JSONB;
  v_calendar JSONB;
  v_xp JSONB;
  v_challenges JSONB;
  v_insights JSONB;
  v_achievements JSONB;
BEGIN
  -- Phase 1: Independent parallel data
  SELECT coalesce(jsonb_agg(row_to_json(b)), '[]'::jsonb) INTO v_books
  FROM books b WHERE b.user_id = p_user_id ORDER BY b.created_at ASC;

  SELECT to_jsonb(bg) INTO v_bible_goal
  FROM bible_goals bg WHERE bg.user_id = p_user_id LIMIT 1;

  SELECT to_jsonb(us) INTO v_settings
  FROM user_settings us WHERE us.user_id = p_user_id LIMIT 1;

  SELECT to_jsonb(ds) INTO v_today_stats
  FROM daily_stats ds WHERE ds.user_id = p_user_id AND ds.date = v_today LIMIT 1;

  SELECT count(*) INTO v_bible_today_count
  FROM bible_readings br WHERE br.user_id = p_user_id AND br.read_at >= v_today;

  -- Phase 2: Streak computation
  SELECT count(*) INTO v_streak
  FROM (
    SELECT ds.date, ds.goals_completed,
           row_number() OVER (ORDER BY ds.date DESC) AS rn
    FROM daily_stats ds
    WHERE ds.user_id = p_user_id
      AND ds.goals_completed = true
    ORDER BY ds.date DESC
  ) sub
  WHERE rn = sub.row_number; -- consecutive from most recent

  -- If no streak data, check if there's a user_streaks record
  IF v_streak IS NULL OR v_streak = 0 THEN
    SELECT us.current_streak INTO v_streak
    FROM user_streaks us WHERE us.user_id = p_user_id LIMIT 1;
    IF v_streak IS NULL THEN v_streak := 0; END IF;
  END IF;

  -- Phase 3: Week stats + Calendar (parallel in single query set)
  SELECT coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) INTO v_week_stats
  FROM (
    SELECT
      to_char(d, 'Dy') AS day,
      to_char(d, 'YYYY-MM-DD') AS date,
      (d = CURRENT_DATE) AS is_today,
      coalesce(ds.books_pages_read, 0) AS pages,
      coalesce(ds.bible_chapters_read, 0) AS chapters,
      coalesce(ds.pomodoros_completed, 0) AS pomodoros
    FROM generate_series(v_week_start, v_week_start + INTERVAL '6 days', INTERVAL '1 day') d
    LEFT JOIN daily_stats ds ON ds.user_id = p_user_id AND ds.date = d::date
  ) w;

  SELECT coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) INTO v_calendar
  FROM (
    SELECT
      to_char(d, 'YYYY-MM-DD') AS date,
      coalesce(ds.goals_completed, false) AS done,
      (ds.date IS NOT NULL AND coalesce(ds.goals_completed, false) = false) AS partial
    FROM generate_series(v_cal_start, CURRENT_DATE, INTERVAL '1 day') d
    LEFT JOIN daily_stats ds ON ds.user_id = p_user_id AND ds.date = d::date
  ) c;

  -- Phase 4: Gamification data
  SELECT to_jsonb(ux) INTO v_xp
  FROM user_xp ux WHERE ux.user_id = p_user_id LIMIT 1;

  SELECT coalesce(jsonb_agg(row_to_json(ch)), '[]'::jsonb) INTO v_challenges
  FROM (
    SELECT challenge_id, progress, target, completed, xp_reward, week_key
    FROM user_challenges
    WHERE user_id = p_user_id AND completed = false
  ) ch;

  SELECT coalesce(jsonb_agg(row_to_json(ins)), '[]'::jsonb) INTO v_insights
  FROM (
    SELECT insight_type, message, created_at
    FROM user_insights
    WHERE user_id = p_user_id
    ORDER BY created_at DESC LIMIT 3
  ) ins;

  SELECT coalesce(jsonb_agg(row_to_json(ach)), '[]'::jsonb) INTO v_achievements
  FROM (
    SELECT achievement_id, progress, completed, unlocked_at
    FROM user_achievements
    WHERE user_id = p_user_id
  ) ach;

  -- Build final JSON response
  RETURN jsonb_build_object(
    'books', v_books,
    'bibleGoal', v_bible_goal,
    'settings', v_settings,
    'todayStats', v_today_stats,
    'bibleTodayCount', v_bible_today_count,
    'streak', v_streak,
    'weekStats', v_week_stats,
    'calendarData', v_calendar,
    'xp', v_xp,
    'challenges', v_challenges,
    'insights', v_insights,
    'achievements', v_achievements
  );
END;
$$ LANGUAGE plpgsql STABLE;
