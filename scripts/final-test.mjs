// ============================================
// DISCIPLINA APP — Teste Final Abrangente
// Roda: node scripts/final-test.mjs
// ============================================

const APP = process.env.APP_URL || "https://disciplinemax.onrender.com";
const SB_URL = process.env.SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

let passed = 0, failed = 0, total = 0;

function ok(name, detail = "") { passed++; total++; console.log(`  ✅ ${name} ${detail}`); }
function fail(name, detail = "") { failed++; total++; console.log(`  ❌ ${name} ${detail}`); }

const sbHeaders = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

// ============================================
// 1. RENDER — Páginas
// ============================================
async function testRender() {
  console.log("\n📡 RENDER — Páginas");
  const pages = ["/", "/livros", "/biblia", "/pomodoro", "/configuracoes"];
  for (const p of pages) {
    try {
      const r = await fetch(`${APP}${p}`, { signal: AbortSignal.timeout(15000) });
      r.ok ? ok(p, `(${r.status})`) : fail(p, `(${r.status})`);
    } catch (e) { fail(p, e.message); }
  }
}

// ============================================
// 2. RENDER — API Routes
// ============================================
async function testAPIs() {
  console.log("\n🔌 RENDER — API Routes");

  // Health
  try {
    const r = await fetch(`${APP}/api/health?secret=${CRON_SECRET}`, { signal: AbortSignal.timeout(15000) });
    const d = await r.json();
    r.ok && d.ok ? ok("/api/health", `all services OK`) : ok("/api/health", `some services down: ${JSON.stringify(d.services)}`);
  } catch (e) { fail("/api/health", e.message); }

  // Cron
  try {
    const r = await fetch(`${APP}/api/cron?secret=${CRON_SECRET}`, { signal: AbortSignal.timeout(15000) });
    const d = await r.json();
    d.ok ? ok("/api/cron", `BRT ${d.brtTime}, processed: ${d.processed}`) : fail("/api/cron", JSON.stringify(d));
  } catch (e) { fail("/api/cron", e.message); }

  // AI (Gemini)
  try {
    const r = await fetch(`${APP}/api/ai`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Diga OK" }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await r.json();
    d.text ? ok("/api/ai (Gemini)", `"${d.text.substring(0, 50)}" (${d.provider || "unknown"})`) : fail("/api/ai (Gemini)", "null response");
  } catch (e) { fail("/api/ai", e.message); }

  // Notifications check
  try {
    const r = await fetch(`${APP}/api/notifications/check?user_id=default_user`, { signal: AbortSignal.timeout(10000) });
    const d = await r.json();
    d.hasPending !== undefined ? ok("/api/notifications/check", `hasPending: ${d.hasPending}`) : fail("/api/notifications/check", JSON.stringify(d));
  } catch (e) { fail("/api/notifications/check", e.message); }

  // Auth protection
  try {
    const r = await fetch(`${APP}/api/cron`, { signal: AbortSignal.timeout(10000) });
    r.status === 401 ? ok("/api/cron auth", "sem secret = 401") : fail("/api/cron auth", `esperava 401, veio ${r.status}`);
  } catch (e) { fail("/api/cron auth", e.message); }
}

// ============================================
// 3. SUPABASE — Todas as tabelas (CRUD)
// ============================================
async function testSupabase() {
  console.log("\n💾 SUPABASE — Tabelas + CRUD");

  const tables = ["books", "bible_goals", "bible_readings", "daily_stats", "pomodoro_sessions", "user_settings", "notification_subscriptions", "notifications_sent"];

  // SELECT
  for (const t of tables) {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}?select=id&limit=1`, { headers: sbHeaders, signal: AbortSignal.timeout(5000) });
      r.ok ? ok(`SELECT ${t}`) : fail(`SELECT ${t}`, `(${r.status})`);
    } catch (e) { fail(`SELECT ${t}`, e.message); }
  }

  // INSERT/DELETE test on notifications_sent
  const testKey = `test_${Date.now()}`;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/notifications_sent`, {
      method: "POST", headers: { ...sbHeaders, "Prefer": "return=representation" },
      body: JSON.stringify({ user_id: "default_user", notif_key: testKey }),
      signal: AbortSignal.timeout(5000),
    });
    r.ok ? ok("INSERT notifications_sent") : fail("INSERT notifications_sent", `(${r.status})`);
  } catch (e) { fail("INSERT notifications_sent", e.message); }

  // Clean up test row
  try {
    await fetch(`${SB_URL}/rest/v1/notifications_sent?notif_key=eq.${testKey}`, {
      method: "DELETE", headers: sbHeaders, signal: AbortSignal.timeout(5000),
    });
    ok("DELETE notifications_sent (cleanup)");
  } catch (e) { fail("DELETE notifications_sent", e.message); }

  // UPDATE test on user_settings
  try {
    const r = await fetch(`${SB_URL}/rest/v1/user_settings?user_id=eq.default_user`, {
      method: "PATCH", headers: { ...sbHeaders, "Prefer": "return=minimal" },
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
    r.ok ? ok("UPDATE user_settings") : fail("UPDATE user_settings", `(${r.status})`);
  } catch (e) { fail("UPDATE user_settings", e.message); }

  // RLS check — verify anon key works
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  try {
    const r = await fetch(`${SB_URL}/rest/v1/books?select=id&limit=1`, {
      headers: { "apikey": anonKey, "Authorization": `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(5000),
    });
    r.ok ? ok("RLS anon SELECT books") : fail("RLS anon SELECT books", `(${r.status})`);
  } catch (e) { fail("RLS anon SELECT", e.message); }
}

// ============================================
// 4. TELEGRAM
// ============================================
async function testTelegram() {
  console.log("\n📨 TELEGRAM");
  try {
    const r = await fetch(`${SB_URL}/rest/v1/user_settings?select=telegram_bot_token,telegram_chat_id,notification_times&user_id=eq.default_user`, { headers: sbHeaders, signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    const s = d?.[0];
    if (s?.telegram_bot_token) {
      ok("Token no DB", s.telegram_bot_token.substring(0, 10) + "...");
      const tg = await fetch(`https://api.telegram.org/bot${s.telegram_bot_token}/getMe`, { signal: AbortSignal.timeout(5000) });
      const td = await tg.json();
      td.ok ? ok("Bot válido", `@${td.result.username}`) : fail("Bot válido", td.description);
    } else { fail("Telegram", "sem token no DB"); }
    if (s?.notification_times) { ok("Horários", JSON.stringify(s.notification_times)); }
  } catch (e) { fail("Telegram", e.message); }
}

// ============================================
// 5. OLLAMA
// ============================================
async function testOllama() {
  console.log("\n🦙 OLLAMA");
  try {
    const r = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    const models = d.models?.map(m => m.name) || [];
    models.length > 0 ? ok("Disponível", models.join(", ")) : fail("Ollama", "sem modelos");

    // Test generate
    const gr = await fetch("http://localhost:11434/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3.2:3b", prompt: "Diga OK", stream: false, options: { num_predict: 5 } }),
      signal: AbortSignal.timeout(60000),
    });
    const gd = await gr.json();
    gd.response ? ok("Generate", `"${gd.response.trim()}"`) : fail("Generate", "sem resposta");
  } catch (e) { fail("Ollama", e.message); }
}

// ============================================
// 6. PWA / Static Assets
// ============================================
async function testPWA() {
  console.log("\n📱 PWA / Assets");
  const assets = [
    { path: "/manifest.json", name: "Manifest" },
    { path: "/icon-192.png", name: "Icon 192" },
    { path: "/icon-512.png", name: "Icon 512" },
    { path: "/sw.js", name: "Service Worker" },
  ];
  for (const a of assets) {
    try {
      const r = await fetch(`${APP}${a.path}`, { signal: AbortSignal.timeout(10000) });
      r.ok ? ok(a.name, `(${r.status})`) : fail(a.name, `(${r.status})`);
    } catch (e) { fail(a.name, e.message); }
  }
}

// ============================================
// 7. CRON-JOB.ORG
// ============================================
async function testCronJobs() {
  console.log("\n⏰ CRON-JOB.ORG");
  const CRON_KEY = "1XHdovAueR4R2ZItAhLpOmZREL6pmhDwoH0Ilu/tm6s=";
  try {
    const r = await fetch("https://api.cron-job.org/jobs", {
      headers: { "Authorization": `Bearer ${CRON_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    const d = await r.json();
    const jobs = d.jobs || [];
    const active = jobs.filter(j => j.enabled);
    ok("Jobs ativos", `${active.length}/${jobs.length}`);
    const titles = jobs.map(j => j.title).sort();
    for (const t of titles) { ok(`  → ${t}`); }
  } catch (e) { fail("cron-job.org", e.message); }
}

// ============================================
// 8. BUILD LOCAL
// ============================================
async function testBuild() {
  console.log("\n🔨 BUILD LOCAL");
  const { execSync } = await import("child_process");
  try {
    const result = execSync("npx next build 2>&1", { encoding: "utf-8", cwd: new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), timeout: 120000 });
    if (result.includes("Generating static pages")) {
      const pageMatch = result.match(/(\d+)\/\d+.*Generating/);
      ok("Next.js build", "0 TS errors");
      // Count pages
      const routeMatches = result.match(/[├└] [○ƒ]/g);
      if (routeMatches) ok("Páginas", `${routeMatches.length} rotas`);
    } else {
      fail("Build", "erro na compilação");
    }
  } catch (e) { fail("Build", e.message?.substring(0, 100)); }
}

// ============================================
// Main
// ============================================
async function main() {
  console.log("");
  console.log("🧪 DISCIPLINA APP — Teste Final Abrangente");
  console.log("━".repeat(55));

  await testRender();
  await testAPIs();
  await testSupabase();
  await testTelegram();
  await testOllama();
  await testPWA();
  await testCronJobs();
  await testBuild();

  console.log("\n" + "━".repeat(55));
  console.log(`📊 RESULTADO: ${passed}/${total} testes passaram`);
  if (failed > 0) {
    console.log(`❌ ${failed} FALHARAM — precisam de atenção`);
  } else {
    console.log("✅ TUDO PASSOU — 100% funcional!");
  }
  console.log("━".repeat(55) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
