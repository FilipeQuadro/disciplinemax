// Integração com CallMeBot (WhatsApp gratuito)
// Cadastro: https://www.callmebot.com/blog/free-api-whatsapp-messages/

export type WhatsAppResult = {
  ok: boolean;
  status?: number;
  error?: string;
  responseText?: string;
};

export async function sendWhatsAppMessage(
  phoneNumber: string,
  apiKey: string,
  message: string
): Promise<WhatsAppResult> {
  try {
    const encodedMsg = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${encodedMsg}&apikey=${apiKey}`;
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.error("WhatsApp send failed:", res.status, text);
      return { ok: false, status: res.status, responseText: text };
    }
    return { ok: true, status: res.status, responseText: text };
  } catch (e: any) {
    console.error("WhatsApp send failed:", e);
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
  let msg = `${timeEmoji} *Lembrete DisciplinaApp*\n\nAinda faltam completar:\n\n`;

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
