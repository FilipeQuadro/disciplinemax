(async () => {
  const base = 'http://localhost:4000/api';
  const email = 'dev+test@local.com';
  const password = 'Pass1234';

  const fetchJson = async (url, opts = {}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return { ok: res.ok, data: JSON.parse(text) }; } catch (e) { return { ok: res.ok, data: text }; }
  };

  try {
    // run seed full
    console.log('Running seed_full...');
    const seed = require('./seed_full.js');
    // We can't require easily because seed_full is an immediately-invoked script; instead spawn node
    const { spawnSync } = require('child_process');
    const r = spawnSync(process.execPath, ['scripts/seed_full.js'], { encoding: 'utf8' });
    console.log(r.stdout);
    if (r.status !== 0) {
      console.error('seed_full failed', r.stderr);
      process.exit(2);
    }

    // login
    const login = await fetchJson(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!login.ok) { console.error('login failed', login); process.exit(3); }
    const token = login.data.token;

    // check kairos context
    const ctx = await fetchJson(`${base}/kairos/context`, { method: 'GET', headers: { Authorization: 'Bearer ' + token } });
    if (!ctx.ok) { console.error('kairos/context failed', ctx); process.exit(4); }

    // basic assertions
    const hasHabits = Array.isArray(ctx.data.habits) && ctx.data.habits.length > 0;
    const hasGoals = Array.isArray(ctx.data.goals) && ctx.data.goals.length > 0;
    const hasBooks = Array.isArray(ctx.data.books) && ctx.data.books.length > 0;

    if (hasHabits && hasGoals && hasBooks) {
      console.log('E2E check passed');
      process.exit(0);
    }

    console.error('E2E check failed: missing data', { hasHabits, hasGoals, hasBooks });
    process.exit(5);
  } catch (e) {
    console.error('ERR', e);
    process.exit(99);
  }
})();
