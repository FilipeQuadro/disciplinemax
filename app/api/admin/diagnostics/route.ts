import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface DiagnosticResult {
  status: "healthy" | "warning" | "error" | "disabled";
  name: string;
  description: string;
  explanation: string;
  suggestion: string;
  latency_ms?: number;
  details?: Record<string, any>;
}

export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const { isAdmin } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);
  const results: DiagnosticResult[] = [];
  const issues: string[] = [];

  // ── 1. DATABASE ──────────────────────────────────────────────
  const dbStart = Date.now();
  const dbTables = [
    { name: "user_settings", desc: "Configurações de usuário" },
    { name: "books", desc: "Livros dos usuários" },
    { name: "bible_goals", desc: "Metas bíblicas" },
    { name: "bible_readings", desc: "Leituras bíblicas" },
    { name: "daily_stats", desc: "Estatísticas diárias" },
    { name: "pomodoro_sessions", desc: "Sessões de pomodoro" },
    { name: "user_plans", desc: "Planos dos usuários" },
    { name: "admin_users", desc: "Tabela de admins" },
    { name: "blocked_users", desc: "Usuários bloqueados" },
    { name: "notification_subscriptions", desc: "Inscrições de notificação" },
    { name: "notifications_sent", desc: "Notificações enviadas" },
    { name: "audit_logs", desc: "Logs de auditoria" },
    { name: "achievements", desc: "Conquistas" },
  ];

  const tableResults: Record<string, { ok: boolean; error?: string; count?: number }> = {};
  let dbAllOk = true;
  for (const t of dbTables) {
    try {
      const { error, count } = await sb.from(t.name).select("id", { count: "exact", head: true });
      if (error) {
        tableResults[t.name] = { ok: false, error: error.message };
        dbAllOk = false;
        issues.push(`Tabela "${t.name}" (${t.desc}) inacessível: ${error.message}`);
      } else {
        tableResults[t.name] = { ok: true, count: count ?? 0 };
      }
    } catch (e: any) {
      tableResults[t.name] = { ok: false, error: e.message };
      dbAllOk = false;
      issues.push(`Tabela "${t.name}" (${t.desc}) falhou: ${e.message}`);
    }
  }

  const failedTables = Object.entries(tableResults).filter(([, v]) => !v.ok);
  results.push({
    status: dbAllOk ? "healthy" : "error",
    name: "Banco de Dados (Supabase)",
    description: "Verifica se todas as 13 tabelas do banco estão acessíveis e respondendo corretamente.",
    explanation: dbAllOk
      ? `Todas as ${dbTables.length} tabelas estão acessíveis e funcionando normalmente. O banco de dados está saudável.`
      : `${failedTables.length} de ${dbTables.length} tabelas estão com problema: ${failedTables.map(([k]) => k).join(", ")}. Isso pode ser causado por: (1) tabela não existe — rode o script SQL de criação, (2) RLS bloqueando o service_role_key — verifique as policies, (3) problema de conectividade com o Supabase.`,
    suggestion: dbAllOk
      ? "Nenhuma ação necessária."
      : `Para resolver: acesse o painel do Supabase → SQL Editor e execute o script create-tables.sql. Se a tabela existe mas está com RLS, verifique se o service_role_key está correto. Tabelas com problema: ${failedTables.map(([k]) => k).join(", ")}`,
    latency_ms: Date.now() - dbStart,
    details: tableResults,
  });

  // ── 2. GEMINI AI ──────────────────────────────────────────────
  const geminiStart = Date.now();
  let geminiOk = false;
  let geminiDetail = "";
  let geminiSuggestion = "";
  let geminiExplanation = "";

  try {
    // Try env var first, then DB
    let apiKey = process.env.GEMINI_API_KEY;
    let keySource = "variável de ambiente (GEMINI_API_KEY)";

    if (!apiKey) {
      const { data: settings } = await sb.from("user_settings").select("gemini_api_key").limit(1).maybeSingle();
      apiKey = settings?.gemini_api_key || undefined;
      keySource = "banco de dados (user_settings.gemini_api_key)";
    }

    if (!apiKey) {
      geminiExplanation = "Nenhuma chave da API Gemini está configurada. A IA não funcionará para nenhum usuário. O app usará fallback estático (respostas genéricas).";
      geminiSuggestion = "Para resolver: adicione GEMINI_API_KEY nas variáveis de ambiente do Render (Settings → Environment), ou peça para um usuário configurar sua chave em Configurações.";
      results.push({
        status: "disabled",
        name: "Gemini AI",
        description: "Verifica se a API do Google Gemini está acessível para respostas de IA.",
        explanation: geminiExplanation,
        suggestion: geminiSuggestion,
        latency_ms: Date.now() - geminiStart,
      });
    } else {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      const data = await res.json();

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        geminiOk = true;
        geminiExplanation = `A API Gemini está respondendo normalmente. A chave foi encontrada na ${keySource}. Latência: ${Date.now() - geminiStart}ms. O recurso de IA está funcional para os usuários.`;
        geminiSuggestion = "Nenhuma ação necessária.";
      } else if (data.error) {
        const errMsg = data.error.message || JSON.stringify(data.error);
        geminiExplanation = `A API Gemini retornou um erro: "${errMsg}". Isso geralmente significa: (1) a chave API é inválida ou expirou, (2) a cota foi excedida, (3) o modelo especificado não existe mais. A chave veio da ${keySource}.`;
        geminiSuggestion = `Para resolver: verifique se a chave API é válida em https://aistudio.google.com/apikey. Se a cota foi excedida, aguarde ou aumente o plano. Erro original: ${errMsg}`;
        issues.push(`Gemini: ${errMsg}`);
      } else {
        geminiExplanation = `A API Gemini respondeu mas sem conteúdo válido. A resposta pode estar sendo bloqueada por filtros de segurança. Isso significa que o modelo recebeu a requisição mas não gerou uma resposta utilizável.`;
        geminiSuggestion = "Pode ser temporário. Se persistir, verifique os filtros de segurança do Gemini ou tente outro modelo.";
        issues.push("Gemini: resposta vazia ou bloqueada por filtros de segurança");
      }

      results.push({
        status: geminiOk ? "healthy" : "error",
        name: "Gemini AI",
        description: "Verifica se a API do Google Gemini está acessível para respostas de IA.",
        explanation: geminiExplanation,
        suggestion: geminiSuggestion,
        latency_ms: Date.now() - geminiStart,
        details: { keySource, model: "gemini-2.5-flash-lite" },
      });
    }
  } catch (e: any) {
    geminiExplanation = `Falha ao conectar com a API Gemini: "${e.message}". Isso geralmente significa: (1) problema de rede/DNS, (2) o servidor do Google está temporariamente indisponível, (3) firewall bloqueando a requisição.`;
    geminiSuggestion = "Para resolver: verifique a conectividade do servidor com a internet. Se o problema persistir, o app usará fallback estático automaticamente.";
    issues.push(`Gemini: ${e.message}`);
    results.push({
      status: "error",
      name: "Gemini AI",
      description: "Verifica se a API do Google Gemini está acessível para respostas de IA.",
      explanation: geminiExplanation,
      suggestion: geminiSuggestion,
      latency_ms: Date.now() - geminiStart,
    });
  }

  // ── 3. TELEGRAM BOT ───────────────────────────────────────────
  const tgStart = Date.now();
  try {
    const { data: settings } = await sb.from("user_settings").select("telegram_bot_token, telegram_chat_id").limit(1).maybeSingle();

    if (!settings?.telegram_bot_token) {
      results.push({
        status: "disabled",
        name: "Telegram Bot",
        description: "Verifica se o bot do Telegram está configurado e funcionando para envio de notificações.",
        explanation: "Nenhum token de bot do Telegram está configurado no sistema. As notificações via Telegram não serão enviadas. Isso pode ser intencional se o recurso não estiver em uso.",
        suggestion: "Para ativar: peça para um usuário configurar o token do bot e chat_id em Configurações. Ou configure TELEGRAM_BOT_TOKEN nas variáveis de ambiente.",
      });
    } else {
      const res = await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/getMe`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();

      if (data.ok) {
        const botUsername = data.result?.username || "desconhecido";
        const hasChatId = !!settings.telegram_chat_id;

        if (!hasChatId) {
          results.push({
            status: "warning",
            name: "Telegram Bot",
            description: "Verifica se o bot do Telegram está configurado e funcionando para envio de notificações.",
            explanation: `O bot @${botUsername} está funcionando, mas NÃO há chat_id configurado. O bot pode receber mensagens mas não sabe para onde enviar notificações. Os usuários não receberão mensagens via Telegram até que um chat_id seja configurado.`,
            suggestion: "Para resolver: o usuário precisa enviar uma mensagem ao bot primeiro, depois configurar o chat_id em Configurações. O chat_id é o identificador da conversa entre o usuário e o bot.",
            latency_ms: Date.now() - tgStart,
            details: { botUsername, hasChatId },
          });
          issues.push("Telegram: bot ativo mas sem chat_id configurado");
        } else {
          results.push({
            status: "healthy",
            name: "Telegram Bot",
            description: "Verifica se o bot do Telegram está configurado e funcionando para envio de notificações.",
            explanation: `O bot @${botUsername} está funcionando e o chat_id está configurado. Notificações via Telegram devem ser enviadas normalmente pelo cron e pelo sistema de lembretes.`,
            suggestion: "Nenhuma ação necessária.",
            latency_ms: Date.now() - tgStart,
            details: { botUsername, hasChatId },
          });
        }
      } else {
        const tgErr = data.description || "erro desconhecido";
        results.push({
          status: "error",
          name: "Telegram Bot",
          description: "Verifica se o bot do Telegram está configurado e funcionando para envio de notificações.",
          explanation: `O token do Telegram não é válido ou o bot foi desativado. Erro: "${tgErr}". Causas comuns: (1) o token foi revogado pelo BotFather, (2) o token está incorreto, (3) o bot foi banido. As notificações via Telegram NÃO funcionam.`,
          suggestion: `Para resolver: vá ao @BotFather no Telegram, verifique se o bot existe e obtenha um novo token com /revoke se necessário. Erro original: ${tgErr}`,
          latency_ms: Date.now() - tgStart,
        });
        issues.push(`Telegram: ${tgErr}`);
      }
    }
  } catch (e: any) {
    results.push({
      status: "error",
      name: "Telegram Bot",
      description: "Verifica se o bot do Telegram está configurado e funcionando para envio de notificações.",
      explanation: `Falha ao conectar com a API do Telegram: "${e.message}". Isso pode ser um problema de rede ou o Telegram está temporariamente indisponível.`,
      suggestion: "Verifique a conectividade do servidor. Se o problema persistir, as notificações via Telegram ficarão indisponíveis até que a conexão seja restaurada.",
      latency_ms: Date.now() - tgStart,
    });
    issues.push(`Telegram: ${e.message}`);
  }

  // ── 4. PUSH NOTIFICATIONS ─────────────────────────────────────
  try {
    const { count: subCount } = await sb.from("notification_subscriptions").select("*", { count: "exact", head: true });
    const { count: sentCount } = await sb.from("notifications_sent").select("id", { count: "exact", head: true });

    if (!subCount) {
      results.push({
        status: "disabled",
        name: "Notificações Push",
        description: "Verifica se as notificações push (Web/iOS) estão configuradas e ativas.",
        explanation: "Nenhum usuário se inscreveu para receber notificações push ainda. Isso pode ser normal se o app é novo ou se os usuários não ativaram as notificações.",
        suggestion: "Para aumentar inscrições: verifique se o prompt de notificação está aparecendo corretamente no app. Usuários precisam aceitar o prompt de notificação do navegador/sistema.",
        details: { subscriptions: subCount ?? 0, sent: sentCount ?? 0 },
      });
    } else {
      // Check VAPID keys
      const hasVapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY;

      if (!hasVapidPublic || !hasVapidPrivate) {
        results.push({
          status: "warning",
          name: "Notificações Push",
          description: "Verifica se as notificações push (Web/iOS) estão configuradas e ativas.",
          explanation: `Há ${subCount} inscrições de push, mas as chaves VAPID ${!hasVapidPublic ? "pública" : ""}${!hasVapidPublic && !hasVapidPrivate ? " e " : ""}${!hasVapidPrivate ? "privada" : ""} não estão configuradas. Novas inscrições podem falhar e notificações não serão enviadas.`,
          suggestion: "Para resolver: gere chaves VAPID com `npx web-push generate-vapid-keys` e configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas variáveis de ambiente.",
          details: { subscriptions: subCount, sent: sentCount ?? 0, vapidPublic: hasVapidPublic, vapidPrivate: hasVapidPrivate },
        });
        issues.push("Push: chaves VAPID não configuradas");
      } else {
        results.push({
          status: "healthy",
          name: "Notificações Push",
          description: "Verifica se as notificações push (Web/iOS) estão configuradas e ativas.",
          explanation: `Há ${subCount} inscrições de push ativas e ${sentCount ?? 0} notificações já foram enviadas. As chaves VAPID estão configuradas. O sistema de notificações push está funcionando normalmente.`,
          suggestion: "Nenhuma ação necessária.",
          details: { subscriptions: subCount, sent: sentCount ?? 0 },
        });
      }
    }
  } catch (e: any) {
    results.push({
      status: "error",
      name: "Notificações Push",
      description: "Verifica se as notificações push (Web/iOS) estão configuradas e ativas.",
      explanation: `Erro ao verificar inscrições de push: "${e.message}". Não foi possível verificar o status das notificações push.`,
      suggestion: "Verifique se a tabela notification_subscriptions existe e está acessível.",
    });
  }

  // ── 5. CRON / SCHEDULER ───────────────────────────────────────
  try {
    const { data: notifs } = await sb
      .from("notifications_sent")
      .select("sent_at, type")
      .order("sent_at", { ascending: false })
      .limit(10);

    const lastNotif = notifs?.[0]?.sent_at || null;
    const notifTypes = notifs?.map((n: any) => n.type) || [];

    if (!lastNotif) {
      results.push({
        status: "warning",
        name: "Cron / Agendador",
        description: "Verifica se o agendador de tarefas (cron) está executando as notificações periodicamente.",
        explanation: "Nenhuma notificação foi enviada ainda pelo sistema. Isso pode significar: (1) o cron nunca foi configurado no cron-job.org, (2) o CRON_SECRET está incorreto, (3) nenhum usuário configurou horários de notificação.",
        suggestion: "Para resolver: configure o cron em cron-job.org apontando para https://seu-dominio.com/api/cron?secret=SEU_CRON_SECRET com intervalo de 4 horas (6x/dia). Verifique se CRON_SECRET está correto nas variáveis de ambiente.",
      });
      issues.push("Cron: nenhuma notificação enviada");
    } else {
      const hoursSinceLast = (Date.now() - new Date(lastNotif).getTime()) / 3600000;
      if (hoursSinceLast > 48) {
        results.push({
          status: "error",
          name: "Cron / Agendador",
          description: "Verifica se o agendador de tarefas (cron) está executando as notificações periodicamente.",
          explanation: `A última notificação foi enviada há ${Math.round(hoursSinceLast)} horas (mais de 48h). O cron provavelmente está PARADO. Causas: (1) o job no cron-job.org foi pausado ou deletado, (2) o CRON_SECRET mudou, (3) o servidor está retornando erro no endpoint /api/cron.`,
          suggestion: `Para resolver: verifique no cron-job.org se o job está ativo. Teste manualmente: abra https://seu-dominio.com/api/cron?secret=SEU_CRON_SECRET no navegador. Se retornar erro, verifique os logs. Última notificação: ${lastNotif}`,
          details: { lastNotif, hoursSinceLast: Math.round(hoursSinceLast), recentTypes: notifTypes.slice(0, 5) },
        });
        issues.push(`Cron: última notificação há ${Math.round(hoursSinceLast)}h`);
      } else if (hoursSinceLast > 24) {
        results.push({
          status: "warning",
          name: "Cron / Agendador",
          description: "Verifica se o agendador de tarefas (cron) está executando as notificações periodicamente.",
          explanation: `A última notificação foi há ${Math.round(hoursSinceLast)} horas. Isso pode ser normal se não há notificações agendadas, mas se há usuários com horários configurados, o cron pode estar com problemas.`,
          suggestion: "Verifique se há usuários com notificações agendadas. Se sim, teste o endpoint /api/cron manualmente.",
          details: { lastNotif, hoursSinceLast: Math.round(hoursSinceLast), recentTypes: notifTypes.slice(0, 5) },
        });
      } else {
        results.push({
          status: "healthy",
          name: "Cron / Agendador",
          description: "Verifica se o agendador de tarefas (cron) está executando as notificações periodicamente.",
          explanation: `O cron está funcionando normalmente. A última notificação foi enviada há ${Math.round(hoursSinceLast)}h. Tipos recentes: ${notifTypes.slice(0, 3).join(", ") || "nenhum"}.`,
          suggestion: "Nenhuma ação necessária.",
          details: { lastNotif, hoursSinceLast: Math.round(hoursSinceLast), recentTypes: notifTypes.slice(0, 5) },
        });
      }
    }
  } catch (e: any) {
    results.push({
      status: "error",
      name: "Cron / Agendador",
      description: "Verifica se o agendador de tarefas (cron) está executando as notificações periodicamente.",
      explanation: `Erro ao verificar o cron: "${e.message}". Não foi possível determinar o status do agendador.`,
      suggestion: "Verifique se a tabela notifications_sent existe e está acessível.",
    });
  }

  // ── 6. WHATSAPP (GreenAPI) ────────────────────────────────────
  try {
    const { data: waSettings } = await sb.from("user_settings").select("greenapi_instance_id, greenapi_token").limit(1).maybeSingle();

    if (!waSettings?.greenapi_instance_id || !waSettings?.greenapi_token) {
      results.push({
        status: "disabled",
        name: "WhatsApp (GreenAPI)",
        description: "Verifica se a integração com WhatsApp via GreenAPI está configurada.",
        explanation: "O WhatsApp não está configurado no sistema. As notificações via WhatsApp não serão enviadas. Isso pode ser intencional se o recurso não estiver em uso.",
        suggestion: "Para ativar: configure o greenapi_instance_id e greenapi_token em Configurações. Obtenha as credenciais em green-api.com.",
      });
    } else {
      const waStart = Date.now();
      try {
        const res = await fetch(
          `https://api.green-api.com/waInstance${waSettings.greenapi_instance_id}/getStateInstance/${waSettings.greenapi_token}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const data = await res.json();

        if (data.stateInstance === "authorized") {
          results.push({
            status: "healthy",
            name: "WhatsApp (GreenAPI)",
            description: "Verifica se a integração com WhatsApp via GreenAPI está configurada.",
            explanation: `A instância do WhatsApp está autorizada e funcionando. Notificações via WhatsApp podem ser enviadas normalmente.`,
            suggestion: "Nenhuma ação necessária.",
            latency_ms: Date.now() - waStart,
            details: { state: data.stateInstance },
          });
        } else {
          const state = data.stateInstance || data.error || "desconhecido";
          results.push({
            status: "warning",
            name: "WhatsApp (GreenAPI)",
            description: "Verifica se a integração com WhatsApp via GreenAPI está configurada.",
            explanation: `A instância do WhatsApp está no estado "${state}", que NÃO é "authorized". Causas: (1) o QR code não foi escaneado, (2) a sessão expirou e precisa ser re-escaneada, (3) a instância foi bloqueada pelo GreenAPI.`,
            suggestion: "Para resolver: acesse green-api.com, escaneie o QR code novamente com o WhatsApp. Se a instância foi bloqueada, crie uma nova.",
            latency_ms: Date.now() - waStart,
            details: { state },
          });
          issues.push(`WhatsApp: estado "${state}"`);
        }
      } catch (e: any) {
        results.push({
          status: "error",
          name: "WhatsApp (GreenAPI)",
          description: "Verifica se a integração com WhatsApp via GreenAPI está configurada.",
          explanation: `Falha ao conectar com a GreenAPI: "${e.message}". O servidor pode estar sem conectividade ou a GreenAPI está fora do ar.`,
          suggestion: "Verifique a conectividade do servidor. Se o problema persistir, as notificações via WhatsApp ficarão indisponíveis.",
          latency_ms: Date.now() - waStart,
        });
      }
    }
  } catch (e: any) {
    results.push({
      status: "error",
      name: "WhatsApp (GreenAPI)",
      description: "Verifica se a integração com WhatsApp via GreenAPI está configurada.",
      explanation: `Erro ao verificar WhatsApp: "${e.message}".`,
      suggestion: "Verifique a tabela user_settings.",
    });
  }

  // ── 7. OLLAMA (local) ─────────────────────────────────────────
  const ollamaStart = Date.now();
  try {
    const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const models = data.models?.map((m: any) => m.name) || [];
    results.push({
      status: "healthy",
      name: "Ollama (IA Local)",
      description: "Verifica se o Ollama está rodando localmente como fallback de IA.",
      explanation: `Ollama está rodando com ${models.length} modelo(s): ${models.join(", ") || "nenhum"}. Se o Gemini falhar, o sistema usará o Ollama como fallback.`,
      suggestion: "Nenhuma ação necessária.",
      latency_ms: Date.now() - ollamaStart,
      details: { models },
    });
  } catch {
    results.push({
      status: "disabled",
      name: "Ollama (IA Local)",
      description: "Verifica se o Ollama está rodando localmente como fallback de IA.",
      explanation: "O Ollama não está rodando em localhost:11434. Isso é esperado em ambiente de produção (Render). Em desenvolvimento local, o Ollama serve como fallback quando o Gemini está indisponível.",
      suggestion: "Para uso local: instale o Ollama em https://ollama.ai e rode `ollama serve`. Em produção, isso é normal e pode ser ignorado.",
      latency_ms: Date.now() - ollamaStart,
    });
  }

  // ── 8. DATA INTEGRITY ─────────────────────────────────────────
  try {
    // Check for orphaned data
    const { data: orphanedBooks } = await sb.from("books").select("user_id").limit(500);
    const bookUserIds = new Set((orphanedBooks || []).map((b: any) => b.user_id));

    const { count: settingsCount } = await sb.from("user_settings").select("id", { count: "exact", head: true });

    let orphanCount = 0;
    if (settingsCount) {
      // Users in auth but not in user_settings (shouldn't happen with triggers)
      const { data: authData } = await sb.auth.admin.listUsers();
      const settingsIds = new Set<string>();
      const { data: allSettings } = await sb.from("user_settings").select("user_id");
      for (const s of (allSettings || [])) settingsIds.add(s.user_id);

      for (const u of (authData?.users || [])) {
        if (!settingsIds.has(u.id)) orphanCount++;
      }
    }

    if (orphanCount > 0) {
      results.push({
        status: "warning",
        name: "Integridade dos Dados",
        description: "Verifica se não há dados órfãos ou inconsistências no banco.",
        explanation: `${orphanCount} usuário(s) existem em auth.users mas NÃO têm registro em user_settings. Isso pode causar erros quando esses usuários tentam usar o app, pois as configurações padrão não foram criadas. Causa provável: o trigger de auto-criação falhou ou o usuário se cadastrou antes do trigger existir.`,
        suggestion: `Para resolver: chame o endpoint /api/auth/confirm para cada usuário órfão, ou rode o script SQL que cria registros em user_settings para todos os auth.users que não têm. Usuários afetados: ${orphanCount}.`,
        details: { orphanCount },
      });
      issues.push(`Integridade: ${orphanCount} usuários sem user_settings`);
    } else {
      results.push({
        status: "healthy",
        name: "Integridade dos Dados",
        description: "Verifica se não há dados órfãos ou inconsistências no banco.",
        explanation: "Todos os usuários cadastrados têm seus registros correspondentes em user_settings. Não há inconsistências detectadas.",
        suggestion: "Nenhuma ação necessária.",
      });
    }
  } catch (e: any) {
    results.push({
      status: "warning",
      name: "Integridade dos Dados",
      description: "Verifica se não há dados órfãos ou inconsistências no banco.",
      explanation: `Não foi possível verificar a integridade dos dados: "${e.message}".`,
      suggestion: "Verifique manualmente se todos os usuários em auth.users têm registros em user_settings.",
    });
  }

  // ── 9. ENVIRONMENT VARIABLES ──────────────────────────────────
  const envChecks = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    CRON_SECRET: !!process.env.CRON_SECRET,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
  };

  const missingEnv = Object.entries(envChecks).filter(([, v]) => !v).map(([k]) => k);
  const criticalMissing = missingEnv.filter((k) =>
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].includes(k)
  );

  results.push({
    status: criticalMissing.length > 0 ? "error" : missingEnv.length > 0 ? "warning" : "healthy",
    name: "Variáveis de Ambiente",
    description: "Verifica se todas as variáveis de ambiente necessárias estão configuradas.",
    explanation: criticalMissing.length > 0
      ? `Variáveis CRÍTICAS ausentes: ${criticalMissing.join(", ")}. O app NÃO funciona sem estas variáveis. Elas são obrigatórias para conexão com o banco de dados e autenticação.`
      : missingEnv.length > 0
        ? `Variáveis opcionais ausentes: ${missingEnv.join(", ")}. O app funciona, mas alguns recursos podem não estar disponíveis (IA, push, cron).`
        : "Todas as variáveis de ambiente necessárias estão configuradas.",
    suggestion: criticalMissing.length > 0
      ? `URGENTE: configure as variáveis ${criticalMissing.join(", ")} no painel do Render (Settings → Environment) ou no .env.local.`
      : missingEnv.length > 0
        ? `Para ativar recursos completos: configure ${missingEnv.join(", ")} nas variáveis de ambiente.`
        : "Nenhuma ação necessária.",
    details: envChecks,
  });

  // ── SUMMARY ────────────────────────────────────────────────────
  const overallStatus = results.some((r) => r.status === "error") ? "error"
    : results.some((r) => r.status === "warning") ? "warning"
    : "healthy";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: results,
    issues,
    summary: {
      healthy: results.filter((r) => r.status === "healthy").length,
      warnings: results.filter((r) => r.status === "warning").length,
      errors: results.filter((r) => r.status === "error").length,
      disabled: results.filter((r) => r.status === "disabled").length,
    },
  });
}
