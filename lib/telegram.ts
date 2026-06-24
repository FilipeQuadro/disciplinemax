import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  // Validate inputs before calling API
  if (!botToken || botToken.length < 10) {
    return { ok: false, error: "Bot token inválido. Verifique o token do seu bot no BotFather." };
  }
  if (!chatId || isNaN(Number(chatId))) {
    return { ok: false, error: "Chat ID inválido. Use apenas números (ex: 123456789). Para grupos, use o ID negativo." };
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  }, 10_000);

  const result = await response.json();
  if (!response.ok || !result.ok) {
    const desc = result.description || `HTTP ${response.status}`;

    // Provide user-friendly error messages for common issues
    if (desc.includes("chat not found") || desc.includes("chat_id")) {
      return { ok: false, error: "Chat não encontrado. Certifique-se de: 1) Enviar /start para o bot no Telegram, 2) Usar o chat_id correto (números apenas, sem @)." };
    }
    if (desc.includes("bot was blocked") || desc.includes("deactivated")) {
      return { ok: false, error: "O bot foi bloqueado pelo usuário. Desbloqueie o bot no Telegram e tente novamente." };
    }
    if (desc.includes("Not Found") || desc.includes("Unauthorized") || desc.includes("token")) {
      return { ok: false, error: "Token do bot inválido. Verifique o token no @BotFather do Telegram." };
    }
    if (desc.includes("can't parse")) {
      // Retry without Markdown formatting
      const retryRes = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message.replace(/[*_`\[\]]/g, "") }),
      }, 10_000);
      const retryResult = await retryRes.json();
      if (retryResult.ok) return { ok: true };
      return { ok: false, error: "Erro de formatação na mensagem. Tente novamente." };
    }

    return { ok: false, error: desc };
  }

  return { ok: true };
}
