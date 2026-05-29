// Green-API WhatsApp integration
// Free developer plan: https://green-api.com
// Setup: create account → create instance → scan QR → get idInstance + apiTokenInstance

export type WhatsAppResult = {
  ok: boolean;
  idMessage?: string;
  status?: number;
  error?: string;
};

/**
 * Send a WhatsApp message via Green-API REST endpoint.
 * POST https://api.greenapi.com/waInstance{idInstance}/sendMessage/{apiTokenInstance}
 * Body: { chatId: "5511912345678@c.us", message: "Hello" }
 */
export async function sendWhatsAppMessage(
  idInstance: string,
  apiTokenInstance: string,
  phone: string,
  message: string
): Promise<WhatsAppResult> {
  try {
    // Format chatId: phone number + @c.us (personal chat)
    const chatId = phone.includes("@") ? phone : `${phone}@c.us`;

    const url = `https://api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Green-API send failed:", res.status, data);
      return { ok: false, status: res.status, error: data?.error || data?.message || `HTTP ${res.status}` };
    }

    return { ok: true, idMessage: data.idMessage, status: res.status };
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
