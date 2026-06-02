import { prisma } from './prisma';
import { emitCostEvent } from './costEvents';
import {
  answerTelegramCallback,
  editTelegramMessageText,
  sendTelegramMessage,
  type TelegramReplyMarkup,
} from './telegram';

const COST_APPROVE_PREFIX = 'cost_approve:';
const COST_CANCEL_PREFIX = 'cost_cancel:';

type CostForNotify = {
  id: number;
  type: string;
  amount: number;
  description?: string | null;
  approved: boolean;
  canceled?: boolean;
  creator?: { name: string; telegram?: string | null } | null;
  user?: { name: string } | null;
  canceller?: { name: string } | null;
};

type CostCallbackPayload = {
  id: string;
  data?: string;
  chatId?: number;
  messageId?: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount: number) {
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
}

function costMessage(cost: CostForNotify, statusLine: string) {
  const creatorName = escapeHtml(cost.creator?.name || 'Không rõ');
  const description = cost.description?.trim()
    ? `\nMô tả: ${escapeHtml(cost.description.trim())}`
    : '';

  return [
    '💸 <b>Duyệt chi phí mới</b>',
    `Loại: <b>${escapeHtml(cost.type)}</b>`,
    `Số tiền: <b>${formatMoney(cost.amount)}</b>`,
    `Người thêm: <b>${creatorName}</b>${description}`,
    '',
    statusLine,
  ].join('\n');
}

function approveMarkup(costId: number): TelegramReplyMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Duyệt chi phí', callback_data: `${COST_APPROVE_PREFIX}${costId}` },
        { text: '❌ Hủy', callback_data: `${COST_CANCEL_PREFIX}${costId}` },
      ],
    ],
  };
}

export async function notifyCostCreatedToAdmins(cost: CostForNotify) {
  if (cost.approved) return;

  const admins = await prisma.user.findMany({
    where: {
      role: 'admin',
      telegram: { not: null },
    },
    select: { telegram: true },
  });

  await Promise.all(
    admins.map((admin) =>
      sendTelegramMessage(
        admin.telegram,
        costMessage(cost, 'Trạng thái: <b>Chờ admin duyệt</b>'),
        { replyMarkup: approveMarkup(cost.id) }
      )
    )
  );
}

function editCostMessage(
  chatId: number,
  messageId: number,
  cost: CostForNotify,
  statusLine: string
) {
  return editTelegramMessageText(chatId, messageId, costMessage(cost, statusLine), {
    removeKeyboard: true,
  });
}

export async function handleCostTelegramCallback(payload: CostCallbackPayload) {
  try {
    return await handleCostTelegramCallbackInner(payload);
  } catch (error) {
    console.error('handleCostTelegramCallback error:', error);
    await answerTelegramCallback(payload.id, 'Có lỗi xảy ra, vui lòng thử lại', true);
    return true;
  }
}

async function handleCostTelegramCallbackInner(payload: CostCallbackPayload) {
  const data = payload.data || '';
  const isApprove = data.startsWith(COST_APPROVE_PREFIX);
  const isCancel = data.startsWith(COST_CANCEL_PREFIX);
  if (!isApprove && !isCancel) return false;

  const costId = parseInt(
    data.slice(isApprove ? COST_APPROVE_PREFIX.length : COST_CANCEL_PREFIX.length),
    10
  );
  if (!payload.chatId || Number.isNaN(costId)) {
    await answerTelegramCallback(payload.id, 'Dữ liệu duyệt không hợp lệ', true);
    return true;
  }

  const admin = await prisma.user.findFirst({
    where: { role: 'admin', telegram: String(payload.chatId) },
    select: { id: true, name: true },
  });
  if (!admin) {
    await answerTelegramCallback(payload.id, 'Chỉ admin đã liên kết Telegram mới được duyệt', true);
    return true;
  }

  const cost = await prisma.cost.findUnique({
    where: { id: costId },
    include: {
      creator: { select: { name: true, telegram: true } },
      user: { select: { name: true } },
      canceller: { select: { name: true } },
    },
  });
  if (!cost) {
    await answerTelegramCallback(payload.id, 'Chi phí không tồn tại', true);
    return true;
  }
  if (cost.approved) {
    await answerTelegramCallback(payload.id, 'Chi phí này đã được duyệt');
    if (payload.messageId) {
      await editCostMessage(
        payload.chatId,
        payload.messageId,
        cost,
        `Trạng thái: <b>Đã duyệt</b>${cost.user ? ` bởi <b>${escapeHtml(cost.user.name)}</b>` : ''}`
      );
    }
    return true;
  }
  if (cost.canceled) {
    await answerTelegramCallback(payload.id, 'Chi phí này đã bị hủy');
    if (payload.messageId) {
      await editCostMessage(
        payload.chatId,
        payload.messageId,
        cost,
        `Trạng thái: <b>Đã hủy</b>${cost.canceller ? ` bởi <b>${escapeHtml(cost.canceller.name)}</b>` : ''}`
      );
    }
    return true;
  }

  if (isCancel) {
    const canceled = await prisma.cost.update({
      where: { id: costId },
      data: {
        canceled: true,
        canceledAt: new Date(),
        cancellerId: admin.id,
      },
      include: {
        creator: { select: { name: true, telegram: true } },
        user: { select: { name: true } },
        canceller: { select: { name: true } },
      },
    });
    await answerTelegramCallback(payload.id, 'Đã hủy chi phí');
    if (payload.messageId) {
      await editCostMessage(
        payload.chatId,
        payload.messageId,
        canceled,
        `Trạng thái: <b>Đã hủy</b> bởi <b>${escapeHtml(admin.name)}</b>`
      );
    }
    await sendTelegramMessage(
      canceled.creator?.telegram,
      `❌ Chi phí <b>${escapeHtml(canceled.type)}</b> (${formatMoney(canceled.amount)}) đã bị admin <b>${escapeHtml(admin.name)}</b> hủy.`
    );
    emitCostEvent({ action: 'canceled', id: canceled.id });
    return true;
  }

  const updated = await prisma.cost.update({
    where: { id: costId },
    data: {
      approved: true,
      approvedAt: new Date(),
      approverId: admin.id,
    },
    include: {
      creator: { select: { name: true, telegram: true } },
      user: { select: { name: true } },
      canceller: { select: { name: true } },
    },
  });

  await answerTelegramCallback(payload.id, 'Đã duyệt chi phí');
  if (payload.messageId) {
    await editCostMessage(
      payload.chatId,
      payload.messageId,
      updated,
      `Trạng thái: <b>Đã duyệt</b> bởi <b>${escapeHtml(admin.name)}</b>`
    );
  }
  await sendTelegramMessage(
    updated.creator?.telegram,
    `✅ Chi phí <b>${escapeHtml(updated.type)}</b> (${formatMoney(updated.amount)}) đã được admin <b>${escapeHtml(admin.name)}</b> duyệt.`
  );
  emitCostEvent({ action: 'approved', id: updated.id });

  return true;
}
