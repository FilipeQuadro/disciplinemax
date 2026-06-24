#!/usr/bin/env node
// ============================================
// DISCIPLINA APP — IA Auto-Diagnóstico (Ollama)
// Uso:
//   node scripts/doctor.mjs          # Só diagnóstico
//   node scripts/doctor.mjs --fix    # Diagnóstico + auto-fix
//   node scripts/doctor.mjs --push   # Diagnóstico + auto-fix + git push
// ============================================

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const FIX = process.argv.includes("--fix");
const PUSH = process.argv.includes("--push");
const OLLAMA_URL = "http://localhost:11434";
const MODEL = "llama3.2:3b";

// ============================================
// Utilitários
// ============================================
function log(icon, msg) { console.log(`${icon} ${msg}`); }
function ok(msg) { log("✅", msg); }
function fail(msg) { log("❌", msg); }
function warn(msg) { log("⚠️", msg); }
function info(msg) { log("ℹ️", msg); }

function run(cmd, silent = false) {
  try { return execSync(cmd, { encoding: "utf-8", cwd: ROOT, timeout: 30000 }).trim(); }
  catch (e) { if (!silent) return null; return null; }
}

async function ollamaGenerate(prompt) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { num_predict: 2048, temperature: 0.3 } }),
      signal: AbortSignal.timeout(180000),
    });
    const data = await res.json();
    return data.response?.trim() || null;
  } catch { return null; }
}

function readFile(relPath) {
  try { return readFileSync(join(ROOT, relPath), "utf-8"); }
  catch { return null; }
}

function writeFile(relPath, content) {
  writeFileSync(join(ROOT, relPath), content, "utf-8");
}

// ============================================
// 1. Verificar pré-requisitos
// ============================================
function checkPrerequisites() {
  info("Verificando pré-requisitos...");
  const issues = [];

  // Ollama
  const ollamaCheck = run("ollama --version", true);
  if (ollamaCheck) { ok(`Ollama: ${ollamaCheck.split("\n")[0]}`); }
  else { fail("Ollama não encontrado. Instale: https://ollama.com"); issues.push("ollama_missing"); }

  // Node
  const nodeVersion = run("node --version", true);
  if (nodeVersion) { ok(`Node: ${nodeVersion}`); }
  else { fail("Node.js não encontrado"); issues.push("node_missing"); }

  // Git
  const gitVersion = run("git --version", true);
  if (gitVersion) { ok(`Git: ${gitVersion}`); }
  else { fail("Git não encontrado"); issues.push("git_missing"); }

  return issues;
}

// ============================================
// 2. Health Check (via /api/health)
// ============================================
async function healthCheck() {
  info("Executando health check...");

  const envLocal = readFile(".env.local");
  const cronSecret = envLocal?.match(/CRON_SECRET=(.+)/)?.[1]?.trim();
  const appUrl = "https://disciplinemax.onrender.com";

  // Teste direto dos serviços
  const checks = {
    render: false,
    supabase: false,
    gemini: false,
    telegram: false,
    cron: false,
    ollama: false,
  };
  const details = {};

  // Render
  try {
    const res = await fetch(appUrl, { signal: AbortSignal.timeout(10000) });
    checks.render = res.ok;
    details.render = `status ${res.status}`;
  } catch (e) { details.render = e.message; }

  // Supabase
  const supabaseUrl = envLocal?.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
  const supabaseKey = envLocal?.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
  if (supabaseUrl && supabaseKey) {
    try {
      const tables = ["books", "bible_goals", "bible_readings", "daily_stats", "pomodoro_sessions", "user_settings", "notification_subscriptions", "notifications_sent"];
      const tableStatus = {};
      for (const t of tables) {
        const res = await fetch(`${supabaseUrl}/rest/v1/${t}?select=id&limit=1`, {
          headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
          signal: AbortSignal.timeout(5000),
        });
        tableStatus[t] = res.ok;
      }
      checks.supabase = Object.values(tableStatus).every(Boolean);
      details.supabase = JSON.stringify(tableStatus);
    } catch (e) { details.supabase = e.message; }
  } else { details.supabase = "No credentials in .env.local"; }

  // Cron
  if (cronSecret) {
    try {
      const res = await fetch(`${appUrl}/api/cron?secret=${cronSecret}`, { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      checks.cron = data.ok === true;
      details.cron = `BRT ${data.brtTime}, processed: ${data.processed}`;
    } catch (e) { details.cron = e.message; }
  }

  // Telegram
  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/user_settings?select=telegram_bot_token&user_id=eq.default_user`, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      const token = data?.[0]?.telegram_bot_token;
      if (token) {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(5000) });
        const tgData = await tgRes.json();
        checks.telegram = tgData.ok === true;
        details.telegram = tgData.ok ? `@${tgData.result.username}` : tgData.description;
      } else { details.telegram = "No bot token in DB"; }
    } catch (e) { details.telegram = e.message; }
  }

  // Gemini
  try {
    const res = await fetch(`${appUrl}/api/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "ping" }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    checks.gemini = !!data.text;
    details.gemini = data.text ? `responding (${data.provider || "unknown"})` : "null response";
  } catch (e) { details.gemini = e.message; }

  // Ollama
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    checks.ollama = true;
    details.ollama = data.models?.map(m => m.name).join(", ") || "no models";
  } catch { details.ollama = "not running"; }

  // Reportar
  for (const [svc, passed] of Object.entries(checks)) {
    if (passed) ok(`${svc}: ${details[svc]}`);
    else fail(`${svc}: ${details[svc]}`);
  }

  return { checks, details };
}

// ============================================
// 3. Code Analysis (com Ollama)
// ============================================
async function analyzeCode(healthResults) {
  info("Analisando código com IA...");

  const failedServices = Object.entries(healthResults.checks)
    .filter(([_, ok]) => !ok)
    .map(([svc]) => `${svc}: ${healthResults.details[svc]}`);

  if (failedServices.length === 0) {
    ok("Todos os serviços estão saudáveis!");
    return { issues: [], fixes: [] };
  }

  warn(`Problemas encontrados: ${failedServices.join(", ")}`);

  // Coletar código relevante para análise
  const filesToAnalyze = [
    "app/api/cron/route.ts",
    "app/api/ai/route.ts",
    "lib/ai.ts",
    "lib/telegram.ts",
    "lib/whatsapp.ts",
    "lib/supabase.ts",
  ];

  const codeContext = filesToAnalyze
    .map(f => { const content = readFile(f); return content ? `=== ${f} ===\n${content.substring(0, 2000)}` : null; })
    .filter(Boolean)
    .join("\n\n");

  const envContent = readFile(".env.local")?.replace(/=.+/g, "=***") || "not found";
  const gitLog = run("git log --oneline -5", true) || "no git log";

  const prompt = `Você é um engenheiro de software sênior diagnosticando problemas no DisciplinaApp (Next.js 14 + Supabase + Telegram + Ollama).

SERVIÇOS COM FALHA:
${failedServices.join("\n")}

CÓDIGO-FONTE RELEVANTE:
${codeContext}

ENV (mascarado):
${envContent}

GIT LOG:
${gitLog}

Analise os problemas e para cada um retorne:
1. PROBLEMA: descrição clara
2. CAUSA: causa raiz provável
3. ARQUIVO: arquivo que precisa ser alterado
4. CORREÇÃO: código exato para substituir (use formato: <<<ANTIGO\n código antigo \n===\n código novo \n>>>NOVO)

Se não houver problemas de código, diga "SEM_PROBLEMAS".`;

  const analysis = await ollamaGenerate(prompt);
  if (!analysis) {
    fail("Ollama não respondeu. Verifique se está rodando: ollama serve");
    return { issues: failedServices, fixes: [], analysis: null };
  }

  info("Análise da IA:");
  console.log(analysis);

  return { issues: failedServices, analysis, fixes: parseFixes(analysis) };
}

// ============================================
// 4. Parse fixes da resposta da IA
// ============================================
function parseFixes(analysis) {
  const fixes = [];
  const regex = /<<<ANTIGO\n([\s\S]*?)\n===\n([\s\S]*?)\n>>>NOVO/g;
  let match;
  while ((match = regex.exec(analysis)) !== null) {
    fixes.push({ oldCode: match[1].trim(), newCode: match[2].trim() });
  }
  return fixes;
}

// ============================================
// 5. Aplicar correções
// ============================================
async function applyFixes(fixes) {
  if (fixes.length === 0) {
    info("Nenhuma correção automática sugerida.");
    return [];
  }

  if (!FIX && !PUSH) {
    warn(`${fixes.length} correção(ões) disponível(is). Use --fix ou --push para aplicar.`);
    return [];
  }

  const applied = [];
  const files = [
    "app/api/cron/route.ts", "app/api/ai/route.ts", "lib/ai.ts",
    "lib/telegram.ts", "lib/whatsapp.ts", "lib/supabase.ts",
    "app/page.tsx", "lib/stats.ts",
  ];

  for (const fix of fixes) {
    let appliedFix = false;
    for (const file of files) {
      const content = readFile(file);
      if (content && content.includes(fix.oldCode)) {
        const newContent = content.replace(fix.oldCode, fix.newCode);
        writeFile(file, newContent);
        ok(`Corrigido: ${file}`);
        applied.push({ file, oldCode: fix.oldCode.substring(0, 80), newCode: fix.newCode.substring(0, 80) });
        appliedFix = true;
        break;
      }
    }
    if (!appliedFix) {
      warn(`Não encontrei o código para corrigir: "${fix.oldCode.substring(0, 60)}..."`);
    }
  }

  return applied;
}

// ============================================
// 6. Build check
// ============================================
function buildCheck() {
  info("Verificando build...");
  const result = run("npx next build 2>&1", true);
  if (result?.includes("✓ Compiled successfully") || result?.includes("Generating static pages")) {
    ok("Build passou sem erros");
    return true;
  }
  fail("Build falhou!");
  // Extrair erros
  const errorLines = result?.split("\n").filter(l => l.includes("Error") || l.includes("error")) || [];
  errorLines.slice(0, 5).forEach(l => fail(l.trim()));
  return false;
}

// ============================================
// 7. Git commit + push
// ============================================
function gitCommitPush(applied) {
  if (applied.length === 0) return;

  if (!PUSH) {
    warn("Correções aplicadas localmente. Use --push para commit + push.");
    return;
  }

  info("Fazendo git commit + push...");
  run("git add -A");
  const msg = `fix(ai-doctor): ${applied.length} correção(ões) automática(s) - ${new Date().toISOString().split("T")[0]}`;
  run(`git commit -m "${msg}"`);
  const pushResult = run("git push origin master");
  if (pushResult !== null) {
    ok("Push concluído!");
  } else {
    fail("Push falhou!");
  }
}

// ============================================
// Main
// ============================================
async function main() {
  console.log("");
  console.log("🏥 DISCIPLINA APP — IA Auto-Diagnóstico");
  console.log("━".repeat(50));
  console.log(`Modo: ${FIX ? "FIX" : PUSH ? "FIX + PUSH" : "DIAGNÓSTICO"}`);
  console.log("");

  // 1. Pré-requisitos
  const prereqIssues = checkPrerequisites();
  if (prereqIssues.includes("ollama_missing")) {
    fail("Ollama é necessário para o diagnóstico por IA.");
    fail("Instale: https://ollama.com → ollama pull llama3.2:3b");
    process.exit(1);
  }

  console.log("");

  // 2. Health check
  const health = await healthCheck();
  console.log("");

  // 3. Se tudo OK, parar
  if (Object.values(health.checks).every(Boolean)) {
    ok("TUDO SAUDÁVEL! Nenhuma ação necessária.");
    console.log("");
    info("Relatório:");
    for (const [svc, detail] of Object.entries(health.details)) {
      info(`  ${svc}: ${detail}`);
    }
    return;
  }

  // 4. Análise com IA
  const { issues, analysis, fixes } = await analyzeCode(health);
  console.log("");

  // 5. Aplicar correções
  const applied = await applyFixes(fixes);
  console.log("");

  // 6. Verificar build
  if (applied.length > 0) {
    const buildOk = buildCheck();
    console.log("");

    if (!buildOk) {
      fail("Build falhou após correções. Revertendo...");
      run("git checkout -- .");
      fail("Revertido. Correções precisam de revisão manual.");
      return;
    }

    // 7. Commit + push
    gitCommitPush(applied);
  }

  // 8. Relatório final
  console.log("");
  console.log("━".repeat(50));
  console.log("📋 RELATÓRIO FINAL");
  console.log("━".repeat(50));
  console.log(`Problemas encontrados: ${issues.length}`);
  console.log(`Correções aplicadas: ${applied.length}`);
  if (applied.length > 0) {
    for (const a of applied) {
      console.log(`  • ${a.file}: "${a.oldCode}..." → "${a.newCode}..."`);
    }
  }
  if (analysis && !FIX && !PUSH) {
    console.log("");
    info("Para aplicar correções, rode: node scripts/doctor.mjs --fix");
    info("Para aplicar + push, rode: node scripts/doctor.mjs --push");
  }
  console.log("");
}

main().catch(e => { fail(`Erro fatal: ${e.message}`); process.exit(1); });
