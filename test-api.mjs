import { readFileSync } from "fs";
import { join } from "path";
import http from "http";

const TOKEN = readFileSync(join(process.env.TEMP, "dm_token.txt"), "utf8").trim();
const UID = readFileSync(join(process.env.TEMP, "dm_uid.txt"), "utf8").trim();
const PORT = 3001;

let passed = 0, failed = 0;

async function api(body) {
  const data = JSON.stringify(body);
  return new Promise((resolve) => {
    const req = http.request({
      hostname: "127.0.0.1", port: PORT, path: "/api/data", method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}`, "Content-Length": Buffer.byteLength(data) }
    }, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on("error", (e) => resolve({ status: 0, body: { error: e.message } }));
    req.write(data);
    req.end();
  });
}

function log(test, ok, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${test}${detail ? " — " + detail : ""}`);
  if (ok) passed++; else failed++;
}

async function run() {
  console.log("🔑 UID:", UID, "| Port:", PORT);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── SELECT tests ──
  console.log("\n📋 SELECT TESTS");
  let r;

  r = await api({ action: "select", table: "books", filters: { eq: { user_id: UID } } });
  log("SELECT books", r.status === 200 && Array.isArray(r.body.data), `count=${r.body.data?.length}`);

  r = await api({ action: "select", table: "user_settings", filters: { eq: { user_id: UID }, maybeSingle: true } });
  log("SELECT user_settings", r.status === 200);

  r = await api({ action: "select", table: "bible_goals", filters: { eq: { user_id: UID }, maybeSingle: true } });
  log("SELECT bible_goals", r.status === 200);

  r = await api({ action: "select", table: "daily_stats", filters: { eq: { user_id: UID }, order: { column: "date", ascending: false }, limit: 7 } });
  log("SELECT daily_stats", r.status === 200 && Array.isArray(r.body.data));

  r = await api({ action: "select", table: "bible_readings", filters: { eq: { user_id: UID }, limit: 5 } });
  log("SELECT bible_readings", r.status === 200);

  r = await api({ action: "select", table: "achievements", filters: { eq: { user_id: UID }, select: "badge_key" } });
  log("SELECT achievements", r.status === 200);

  r = await api({ action: "select", table: "pomodoro_sessions", filters: { eq: { user_id: UID }, limit: 5 } });
  log("SELECT pomodoro_sessions", r.status === 200);

  r = await api({ action: "select", table: "admin_users", filters: { eq: { user_id: UID }, maybeSingle: true, select: "role" } });
  log("SELECT admin_users (self)", r.status === 200);

  r = await api({ action: "select", table: "blocked_users", filters: { eq: { user_id: UID }, maybeSingle: true, select: "user_id" } });
  log("SELECT blocked_users (self)", r.status === 200);

  // ── INSERT tests ──
  console.log("\n📝 INSERT TESTS");

  r = await api({ action: "insert", table: "books", payload: { user_id: UID, title: "Livro Teste Funcional", author: "Test Bot", total_pages: 150, current_page: 10, daily_goal: 25, pages_read_today: 0, color: "#D94F4F" } });
  const testBookId = r.body.data?.[0]?.id;
  log("INSERT book", r.status === 200 && testBookId, `id=${testBookId?.substring(0, 8)}`);

  r = await api({ action: "insert", table: "bible_readings", payload: { user_id: UID, book_name: "Salmos", chapter: 23, notes: "teste funcional", read_at: new Date().toISOString() } });
  const testReadingId = r.body.data?.[0]?.id;
  log("INSERT bible_reading", r.status === 200 && testReadingId, `id=${testReadingId?.substring(0, 8)}`);

  r = await api({ action: "insert", table: "pomodoro_sessions", payload: { id: crypto.randomUUID(), user_id: UID, duration_minutes: 25, break_minutes: 0, completed: true, task_name: "Test Session", started_at: new Date().toISOString(), ended_at: new Date().toISOString() } });
  const testSessionId = r.body.data?.[0]?.id;
  log("INSERT pomodoro_session", r.status === 200, `id=${testSessionId?.substring(0, 8)}`);

  // ── UPSERT test ──
  console.log("\n🔄 UPSERT TEST");

  r = await api({ action: "upsert", table: "user_settings", payload: { user_id: UID, pomodoro_duration: 25, short_break: 5, long_break: 15, pomodoros_until_long: 4, notification_times: ["07:00", "12:00", "19:00"], daily_books_goal: 20, daily_bible_chapters: 3, timezone: "America/Sao_Paulo", updated_at: new Date().toISOString() } });
  log("UPSERT user_settings", r.status === 200, `has_data=${r.body.data !== null && r.body.data !== undefined}`);

  // ── UPDATE tests ──
  console.log("\n✏️ UPDATE TESTS");

  if (testBookId) {
    r = await api({ action: "update", table: "books", id: testBookId, payload: { current_page: 35, pages_read_today: 25 } });
    log("UPDATE book (pages)", r.status === 200 && r.body.data?.[0]?.current_page === 35, `current_page=${r.body.data?.[0]?.current_page}`);
  } else {
    log("UPDATE book (pages)", false, "no test book id");
  }

  // ── Security tests ──
  console.log("\n🔒 SECURITY TESTS");

  r = await api({ action: "select", table: "books", filters: { eq: { user_id: "00000000-0000-0000-0000-000000000000" } } });
  log("SELECT other user books → empty", r.status === 200 && (r.body.data?.length === 0 || r.body.data === null), `count=${r.body.data?.length}`);

  r = await api({ action: "insert", table: "books", payload: { user_id: "00000000-0000-0000-0000-000000000000", title: "Hack", total_pages: 1, current_page: 0, daily_goal: 1, pages_read_today: 0, color: "#000" } });
  log("INSERT wrong user_id → 403", r.status === 403, `status=${r.status}`);

  r = await api({ action: "select", table: "secret_table" });
  log("SELECT invalid table → 403", r.status === 403, `status=${r.status}`);

  const noAuthStatus = await new Promise((resolve) => {
    const req = http.request({ hostname: "127.0.0.1", port: PORT, path: "/api/data", method: "POST", headers: { "Content-Type": "application/json" } }, (res) => { resolve(res.statusCode); });
    req.write(JSON.stringify({ action: "select", table: "books" }));
    req.end();
  });
  log("No token → 401", noAuthStatus === 401, `status=${noAuthStatus}`);

  // ── DELETE tests ──
  console.log("\n🗑️ DELETE TESTS (cleanup)");

  if (testBookId) {
    r = await api({ action: "delete", table: "books", id: testBookId });
    log("DELETE test book", r.status === 200 && r.body.ok === true);
  }
  if (testReadingId) {
    r = await api({ action: "delete", table: "bible_readings", id: testReadingId });
    log("DELETE test reading", r.status === 200 && r.body.ok === true);
  }
  if (testSessionId) {
    r = await api({ action: "delete", table: "pomodoro_sessions", id: testSessionId });
    log("DELETE test session", r.status === 200 && r.body.ok === true);
  }

  // ── Page rendering ──
  console.log("\n🌐 PAGE RENDERING TESTS");
  const pages = ["/", "/login", "/livros", "/biblia", "/pomodoro", "/planos", "/configuracoes", "/admin"];
  for (const p of pages) {
    const status = await new Promise((resolve) => {
      http.get(`http://127.0.0.1:${PORT}${p}`, (res) => resolve(res.statusCode)).on("error", () => resolve(0));
    });
    log(`GET ${p}`, status === 200, `status=${status}`);
  }

  // ── Results ──
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed > 0) process.exit(1);
}

run().catch(console.error);
