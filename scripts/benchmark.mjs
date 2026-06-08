// Benchmark script — compares individual queries vs RPC calls
// Run: node scripts/benchmark.mjs

import https from 'node:https';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sigpkpgibybgnszpxyzq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TEST_USER_ID = 'd6043e42-8c24-45fe-b43a-3dc2ffa91105';

function fetchSupabase(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const start = Date.now();
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        const elapsed = Date.now() - start;
        resolve({ status: res.statusCode, elapsed, data: data.substring(0, 200) });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function benchmark(label, fn, iterations = 5) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const result = await fn();
    times.push(result.elapsed);
  }
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const min = Math.min(...times);
  const max = Math.max(...times);
  console.log(`${label}: avg=${avg}ms min=${min}ms max=${max}ms (raw: [${times.join(',')}])`);
  return { avg, min, max };
}

async function main() {
  console.log('=== DisciplinaMax Benchmark Suite ===\n');
  console.log(`Test user: ${TEST_USER_ID}`);
  console.log(`Iterations: 5 per test\n`);

  // --- Dashboard: individual queries vs RPC ---
  console.log('--- DASHBOARD ---');
  
  // Individual queries (simulating the fallback path)
  console.log('\nIndividual queries (10 separate calls):');
  const individualStart = Date.now();
  const dashIndividual = [
    () => fetchSupabase(`/rest/v1/books?select=*&user_id=eq.${TEST_USER_ID}&order=created_at.asc`),
    () => fetchSupabase(`/rest/v1/bible_goals?select=*&user_id=eq.${TEST_USER_ID}`),
    () => fetchSupabase(`/rest/v1/user_settings?select=*&user_id=eq.${TEST_USER_ID}`),
    () => fetchSupabase(`/rest/v1/daily_stats?select=*&user_id=eq.${TEST_USER_ID}&order=date.desc&limit=7`),
    () => fetchSupabase(`/rest/v1/bible_readings?select=*&user_id=eq.${TEST_USER_ID}&order=read_at.desc&limit=5`),
    () => fetchSupabase(`/rest/v1/user_xp?select=*&user_id=eq.${TEST_USER_ID}`),
    () => fetchSupabase(`/rest/v1/user_challenges?select=*&user_id=eq.${TEST_USER_ID}&completed=eq.false`),
    () => fetchSupabase(`/rest/v1/user_insights?select=*&user_id=eq.${TEST_USER_ID}&order=created_at.desc&limit=3`),
    () => fetchSupabase(`/rest/v1/user_achievements?select=*&user_id=eq.${TEST_USER_ID}&completed=eq.true`),
    () => fetchSupabase(`/rest/v1/user_streaks?select=*&user_id=eq.${TEST_USER_ID}`),
  ];
  
  for (const q of dashIndividual) {
    await benchmark('  query', q, 1);
  }

  // Sequential total
  const seqTimes = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    for (const q of dashIndividual) await q();
    seqTimes.push(Date.now() - start);
  }
  console.log(`  Sequential total: avg=${Math.round(seqTimes.reduce((a,b)=>a+b,0)/seqTimes.length)}ms [${seqTimes.join(',')}]`);

  // RPC call
  console.log('\nDashboard RPC (1 call):');
  await benchmark('  get_dashboard_data', () => 
    fetchSupabase(`/rest/v1/rpc/get_dashboard_data?p_user_id=${TEST_USER_ID}`, 'POST'), 5);

  // --- Gamification: individual vs RPC ---
  console.log('\n--- GAMIFICATION ---');
  
  console.log('\nIndividual queries (8 separate calls):');
  const gamIndividual = [
    () => fetchSupabase(`/rest/v1/user_streaks?select=current_streak,longest_streak&user_id=eq.${TEST_USER_ID}`),
    () => fetchSupabase(`/rest/v1/books?select=current_page,total_pages&user_id=eq.${TEST_USER_ID}`),
    () => fetchSupabase(`/rest/v1/bible_readings?select=id&user_id=eq.${TEST_USER_ID}&limit=0`),
    () => fetchSupabase(`/rest/v1/pomodoro_sessions?select=id&user_id=eq.${TEST_USER_ID}&completed=eq.true&limit=0`),
    () => fetchSupabase(`/rest/v1/user_challenges?select=id&user_id=eq.${TEST_USER_ID}&completed=eq.true&limit=0`),
    () => fetchSupabase(`/rest/v1/user_streaks?select=current_streak&user_id=eq.${TEST_USER_ID}`),
    () => fetchSupabase(`/rest/v1/daily_stats?select=pomodoros_completed,books_pages_read,bible_chapters_read,goals_completed&user_id=eq.${TEST_USER_ID}&date=gte.2024-01-01`),
    () => fetchSupabase(`/rest/v1/books?select=current_page,total_pages,updated_at&user_id=eq.${TEST_USER_ID}`),
  ];
  for (const q of gamIndividual) {
    await benchmark('  query', q, 1);
  }

  const gamSeqTimes = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    for (const q of gamIndividual) await q();
    gamSeqTimes.push(Date.now() - start);
  }
  console.log(`  Sequential total: avg=${Math.round(gamSeqTimes.reduce((a,b)=>a+b,0)/gamSeqTimes.length)}ms [${gamSeqTimes.join(',')}]`);

  console.log('\nGamification RPC (1 call):');
  await benchmark('  compute_gamification_state', () => 
    fetchSupabase(`/rest/v1/rpc/compute_gamification_state?p_user_id=${TEST_USER_ID}`, 'POST'), 5);

  // --- Feed ---
  console.log('\n--- FEED ---');
  await benchmark('Feed query (with cursor index)', () =>
    fetchSupabase(`/rest/v1/product_events?select=*&user_id=eq.${TEST_USER_ID}&order=created_at.desc&limit=30`), 5);

  // --- Leaderboard ---
  console.log('\n--- LEADERBOARD ---');
  await benchmark('Leaderboard query', () =>
    fetchSupabase(`/rest/v1/user_profiles?select=user_id,display_name,total_pages,is_public&is_public=eq.true&order=total_pages.desc&limit=50`), 5);

  console.log('\n=== Benchmark Complete ===');
}

main().catch(console.error);
