import { randomBytes } from 'crypto';
import { handleCostTelegramCallback } from './costNotify';
import { prisma } from './prisma';
import { sendTelegramMessage } from './telegram';

const LINK_PREFIX = 'link_';
const EXPIRE_MINUTES = 15;

const globalTelegram = global as unknown as {
  lastTelegramUpdateId?: number;
  webhookConfigured?: boolean;
  devPollingReady?: boolean;
  telegramInboxBusy?: boolean;
  telegramConflictUntil?: number;
};

export type TelegramUpdate = {
  update_id?: number;
  message?: { text?: string; chat?: { id: number } };
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id?: number; chat?: { id: number } };
  };
};

function getWebhookUrl(): string | null {
  const explicit = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (explicit) return explicit;

  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) return null;
  return `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
}

export function useWebhookMode(): boolean {
  return !!getWebhookUrl();
}

function getLastUpdateId(): number {
  return globalTelegram.lastTelegramUpdateId ?? 0;
}

function setLastUpdateId(id: number) {
  globalTelegram.lastTelegramUpdateId = id;
}

/** Đăng ký webhook với Telegram — gọi 1 lần khi server khởi động. */
export async function ensureTelegramWebhookOnStartup(): Promise<void> {
  if (globalTelegram.webhookConfigured) return;

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const webhookUrl = getWebhookUrl();
  if (!botToken) return;

  if (!webhookUrl) {
    console.warn(
      '[Telegram] Chưa cấu hình TELEGRAM_WEBHOOK_URL / APP_URL — duyệt chi phí trên Telegram cần URL công khai (vd. ngrok).'
    );
    return;
  }

  try {
    const body: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
    };
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (secret) body.secret_token = secret;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) {
      console.warn('[Telegram] setWebhook failed:', data.description);
      return;
    }
    globalTelegram.webhookConfigured = true;
    console.info('[Telegram] Webhook đã đăng ký:', webhookUrl);
  } catch (err) {
    console.warn('[Telegram] setWebhook error:', err);
  }
}

/** Dev không có webhook: xóa webhook 1 lần để getUpdates phục vụ liên kết bot. */
async function ensureDevTelegramPolling(): Promise<void> {
  if (useWebhookMode() || globalTelegram.devPollingReady) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    globalTelegram.devPollingReady = true;
  } catch {
    /* bỏ qua */
  }
}

/** Xử lý 1 update từ Telegram (webhook hoặc getUpdates). */
export async function dispatchTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.update_id != null) {
    setLastUpdateId(Math.max(getLastUpdateId(), update.update_id));
  }

  const text = update.message?.text;
  const chatId = update.message?.chat?.id;
  if (text && chatId != null) {
    await handleTelegramLinkMessage(text, chatId);
  }

  const callback = update.callback_query;
  if (callback) {
    await handleCostTelegramCallback({
      id: callback.id,
      data: callback.data,
      chatId: callback.message?.chat?.id,
      messageId: callback.message?.message_id,
    });
  }
}

export async function getBotUsername(): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
    return data.ok ? data.result?.username ?? null : null;
  } catch {
    return null;
  }
}

export async function createTelegramLinkSession(userId: number) {
  if (!useWebhookMode()) {
    await ensureDevTelegramPolling();
  }

  const username = await getBotUsername();
  if (!username) {
    throw new Error('BOT_NOT_CONFIGURED');
  }

  const token = randomBytes(8).toString('hex');
  const expiresAt = new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000);

  await prisma.telegramLinkPending.deleteMany({ where: { userId } });
  await prisma.telegramLinkPending.create({
    data: { token, userId, expiresAt },
  });

  const startPayload = `${LINK_PREFIX}${token}`;
  return {
    botUsername: username,
    botUrl: `https://t.me/${username}?start=${startPayload}`,
    expiresAt,
  };
}

async function completeLink(token: string, chatId: string): Promise<boolean> {
  const pending = await prisma.telegramLinkPending.findUnique({
    where: { token },
  });
  if (!pending || pending.expiresAt < new Date()) {
    if (pending) {
      await prisma.telegramLinkPending.delete({ where: { token } }).catch(() => {});
    }
    return false;
  }

  const chatIdStr = String(chatId);

  await prisma.user.update({
    where: { id: pending.userId },
    data: { telegram: chatIdStr },
  });
  await prisma.telegramLinkPending.delete({ where: { token } });

  await sendTelegramMessage(
    chatIdStr,
    '✅ <b>Eagle Rise</b>\nĐã liên kết Telegram. Bạn sẽ nhận thông báo khi có task mới.'
  );
  return true;
}

function extractLinkToken(text: string): string | null {
  const m = text.trim().match(new RegExp(`^/start(?:@\\w+)?\\s+${LINK_PREFIX}([a-f0-9]+)`, 'i'));
  return m?.[1] ?? null;
}

function isPlainStart(text: string): boolean {
  return /^\/start(?:@\w+)?\s*$/i.test(text.trim());
}

async function completePlainStart(chatId: string): Promise<boolean> {
  const pendings = await prisma.telegramLinkPending.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  if (pendings.length === 0) {
    await sendTelegramMessage(
      chatId,
      '👋 Mở app <b>Eagle Rise</b> → <b>Liên kết Telegram</b> → mở bot từ link trong app → bấm <b>Start</b>.'
    );
    return false;
  }

  if (pendings.length > 1) {
    await sendTelegramMessage(
      chatId,
      '⚠️ Có nhiều người đang liên kết. Vui lòng mở bot từ <b>link trong app</b> (nút Liên kết Telegram), không mở bot trực tiếp.'
    );
    return false;
  }

  return completeLink(pendings[0].token, chatId);
}

export async function handleTelegramLinkMessage(text: string, chatId: number | string) {
  const id = String(chatId);
  const token = extractLinkToken(text);
  if (token) return completeLink(token, id);
  if (isPlainStart(text)) return completePlainStart(id);
  return false;
}

/**
 * Dev không có webhook: gọi getUpdates 1 lần khi user đang liên kết bot (telegram-sync).
 * Không chạy nền — tránh tải server.
 */
export async function processTelegramInbox(): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken || useWebhookMode()) return;

  const now = Date.now();
  if (globalTelegram.telegramConflictUntil && now < globalTelegram.telegramConflictUntil) {
    return;
  }
  if (globalTelegram.telegramInboxBusy) return;
  globalTelegram.telegramInboxBusy = true;

  try {
    await ensureDevTelegramPolling();

    const url = new URL(`https://api.telegram.org/bot${botToken}/getUpdates`);
    url.searchParams.set('timeout', '0');
    url.searchParams.set('allowed_updates', JSON.stringify(['message', 'callback_query']));
    const lastId = getLastUpdateId();
    if (lastId > 0) {
      url.searchParams.set('offset', String(lastId + 1));
    }

    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      ok?: boolean;
      result?: TelegramUpdate[];
      description?: string;
    };

    if (!data.ok) {
      if (data.description?.includes('Conflict')) {
        globalTelegram.telegramConflictUntil = Date.now() + 60_000;
        console.warn('[Telegram] getUpdates conflict — đang dùng webhook ở nơi khác?');
      } else if (data.description) {
        console.warn('[Telegram] getUpdates:', data.description);
      }
      return;
    }

    globalTelegram.telegramConflictUntil = undefined;
    if (!data.result?.length) return;

    for (const update of data.result) {
      await dispatchTelegramUpdate(update);
    }
  } finally {
    globalTelegram.telegramInboxBusy = false;
  }
}

export async function getTelegramLinkStatus(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegram: true },
  });
  const telegram = user?.telegram?.trim() || null;
  const pending = await prisma.telegramLinkPending.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { token: true, expiresAt: true },
  });
  return {
    linked: !!telegram,
    telegram,
    pending: !!pending,
  };
}

/** @deprecated dùng processTelegramInbox */
export async function pollTelegramLinkUpdates(): Promise<void> {
  return processTelegramInbox();
}
