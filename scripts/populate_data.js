(async () => {
  const base = 'http://localhost:4000/api';
  const email = 'dev+test@local.com';
  const password = 'Pass1234';
  const name = 'Dev Test';

  const fetchJson = async (url, opts = {}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return { ok: res.ok, data: JSON.parse(text) }; } catch (e) { return { ok: res.ok, data: text }; }
  };

  try {
    // login or register
    let r = await fetchJson(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      r = await fetchJson(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
    }
    if (!r.ok) {
      console.error('Auth failed', r.data);
      process.exit(1);
    }
    const token = r.data.token;
    console.log('Got token');

    const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

    // create habit
    const habitRes = await fetchJson(`${base}/habits`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ name: 'Ler Bíblia', description: 'Ler 1 capítulo por dia', frequency: 'DAILY', targetCount: 1 }),
    });
    console.log('Habit:', habitRes.data);
    const habitId = habitRes.data?.id;

    // create book
    const bookRes = await fetchJson(`${base}/books`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ title: 'O Pequeno Príncipe', author: 'Antoine de Saint-Exupéry', totalPages: 100 }),
    });
    console.log('Book:', bookRes.data);
    const bookId = bookRes.data?.id;

    // create pomodoro session
    const pomRes = await fetchJson(`${base}/pomodoro/sessions`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ durationMin: 25, breakMin: 5 }),
    });
    console.log('Pomodoro session:', pomRes.data);

    // create goal
    const deadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const goalRes = await fetchJson(`${base}/goals`, {
      method: 'POST', headers: authHeaders, body: JSON.stringify({ title: 'Ler 10 capítulos', description: 'Meta semanal', type: 'BIBLE_CHAPTERS', targetValue: 10, deadline }),
    });
    console.log('Goal:', goalRes.data);

    // log a habit entry
    if (habitId) {
      const today = new Date().toISOString().slice(0, 10);
      const logRes = await fetchJson(`${base}/habits/${habitId}/log`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ date: today, count: 1 }),
      });
      console.log('Habit log:', logRes.data);
    }

    // fetch kairos context
    const ctx = await fetchJson(`${base}/kairos/context`, { method: 'GET', headers: { Authorization: 'Bearer ' + token } });
    console.log('Kairos context:', JSON.stringify(ctx.data, null, 2));

    process.exit(0);
  } catch (e) {
    console.error('ERR', e);
    process.exit(1);
  }
})();
