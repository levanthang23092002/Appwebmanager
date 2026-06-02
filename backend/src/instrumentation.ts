export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { ensureTelegramWebhookOnStartup } = await import('./lib/telegramLink');
  await ensureTelegramWebhookOnStartup();
}
