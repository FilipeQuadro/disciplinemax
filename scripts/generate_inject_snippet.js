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
    let r = await fetchJson(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      r = await fetchJson(`${base}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, password }),
      });
    }
    if (!r.ok) {
      console.error('Auth failed', r.data);
      process.exit(1);
    }

    const token = r.data.token;
    const user = r.data.user;

    const snippet = `(function(){
  localStorage.setItem('disciplina_token', ${JSON.stringify(token)});
  localStorage.setItem('disciplina_user', ${JSON.stringify(JSON.stringify(user))});
  // then navigate to app root
  window.location.href = '/';
})();`;

    console.log('---- Copie e cole no console do navegador (quando estiver em http://localhost:3000) ----');
    console.log(snippet);
    console.log('---- Fim do snippet ----');
  } catch (e) {
    console.error('ERR', e);
    process.exit(1);
  }
})();
