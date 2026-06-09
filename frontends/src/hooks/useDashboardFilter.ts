import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  convertAmount,
  formatMoney,
  normalizeCurrency,
  normalizeUsdVndRate,
  type CurrencyCode,
} from '../lib/currency';
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
  currency?: string;
  usdVndRate?: number;
  date?: string;
}

interface DashboardSummary {
  revenue: number;
  costs: number;
  profit: number;
  labelSuffix: string;
  revenueTrend: { positive: boolean; value: string };
  costTrend: { positive: boolean; value: string };
  profitTrend: { positive: boolean; value: string };
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

function formatDisplayAmount(amount: number, display: CurrencyCode) {
  return formatMoney(amount, display);
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

function sumCostsInRange(
  costs: CostRecord[],
  start: Date,
  end: Date,
  display: CurrencyCode
) {
  return costs.reduce((sum, cost) => {
    if (cost.canceled || !cost.approved) return sum;
    const createdAt = cost.createdAt ? new Date(cost.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return sum;
    if (createdAt < start || createdAt > end) return sum;
    return (
      sum +
      convertAmount(
        cost.amount,
        normalizeCurrency(cost.currency, 'VND'),
        normalizeUsdVndRate(cost.usdVndRate),
        display
      )
    );
  }, 0);
}

function sumRevenueInRange(
  rows: AffiliateRecord[],
  start: Date,
  end: Date,
  display: CurrencyCode
) {
  return rows.reduce((sum, row) => {
    const txDate = row.date ? new Date(row.date) : null;
    if (!txDate || Number.isNaN(txDate.getTime())) return sum;
    if (txDate < start || txDate > end) return sum;
    return (
      sum +
      convertAmount(
        row.amount,
        normalizeCurrency(row.currency, 'USD'),
        normalizeUsdVndRate(row.usdVndRate),
        display
      )
    );
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
  const { ok, data } = await apiFetch<TaskItem[]>('/api/tasks?scope=assigned&lite=1');
  if (ok && Array.isArray(data)) return data;
  return [];
}

function buildStats(
  filter: string,
  summary: DashboardSummary,
  taskRows: TaskItem[],
  display: CurrencyCode
) {
  const config = mockDataSets[filter] || mockDataSets.month;
  const taskProgress = calcTaskProgress(taskRows, filter);

  return {
    revenue: formatDisplayAmount(summary.revenue, display),
    costs: formatDisplayAmount(summary.costs, display),
    profit: formatDisplayAmount(summary.profit, display),
    progressPct: `${taskProgress.pct}%`,
    taskDone: taskProgress.done,
    taskTotal: taskProgress.total,
    labelSuffix: summary.labelSuffix,
    xAxis: config.xAxis,
    progress: taskProgress.pct,
    revenueTrend: summary.revenueTrend,
    costTrend: summary.costTrend,
    profitTrend: summary.profitTrend,
  };
}

export function useDashboardFilter(options?: { onRealtime?: () => void }) {
  const { user, token, loading: authLoading } = useAuth();
  const location = useLocation();
  const onRealtimeRef = useRef(options?.onRealtime);
  onRealtimeRef.current = options?.onRealtime;
  const [filter, setFilter] = useState('month');
  const [showCustom, setShowCustom] = useState(false);
  const [sseReady, setSseReady] = useState(false);
  const [barHeights, setBarHeights] = useState([60, 40, 80, 50, 40, 30, 90, 65, 70, 45, 100, 60]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [taskRows, setTaskRows] = useState<TaskItem[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('USD');
  const filterRef = useRef(filter);
  const displayRef = useRef(displayCurrency);
  const loadedFilterDisplayRef = useRef({ filter, displayCurrency });
  filterRef.current = filter;
  displayRef.current = displayCurrency;

  const affiliateScope =
    user?.role === 'admin' || user?.role === 'manager' ? 'team' : 'mine';

  const loadSummary = useCallback(async () => {
    const { ok, data } = await apiFetch<DashboardSummary>(
      `/api/dashboard/summary?scope=${affiliateScope}&display=${displayRef.current}&filter=${filterRef.current}`
    );
    if (ok) setSummary(data);
  }, [affiliateScope]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [summaryRes, tasks] = await Promise.all([
        apiFetch<DashboardSummary>(
          `/api/dashboard/summary?scope=${affiliateScope}&display=${displayRef.current}&filter=${filterRef.current}`
        ),
        loadDashboardTasks(),
      ]);
      if (summaryRes.ok) setSummary(summaryRes.data);
      setTaskRows(Array.isArray(tasks) ? tasks : []);
      loadedFilterDisplayRef.current = {
        filter: filterRef.current,
        displayCurrency: displayRef.current,
      };
    } catch {
      setSummary(null);
      setTaskRows([]);
    } finally {
      setSseReady(true);
    }
  }, [affiliateScope]);

  const loadRef = useRef(loadDashboardData);
  loadRef.current = loadDashboardData;

  useEffect(() => {
    if (authLoading || !token) return;
    setSseReady(false);
    void loadDashboardData();
  }, [authLoading, token, loadDashboardData, location.key]);

  useEffect(() => {
    if (authLoading || !token || !sseReady) return;
    const loaded = loadedFilterDisplayRef.current;
    if (loaded.filter === filter && loaded.displayCurrency === displayCurrency) return;
    loadedFilterDisplayRef.current = { filter, displayCurrency };
    void loadSummary();
  }, [authLoading, filter, displayCurrency, loadSummary, sseReady, token]);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAll = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void loadRef.current();
      onRealtimeRef.current?.();
    }, 600);
  }, []);

  useEffect(
    () => () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    },
    []
  );

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

  const stats = useMemo(() => {
    if (!summary) {
      const config = mockDataSets[filter] || mockDataSets.month;
      return {
        revenue: '…',
        costs: '…',
        profit: '…',
        progressPct: '0%',
        taskDone: 0,
        taskTotal: 0,
        labelSuffix: config.label,
        xAxis: config.xAxis,
        progress: 0,
        revenueTrend: { positive: true, value: '0.0' },
        costTrend: { positive: true, value: '0.0' },
        profitTrend: { positive: true, value: '0.0' },
      };
    }
    return buildStats(filter, summary, taskRows, displayCurrency);
  }, [displayCurrency, filter, summary, taskRows]);

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
    async (activities: DashboardExportActivity[] = []) => {
      const [costsRes, affiliatesRes] = await Promise.all([
        apiFetch<CostRecord[]>('/api/costs'),
        apiFetch<AffiliateRecord[]>(`/api/affiliates?scope=${affiliateScope}`),
      ]);
      const costRows = costsRes.ok && Array.isArray(costsRes.data) ? costsRes.data : [];
      const affiliateRows =
        affiliatesRes.ok && Array.isArray(affiliatesRes.data) ? affiliatesRes.data : [];

      const ranges = getPeriodRanges(filter);
      const currentCosts = sumCostsInRange(costRows, ranges.start, ranges.end, displayCurrency);
      const currentRevenue = sumRevenueInRange(affiliateRows, ranges.start, ranges.end, displayCurrency);
      const currentProfit = currentRevenue - currentCosts;
      const currencyLabel = displayCurrency === 'USD' ? '$' : '₫';
      const taskProgress = calcTaskProgress(taskRows, filter);
      const exportStats = summary ?? {
        revenue: currentRevenue,
        costs: currentCosts,
        profit: currentProfit,
        revenueTrend: calcTrend(currentRevenue, 0),
        costTrend: calcTrend(currentCosts, 0),
        profitTrend: calcTrend(currentProfit, 0),
      };

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
        ['Chỉ số', `Giá trị (${currencyLabel})`, 'Xu hướng'],
        [revenueLabel, exportStats.revenue, formatTrendExport(exportStats.revenueTrend)],
        [costLabel, exportStats.costs, formatTrendExport(exportStats.costTrend)],
        ['Lợi nhuận ròng', exportStats.profit, formatTrendExport(exportStats.profitTrend)],
        [],
        ['TIẾN ĐỘ CÔNG VIỆC'],
        ['Hoàn thành', 'Tổng số', 'Tỷ lệ (%)'],
        [taskProgress.done, taskProgress.total, taskProgress.pct],
      ];

      rows.push(
        [],
        ['CHI PHÍ TRONG KỲ'],
        ['Loại chi phí', 'Số tiền gốc', 'Tiền tệ', 'Tỉ giá', `Quy đổi (${displayCurrency})`, 'Người thêm', 'Trạng thái', 'Ngày tạo', 'Mô tả']
      );
      if (periodCosts.length === 0) {
        rows.push(['Không có chi phí trong kỳ']);
      } else {
        periodCosts.forEach((cost) => {
          rows.push([
            cost.type,
            cost.amount,
            normalizeCurrency(cost.currency, 'VND'),
            normalizeUsdVndRate(cost.usdVndRate),
            convertAmount(
              cost.amount,
              normalizeCurrency(cost.currency, 'VND'),
              normalizeUsdVndRate(cost.usdVndRate),
              displayCurrency
            ),
            cost.creator?.name || (cost.userId ? `#${cost.userId}` : '—'),
            costStatusText(cost),
            formatExportDateTime(cost.createdAt),
            cost.description?.trim() || '',
          ]);
        });
      }

      rows.push(
        [],
        ['DOANH THU AFFILIATE TRONG KỲ'],
        ['Số tiền gốc', 'Tiền tệ', 'Tỉ giá', `Quy đổi (${displayCurrency})`, 'Ngày']
      );
      if (periodRevenue.length === 0) {
        rows.push(['Không có doanh thu trong kỳ']);
      } else {
        periodRevenue.forEach((row) => {
          rows.push([
            row.amount,
            normalizeCurrency(row.currency, 'USD'),
            normalizeUsdVndRate(row.usdVndRate),
            convertAmount(
              row.amount,
              normalizeCurrency(row.currency, 'USD'),
              normalizeUsdVndRate(row.usdVndRate),
              displayCurrency
            ),
            row.date ? formatExportDateTime(row.date) : '',
          ]);
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
    [affiliateScope, costLabel, displayCurrency, filter, revenueLabel, summary, taskRows]
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
    displayCurrency,
    setDisplayCurrency,
  };
}
