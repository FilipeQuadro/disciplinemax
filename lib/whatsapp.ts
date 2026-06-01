// Green-API WhatsApp integration
// Free developer plan: https://green-api.com
// Setup: create account → create instance → scan QR → get idInstance + apiTokenInstance

export type WhatsAppResult = {
  ok: boolean;
  idMessage?: string;
  status?: number;
  error?: string;
  stateInstance?: string;
};

export type InstanceState = "authorized" | "notAuthorized" | "blocked" | "sleepMode" | "starting" | "yellowCard";

export const STATE_ERRORS: Record<string, string> = {
  notAuthorized: "Instância NÃO conectada ao WhatsApp. Escaneie o QR Code no painel do Green-API (https://console.green-api.com).",
  blocked: "Sua conta WhatsApp foi bloqueada. Contate o suporte do Green-API.",
  sleepMode: "Celular está desligado ou sem internet. Ligue o celular e aguarde até 5 min para reconectar.",
  starting: "Instância está iniciando. Aguarde até 5 minutos e tente novamente.",
  yellowCard: "Envio de mensagens suspenso por suspeita de spam. Reinicie a instância no painel do Green-API.",
};

/**
 * Clean phone number: strip +, spaces, dashes, parentheses — keep digits only.
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

/**
 * Check instance connection state via Green-API getStateInstance endpoint.
 * Returns the state string (e.g. "authorized") or null on API error.
 */
export async function getInstanceState(
  idInstance: string,
  apiTokenInstance: string
): Promise<InstanceState | null> {
  try {
    const url = `https://api.greenapi.com/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.stateInstance || null;
  } catch {
    return null;
  }
}

/**
 * Send a WhatsApp message via Green-API REST endpoint.
 * POST https://api.greenapi.com/waInstance{idInstance}/sendMessage/{apiTokenInstance}
 * Body: { chatId: "5511912345678@c.us", message: "Hello" }
 */
export async function sendWhatsAppMessage(
  idInstance: string,
  apiTokenInstance: string,
  phone: string,
  message: string,
  options?: { checkState?: boolean }
): Promise<WhatsAppResult> {
  // Validate inputs
  if (!idInstance || !apiTokenInstance) {
    return { ok: false, error: "Instance ID e API Token são obrigatórios. Obtenha no painel do Green-API." };
  }

  // Clean phone number (strip +, spaces, dashes)
  const cleanNum = cleanPhone(phone);
  if (!cleanNum || cleanNum.length < 10) {
    return { ok: false, error: `Número inválido "${phone}" → "${cleanNum}". Use formato internacional (ex: 5511987654321, sem + ou espaços).` };
  }

  // Optionally check instance state before sending
  if (options?.checkState) {
    const state = await getInstanceState(idInstance, apiTokenInstance);
    if (state && state !== "authorized") {
      return { ok: false, stateInstance: state, error: STATE_ERRORS[state] || `Estado da instância: ${state}` };
    }
    if (!state) {
      return { ok: false, error: "Não foi possível verificar o estado da instância. Verifique o Instance ID e API Token." };
    }
  }

  try {
    const chatId = `${cleanNum}@c.us`;

    const url = `https://api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Green-API send failed:", res.status, data);
      const errMsg = data?.error || data?.message || `HTTP ${res.status}`;
      if (errMsg.includes("not authorized") || errMsg.includes("timeout") || errMsg.includes("Account is not authorized")) {
        return { ok: false, status: res.status, error: "Instância não conectada. Escaneie o QR Code no painel do Green-API." };
      }
      if (errMsg.includes("not found") || errMsg.includes("Instance not found")) {
        return { ok: false, status: res.status, error: "Instance ID não encontrado. Verifique no painel do Green-API." };
      }
      if (errMsg.includes("Invalid token")) {
        return { ok: false, status: res.status, error: "API Token inválido. Verifique o token no painel do Green-API." };
      }
      if (errMsg.includes("not in chat") || errMsg.includes("phone")) {
        return { ok: false, status: res.status, error: "Número não está no WhatsApp ou formato incorreto. Use: 5511987654321" };
      }
      return { ok: false, status: res.status, error: errMsg };
    }

    // Green-API returns idMessage even when not connected — verify state
    const state = await getInstanceState(idInstance, apiTokenInstance);
    if (state && state !== "authorized") {
      return { ok: false, idMessage: data.idMessage, stateInstance: state, error: STATE_ERRORS[state] || `Mensagem enfileirada mas instância está: ${state}` };
    }

    return { ok: true, idMessage: data.idMessage, status: res.status, stateInstance: state || undefined };
  } catch (e: any) {
    console.error("Green-API send failed:", e);
    return { ok: false, error: e?.message || String(e) };
  }
}

export function buildMorningMessage(data: {
  name?: string;
  booksPages: { title: string; pagesLeft: number }[];
  bibleChapters: number;
  pomodoroGoal: number;
  motivational: string;
}): string {
  const greet = data.name ? `Bom dia, ${data.name}! ☀️` : "Bom dia! ☀️";
  let msg = `${greet}\n\n*Suas metas de hoje:*\n\n`;

  if (data.booksPages.length > 0) {
    msg += `📚 *Leitura:*\n`;
    data.booksPages.forEach((b) => {
      msg += `• ${b.title}: ${b.pagesLeft} páginas faltando\n`;
    });
    msg += "\n";
  }

  if (data.bibleChapters > 0) {
    msg += `✝️ *Bíblia:* ${data.bibleChapters} capítulos hoje\n\n`;
  }

  if (data.pomodoroGoal > 0) {
    msg += `🍅 *Pomodoro:* ${data.pomodoroGoal} sessões de foco\n\n`;
  }

  msg += `💡 _${data.motivational}_\n\n`;
  msg += `👉 Acesse: disciplinemax.onrender.com`;

  return msg;
}

export function buildReminderMessage(data: {
  pendingBooks: { title: string; pagesLeft: number }[];
  biblePending: boolean;
  bibleChaptersLeft: number;
  hour: number;
}): string {
  const timeEmoji = data.hour < 12 ? "🌅" : data.hour < 18 ? "☀️" : "🌙";
  let msg = `${timeEmoji} *Lembrete DisciplinaMax*\n\nAinda faltam completar:\n\n`;

  if (data.pendingBooks.length > 0) {
    data.pendingBooks.forEach((b) => {
      msg += `📖 ${b.title}: *${b.pagesLeft}* páginas\n`;
    });
  }

  if (data.biblePending && data.bibleChaptersLeft > 0) {
    msg += `✝️ Bíblia: *${data.bibleChaptersLeft}* capítulos\n`;
  }

  msg += `\n_Você consegue! Não desista hoje._ 💪`;
  return msg;
}

export function buildCompletionMessage(streakDays: number): string {
  const medals = streakDays >= 30 ? "🏆" : streakDays >= 14 ? "🥇" : streakDays >= 7 ? "🥈" : "⭐";
  return (
    `${medals} *Parabéns! Metas do dia concluídas!* ${medals}\n\n` +
    `Você completou *${streakDays} dias consecutivos*!\n\n` +
    `_A disciplina é a ponte entre metas e conquistas._\n` +
    `_Continue amanhã e mantenha o streak!_ 🔥`
  );
}
