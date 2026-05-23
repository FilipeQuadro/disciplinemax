// Integração com Google Gemini AI (gratuito)
// Chave gratuita: https://aistudio.google.com/app/apikey

export async function getMotivationalMessage(context: {
  streak: number;
  booksRead: number;
  bibleChapters: number;
  completedToday: boolean;
}): Promise<string> {
  const prompt = `Você é um mentor de disciplina e leitura. Gere uma mensagem motivacional CURTA (máx 2 frases) em português para alguém que:
- Tem ${context.streak} dias consecutivos de leitura
- Leu ${context.booksRead} livros este mês
- Leu ${context.bibleChapters} capítulos da Bíblia hoje
- ${context.completedToday ? "JÁ completou as metas de hoje" : "AINDA não completou as metas de hoje"}

Seja direto, encorajador e bíblico quando apropriado. Sem formatação markdown.`;

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (data.text) return data.text;
    return getStaticMotivation(context.streak);
  } catch (e) {
    return getStaticMotivation(context.streak);
  }
}

export async function getBibleVerseOfDay(): Promise<{ verse: string; reference: string }> {
  const verses = [
    { verse: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13" },
    { verse: "O SENHOR é o meu pastor e nada me faltará.", reference: "Salmos 23:1" },
    { verse: "Confie no SENHOR de todo o seu coração.", reference: "Provérbios 3:5" },
    { verse: "Buscai primeiro o reino de Deus e a sua justiça.", reference: "Mateus 6:33" },
    { verse: "Sê forte e corajoso! Não se apavore nem desanime.", reference: "Josué 1:9" },
    { verse: "O início da sabedoria é o temor do SENHOR.", reference: "Provérbios 9:10" },
    { verse: "Mas os que esperam no SENHOR renovam as suas forças.", reference: "Isaías 40:31" },
    { verse: "Não te afastes desta lei; medita nela dia e noite.", reference: "Josué 1:8" },
    { verse: "Em tudo dai graças.", reference: "1 Tessalonicenses 5:18" },
    { verse: "O amor nunca falha.", reference: "1 Coríntios 13:8" },
  ];

  // Versículo baseado no dia do ano
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return verses[dayOfYear % verses.length];
}

function getStaticMotivation(streak: number): string {
  if (streak === 0) return "Hoje é o primeiro dia do resto da sua jornada. Comece agora! 🚀";
  if (streak < 7) return `${streak} dias seguidos! A consistência é o segredo dos grandes. Continue!`;
  if (streak < 30) return `${streak} dias de constância! Você está construindo um hábito poderoso. 🔥`;
  return `${streak} dias! Você é uma inspiração. 'O sucesso é a soma de pequenos esforços repetidos.'`;
}
