export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram API error: ${response.status}`);
  }

  return result;
}
