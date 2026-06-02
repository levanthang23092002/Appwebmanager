/**
 * Gửi tin qua Telegram Bot API.
 * User.telegram lưu chat_id (số) hoặc @username — chỉ gửi khi có giá trị.
 */
export type TelegramReplyMarkup = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

export async function sendTelegramMessage(
  telegramId: string | null | undefined,
  text: string,
  options?: { replyMarkup?: TelegramReplyMarkup }
): Promise<boolean> {
  const chatId = telegramId?.trim();
  if (!chatId) return false;

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN chưa cấu hình — bỏ qua thông báo');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.startsWith('@') ? chatId : chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.error('Telegram send failed:', data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Telegram error:', err);
    return false;
  }
}

export async function answerTelegramCallback(
  callbackQueryId: string,
  text: string,
  showAlert = false
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.error('Telegram callback answer failed:', data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Telegram callback answer error:', err);
    return false;
  }
}

export async function editTelegramMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options?: { replyMarkup?: TelegramReplyMarkup; removeKeyboard?: boolean }
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;

  const replyMarkup = options?.removeKeyboard
    ? { inline_keyboard: [] }
    : options?.replyMarkup;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.error('Telegram edit failed:', data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Telegram edit error:', err);
    return false;
  }
}
