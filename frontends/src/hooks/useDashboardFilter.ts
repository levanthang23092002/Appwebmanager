import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import { downloadCsv } from '../lib/downloadCsv';
import { TASK_STATUS } from '../lib/taskMaps';
import type { CostRecord, TaskItem } from '../lib/types';
import { useServerEvents } from './useServerEvents';

interface DashboardExportActivity {
  actor: string;
  text: string;
  detail: string;
  createdAt: string;
}

interface AffiliateRecord {
  id: number;
  amount: number;
  date?: string;
}

const mockDataSets: Record<string, { mult: number; label: string; xAxis: string[] }> = {
  day: {
    mult: 0.05,
    label: ' so với hôm qua',
    xAxis: ['0h', '4h', '8h', '12h', '16h', '20h'],
  },
  yesterday: {
    mult: 0.045,
    label: ' so với hôm kia',
    xAxis: ['0h', '4h', '8h', '12h', '16h', '20h'],
  },
  week: {
    mult: 0.25,
    label: ' so với tuần trước',
    xAxis: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
  },
  month: {
    mult: 1,
    label: ' so với tháng trước',
    xAxis: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
  },
  year: {
    mult: 12.5,
    label: ' so với năm trước',
    xAxis: ['Q1', 'Q2', 'Q3', 'Q4'],
  },
  custom: {
    mult: 0.6,
    label: ' so với chu kỳ tùy chỉnh',
    xAxis: ['M1', 'M2', 'M3', 'M4'],
  },
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function formatCostAmount(amount: number) {
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatExportDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFilterLabel(filter: string) {
  if (filter === 'day') return 'Hôm nay';
  if (filter === 'yesterday') return 'Hôm qua';
  if (filter === 'week') return 'Tuần này';
  if (filter === 'year') return 'Năm nay';
  if (filter === 'custom') return 'Tùy chỉnh';
  return 'Tháng này';
}

function formatTrendExport(trend: { positive: boolean; value: string }) {
  return `${trend.positive ? '+' : '-'}${trend.value}%`;
}

function costStatusText(cost: CostRecord) {
  if (cost.approved) return 'Đã duyệt';
  if (cost.canceled) return 'Đã hủy';
  return 'Chờ duyệt';
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

/** Kỳ đầy đủ cho tiến độ công việc (vd. cả tháng, không cắt đến hôm nay). */
function getTaskProgressRanges(filter: string) {
  const now = new Date();

  if (filter === 'day') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (filter === 'yesterday') {
    const day = addDays(now, -1);
    return { start: startOfDay(day), end: endOfDay(day) };
  }

  if (filter === 'week') {
    return { start: startOfWeek(now), end: endOfWeek(now) };
  }

  if (filter === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: endOfMonth(now),
  };
}

function getPeriodRanges(filter: string) {
  const now = new Date();
  const config = mockDataSets[filter] || mockDataSets.month;

  if (filter === 'day') {
    const start = startOfDay(now);
    const end = endOfDay(now);
    const prevEnd = endOfDay(addDays(now, -1));
    const prevStart = startOfDay(addDays(now, -1));
    return { start, end, prevStart, prevEnd, labelSuffix: config.label, xAxis: config.xAxis };
  }

  if (filter === 'yesterday') {
    const start = startOfDay(addDays(now, -1));
    const end = endOfDay(addDays(now, -1));
    const prevStart = startOfDay(addDays(now, -2));
    const prevEnd = endOfDay(addDays(now, -2));
    return { start, end, prevStart, prevEnd, labelSuffix: config.label, xAxis: config.xAxis };
  }

  if (filter === 'week') {
    const start = startOfWeek(now);
    const end = endOfDay(now);
    const prevEnd = endOfDay(addDays(start, -1));
    const prevStart = startOfWeek(addDays(start, -1));
    return { start, end, prevStart, prevEnd, labelSuffix: config.label, xAxis: config.xAxis };
  }

  if (filter === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = endOfDay(now);
    const prevStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { start, end, prevStart, prevEnd, labelSuffix: config.label, xAxis: config.xAxis };
  }

  if (filter === 'custom') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endOfDay(now);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, prevStart, prevEnd, labelSuffix: config.label, xAxis: config.xAxis };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endOfDay(now);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { start, end, prevStart, prevEnd, labelSuffix: config.label, xAxis: config.xAxis };
}

function sumCostsInRange(costs: CostRecord[], start: Date, end: Date) {
  return costs.reduce((sum, cost) => {
    if (cost.canceled || !cost.approved) return sum;
    const createdAt = cost.createdAt ? new Date(cost.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return sum;
    if (createdAt < start || createdAt > end) return sum;
    return sum + cost.amount;
  }, 0);
}

function sumRevenueInRange(rows: AffiliateRecord[], start: Date, end: Date) {
  return rows.reduce((sum, row) => {
    const txDate = row.date ? new Date(row.date) : null;
    if (!txDate || Number.isNaN(txDate.getTime())) return sum;
    if (txDate < start || txDate > end) return sum;
    return sum + row.amount;
  }, 0);
}

function calcTrend(current: number, previous: number) {
  if (previous <= 0) {
    return { positive: current >= 0, value: current > 0 ? '100.0' : '0.0' };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    positive: pct >= 0,
    value: Math.abs(pct).toFixed(1),
  };
}

function parseDeadline(deadline?: string | null) {
  if (!deadline) return null;
  const datePart = deadline.split('T')[0];
  const d = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isDeadlineInRange(deadline: string | null | undefined, start: Date, end: Date) {
  const d = parseDeadline(deadline);
  if (!d) return false;
  const day = startOfDay(d);
  return day >= startOfDay(start) && day <= startOfDay(end);
}

function calcTaskProgress(tasks: TaskItem[], filter: string) {
  const { start, end } = getTaskProgressRanges(filter);
  const inPeriod = tasks.filter((t) => isDeadlineInRange(t.deadline, start, end));
  const total = inPeriod.length;
  const done = inPeriod.filter((t) => String(t.status) === TASK_STATUS.DONE).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { pct, done, total };
}

async function loadDashboardTasks() {
  const { ok, data } = await apiFetch<TaskItem[]>('/api/tasks?scope=assigned');
  if (ok && Array.isArray(data)) return data;
  return [];
}

function computeStats(
  filter: string,
  costRows: CostRecord[],
  taskRows: TaskItem[],
  affiliateRows: AffiliateRecord[]
) {
  const ranges = getPeriodRanges(filter);
  const currentCosts = sumCostsInRange(costRows, ranges.start, ranges.end);
  const previousCosts = sumCostsInRange(costRows, ranges.prevStart, ranges.prevEnd);
  const currentRevenue = sumRevenueInRange(affiliateRows, ranges.start, ranges.end);
  const previousRevenue = sumRevenueInRange(affiliateRows, ranges.prevStart, ranges.prevEnd);
  const currentProfit = currentRevenue - currentCosts;
  const previousProfit = previousRevenue - previousCosts;
  const taskProgress = calcTaskProgress(taskRows, filter);

  return {
    revenue: formatCostAmount(currentRevenue),
    costs: formatCostAmount(currentCosts),
    profit: formatCostAmount(currentProfit),
    progressPct: `${taskProgress.pct}%`,
    taskDone: taskProgress.done,
    taskTotal: taskProgress.total,
    labelSuffix: ranges.labelSuffix,
    xAxis: ranges.xAxis,
    progress: taskProgress.pct,
    revenueTrend: calcTrend(currentRevenue, previousRevenue),
    costTrend: calcTrend(currentCosts, previousCosts),
    profitTrend: calcTrend(currentProfit, previousProfit),
  };
}

export function useDashboardFilter(options?: { onRealtime?: () => void }) {
  const { token, loading: authLoading } = useAuth();
  const location = useLocation();
  const onRealtimeRef = useRef(options?.onRealtime);
  onRealtimeRef.current = options?.onRealtime;
  const [filter, setFilter] = useState('month');
  const [showCustom, setShowCustom] = useState(false);
  const [sseReady, setSseReady] = useState(false);
  const [barHeights, setBarHeights] = useState([60, 40, 80, 50, 40, 30, 90, 65, 70, 45, 100, 60]);
  const [costRows, setCostRows] = useState<CostRecord[]>([]);
  const [taskRows, setTaskRows] = useState<TaskItem[]>([]);
  const [affiliateRows, setAffiliateRows] = useState<AffiliateRecord[]>([]);

  const loadDashboardData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      const [costs, tasks, affiliates] = await Promise.all([
        apiFetch<CostRecord[]>('/api/costs'),
        loadDashboardTasks(),
        apiFetch<AffiliateRecord[]>('/api/affiliates'),
      ]);
      if (costs.ok && Array.isArray(costs.data)) setCostRows(costs.data);
      else if (!silent) setCostRows([]);
      setTaskRows(Array.isArray(tasks) ? tasks : []);
      if (affiliates.ok && Array.isArray(affiliates.data)) setAffiliateRows(affiliates.data);
      else if (!silent) setAffiliateRows([]);
    } catch {
      if (!silent) {
        setCostRows([]);
        setTaskRows([]);
        setAffiliateRows([]);
      }
    } finally {
      setSseReady(true);
    }
  }, []);

  const loadRef = useRef(loadDashboardData);
  loadRef.current = loadDashboardData;

  useEffect(() => {
    if (authLoading || !token) return;
    setSseReady(false);
    void loadDashboardData();
  }, [authLoading, token, loadDashboardData, location.key]);

  const refreshAll = useCallback(() => {
    void loadRef.current({ silent: true });
    onRealtimeRef.current?.();
  }, []);

  useServerEvents({
    token: sseReady ? token : null,
    path: '/api/tasks/events',
    eventName: 'tasks',
    pollMs: 0,
    onEvent: refreshAll,
  });

  useServerEvents({
    token: sseReady ? token : null,
    path: '/api/costs/events',
    eventName: 'costs',
    pollMs: 0,
    onEvent: refreshAll,
  });

  useEffect(() => {
    setBarHeights(Array.from({ length: 12 }, () => Math.random() * 70 + 20));
  }, [filter]);

  const stats = useMemo(
    () => computeStats(filter, costRows, taskRows, affiliateRows),
    [filter, costRows, taskRows, affiliateRows]
  );

  const trends = useMemo(
    () => [stats.revenueTrend, stats.costTrend, stats.profitTrend],
    [stats.revenueTrend, stats.costTrend, stats.profitTrend]
  );

  const onFilterChange = (val: string) => {
    setFilter(val);
    if (val === 'custom') {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
  };

  const applyCustom = () => {
    setFilter('custom');
    setShowCustom(true);
  };

  const costLabel = useMemo(() => {
    if (filter === 'day') return 'Chi phí hôm nay';
    if (filter === 'yesterday') return 'Chi phí hôm qua';
    if (filter === 'week') return 'Chi phí tuần này';
    if (filter === 'year') return 'Chi phí năm nay';
    if (filter === 'custom') return 'Chi phí (tùy chỉnh)';
    return 'Chi phí tháng';
  }, [filter]);

  const revenueLabel = useMemo(() => {
    if (filter === 'day') return 'Doanh thu hôm nay';
    if (filter === 'yesterday') return 'Doanh thu hôm qua';
    if (filter === 'week') return 'Doanh thu tuần này';
    if (filter === 'year') return 'Doanh thu năm nay';
    if (filter === 'custom') return 'Doanh thu (tùy chỉnh)';
    return 'Doanh thu tháng';
  }, [filter]);

  const exportReport = useCallback(
    (activities: DashboardExportActivity[] = []) => {
      const ranges = getPeriodRanges(filter);
      const currentCosts = sumCostsInRange(costRows, ranges.start, ranges.end);
      const currentRevenue = sumRevenueInRange(affiliateRows, ranges.start, ranges.end);
      const currentProfit = currentRevenue - currentCosts;
      const taskProgress = calcTaskProgress(taskRows, filter);

      const periodCosts = costRows.filter((cost) => {
        if (cost.canceled || !cost.approved) return false;
        const createdAt = cost.createdAt ? new Date(cost.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
        return createdAt >= ranges.start && createdAt <= ranges.end;
      });

      const periodRevenue = affiliateRows.filter((row) => {
        const txDate = row.date ? new Date(row.date) : null;
        if (!txDate || Number.isNaN(txDate.getTime())) return false;
        return txDate >= ranges.start && txDate <= ranges.end;
      });

      const rows: (string | number)[][] = [
        ['BÁO CÁO TỔNG QUAN DOANH NGHIỆP'],
        [],
        ['Kỳ báo cáo', getFilterLabel(filter)],
        ['Từ ngày', toInputDate(ranges.start)],
        ['Đến ngày', toInputDate(ranges.end)],
        [],
        ['TÓM TẮT'],
        ['Chỉ số', 'Giá trị (₫)', 'Xu hướng'],
        [revenueLabel, currentRevenue, formatTrendExport(stats.revenueTrend)],
        [costLabel, currentCosts, formatTrendExport(stats.costTrend)],
        ['Lợi nhuận ròng', currentProfit, formatTrendExport(stats.profitTrend)],
        [],
        ['TIẾN ĐỘ CÔNG VIỆC'],
        ['Hoàn thành', 'Tổng số', 'Tỷ lệ (%)'],
        [taskProgress.done, taskProgress.total, taskProgress.pct],
      ];

      rows.push([], ['CHI PHÍ TRONG KỲ'], ['Loại chi phí', 'Số tiền', 'Người thêm', 'Trạng thái', 'Ngày tạo', 'Mô tả']);
      if (periodCosts.length === 0) {
        rows.push(['Không có chi phí trong kỳ']);
      } else {
        periodCosts.forEach((cost) => {
          rows.push([
            cost.type,
            cost.amount,
            cost.creator?.name || (cost.userId ? `#${cost.userId}` : '—'),
            costStatusText(cost),
            formatExportDateTime(cost.createdAt),
            cost.description?.trim() || '',
          ]);
        });
      }

      rows.push([], ['DOANH THU AFFILIATE TRONG KỲ'], ['Số tiền', 'Ngày']);
      if (periodRevenue.length === 0) {
        rows.push(['Không có doanh thu trong kỳ']);
      } else {
        periodRevenue.forEach((row) => {
          rows.push([row.amount, row.date ? formatExportDateTime(row.date) : '']);
        });
      }

      if (activities.length > 0) {
        rows.push([], ['HOẠT ĐỘNG GẦN ĐÂY'], ['Thời gian', 'Người thực hiện', 'Nội dung', 'Chi tiết']);
        activities.forEach((item) => {
          rows.push([
            formatExportDateTime(item.createdAt),
            item.actor,
            item.text.trim(),
            item.detail.trim(),
          ]);
        });
      }

      const filename = `bao-cao-tong-quan_${toInputDate(ranges.start)}_${toInputDate(ranges.end)}.csv`;
      downloadCsv(filename, rows[0].map(String), rows.slice(1));
    },
    [affiliateRows, costLabel, costRows, filter, revenueLabel, stats, taskRows]
  );

  return {
    filter,
    showCustom,
    stats,
    costLabel,
    revenueLabel,
    progress: stats.progress,
    barHeights,
    trends,
    onFilterChange,
    applyCustom,
    exportReport,
  };
}
