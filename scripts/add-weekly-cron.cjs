const fs = require('fs');
let env = {};
const lines = fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
for (const line of lines) {
  const idx = line.indexOf('=');
  env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
}

const CRON_API_KEY = env.CRON_JOB_API_KEY;
const APP_URL = 'https://disciplinemax.onrender.com';
const CRON_SECRET = env.CRON_SECRET;

if (!CRON_API_KEY) {
  console.log('⚠️  CRON_JOB_API_KEY not found in .env.local');
  process.exit(1);
}

async function createWeeklyJob() {
  const res = await fetch('https://api.cron-job.org/jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRON_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job: {
        name: 'Disciplina Weekly Report',
        url: `${APP_URL}/api/cron/weekly?secret=${CRON_SECRET}`,
        enabled: true,
        schedule: {
          timezone: 'America/Sao_Paulo',
          expiresAt: 0,
          hours: [20],
          mdays: [],
          minutes: [0],
          months: [],
          wdays: [0], // Sunday
        },
        requestMethod: 0,
        requestHeaders: {},
        requestBody: '',
        retry: { http5xx: true, http4xx: false },
        notification: { onFailure: true, onSuccess: false },
      }
    })
  });

  const data = await res.json();
  console.log('Weekly report job:', res.status, JSON.stringify(data));
}

createWeeklyJob();
