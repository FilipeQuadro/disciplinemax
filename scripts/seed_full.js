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
    // login
    let r = await fetchJson(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error('login failed: ' + JSON.stringify(r.data));
    const token = r.data.token;
    const auth = { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } };

    // create several pomodoro sessions (some completed)
    for (let i = 0; i < 5; i++) {
      const s = await fetchJson(`${base}/pomodoro/sessions`, { method: 'POST', headers: auth.headers, body: JSON.stringify({ durationMin: 25, breakMin: 5 }) });
      if (s.ok && s.data && s.data.id) {
        // mark as completed for some
        if (i % 2 === 0) await fetchJson(`${base}/pomodoro/sessions/${s.data.id}`, { method: 'PATCH', headers: auth.headers });
      }
    }

    // update book progress a bit
    const books = await fetchJson(`${base}/books`, { method: 'GET', headers: auth.headers });
    const bookId = books.data && books.data[0] && books.data[0].id;
    if (bookId) {
      await fetchJson(`${base}/books/${bookId}`, { method: 'PATCH', headers: auth.headers, body: JSON.stringify({ pagesRead: 10 }) });
    }

    // add habit logs for last 5 days to create streak
    const habits = await fetchJson(`${base}/habits`, { method: 'GET', headers: auth.headers });
    const habitId = habits.data && habits.data[0] && habits.data[0].id;
    if (habitId) {
      for (let d = 0; d < 5; d++) {
        const day = new Date(Date.now() - d * 24 * 3600 * 1000).toISOString().slice(0, 10);
        await fetchJson(`${base}/habits/${habitId}/log`, { method: 'POST', headers: auth.headers, body: JSON.stringify({ date: day, count: 1 }) });
      }
    }

    // progress goal a bit
    const goals = await fetchJson(`${base}/goals`, { method: 'GET', headers: auth.headers });
    const goalId = goals.data && goals.data[0] && goals.data[0].id;
    if (goalId) {
      await fetchJson(`${base}/goals/${goalId}`, { method: 'PATCH', headers: auth.headers, body: JSON.stringify({ currentValue: 2 }) });
    }

    console.log('Seed full completed');
    process.exit(0);
  } catch (e) {
    console.error('ERR', e);
    process.exit(1);
  }
})();
