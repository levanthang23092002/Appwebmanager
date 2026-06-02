import { TASK_STATUS_LABELS } from './taskStatus';
import { sendTelegramMessage } from './telegram';

type NotifyUser = {
  name: string;
  telegram?: string | null;
};

type NotifyTask = {
  title: string;
  status: string;
  rejectReason?: string | null;
};

function statusLabel(status: string) {
  return TASK_STATUS_LABELS[status] || status;
}

export async function notifyTaskUsers(
  recipients: NotifyUser[],
  message: string
) {
  await Promise.all(
    recipients.map((u) => sendTelegramMessage(u.telegram, message))
  );
}

export async function notifyTaskTransition(
  task: NotifyTask,
  assigner: NotifyUser,
  assignee: NotifyUser,
  event: string,
  extra?: string
) {
  const base = `📋 <b>${task.title}</b>\nTrạng thái: ${statusLabel(task.status)}`;
  const reasonLine = task.rejectReason
    ? `\nLý do: ${task.rejectReason}`
    : extra
      ? `\n${extra}`
      : '';

  const messages: { user: NotifyUser; text: string }[] = [];

  switch (event) {
    case 'created':
      messages.push({
        user: assignee,
        text: `${base}\n\n🔔 Bạn được giao việc mới từ <b>${assigner.name}</b>. Vui lòng nhận hoặc từ chối trên hệ thống.`,
      });
      break;
    case 'accepted':
      messages.push({
        user: assigner,
        text: `${base}\n\n✅ <b>${assignee.name}</b> đã nhận task.`,
      });
      break;
    case 'rejected_by_assignee':
      messages.push({
        user: assigner,
        text: `${base}${reasonLine}\n\n❌ <b>${assignee.name}</b> đã từ chối task.`,
      });
      break;
    case 'started':
      messages.push({
        user: assigner,
        text: `${base}\n\n▶️ <b>${assignee.name}</b> bắt đầu thực hiện.`,
      });
      break;
    case 'submitted':
      messages.push({
        user: assigner,
        text: `${base}\n\n📤 <b>${assignee.name}</b> đã nộp — chờ bạn review.`,
      });
      break;
    case 'approved':
      messages.push({
        user: assignee,
        text: `${base}\n\n🎉 <b>${assigner.name}</b> đã chấp nhận — task hoàn thành.`,
      });
      break;
    case 'rejected_review':
      messages.push({
        user: assignee,
        text: `${base}${reasonLine}\n\n↩️ <b>${assigner.name}</b> từ chối bản nộp — làm lại (Đang thực hiện).`,
      });
      break;
    default:
      return;
  }

  await Promise.all(
    messages.map((m) => sendTelegramMessage(m.user.telegram, m.text))
  );
}
