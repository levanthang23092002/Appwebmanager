import { prisma } from './prisma';
import { sendTelegramMessage } from './telegram';

type RevenueForNotify = {
  id: number;
  amount: number;
  orderCount?: number | null;
  currency: string;
  revenueDate: Date;
  source: string;
  storeDomain?: string | null;
  note?: string | null;
  network: { name: string };
  account: { name: string; owner: { name: string; telegram?: string | null } };
  createdBy: { name: string };
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount: number, currency: string) {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ${currency}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('vi-VN');
}

function manualRevenueMessage(revenue: RevenueForNotify) {
  const storeLine = revenue.storeDomain?.trim()
    ? escapeHtml(revenue.storeDomain.trim())
    : 'Không chỉ định';
  const orderLine =
    revenue.orderCount != null && revenue.orderCount > 0
      ? `Số lượng order: <b>${revenue.orderCount}</b>\n`
      : '';
  const avgLine =
    revenue.orderCount != null && revenue.orderCount > 0
      ? ` (~${formatMoney(revenue.amount / revenue.orderCount, revenue.currency)}/đơn)`
      : '';
  const noteLine = revenue.note?.trim()
    ? `\nGhi chú: ${escapeHtml(revenue.note.trim())}`
    : '';

  return [
    '💰 <b>Doanh thu mới (nhập tay)</b>',
    `Nhân viên: <b>${escapeHtml(revenue.createdBy.name)}</b>`,
    `Network: <b>${escapeHtml(revenue.network.name)}</b>`,
    `Account: <b>${escapeHtml(revenue.account.name)}</b>`,
    `Cửa hàng: ${storeLine}`,
    orderLine + `Số tiền: <b>${formatMoney(revenue.amount, revenue.currency)}</b>${avgLine}`,
    `Ngày: ${formatDate(revenue.revenueDate)}${noteLine}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function adminTelegramIds() {
  const admins = await prisma.user.findMany({
    where: { role: 'admin', telegram: { not: null } },
    select: { telegram: true },
  });
  return [...new Set(admins.map((a) => a.telegram!.trim()).filter(Boolean))];
}

/** Nhập tay: chỉ báo admin. Tự động (phase 2): admin + owner. */
export async function notifyAffiliateRevenueCreated(revenue: RevenueForNotify) {
  const isManual = revenue.source === 'MANUAL';
  const chatIds = new Set<string>();

  if (isManual) {
    for (const id of await adminTelegramIds()) chatIds.add(id);
  } else {
    for (const id of await adminTelegramIds()) chatIds.add(id);
    const ownerTg = revenue.account.owner.telegram?.trim();
    if (ownerTg) chatIds.add(ownerTg);
  }

  const text = isManual
    ? manualRevenueMessage(revenue)
    : manualRevenueMessage(revenue).replace('(nhập tay)', '(tự động)');

  await Promise.all(
    [...chatIds].map((chatId) => sendTelegramMessage(chatId, text))
  );
}
