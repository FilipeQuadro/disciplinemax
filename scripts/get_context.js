(async () => {
  const base = 'http://localhost:4000/api';
  const email = 'dev+test@local.com';
  const password = 'Pass1234';
  const name = 'Dev Test';

  try {
    let res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      res = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
    }

    const data = await res.json().catch(() => null);
    console.log('AUTH', JSON.stringify(data));

    const token = data?.token;
    if (!token) {
      console.error('No token received');
      process.exit(1);
    }

    const ctxRes = await fetch(`${base}/kairos/context`, {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
    });

    const ctxData = await ctxRes.json().catch(() => null);
    console.log('CONTEXT', JSON.stringify(ctxData, null, 2));
  } catch (e) {
    console.error('ERR', e);
    process.exit(1);
  }
})();
