import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type ApexCharts from 'apexcharts';
import { apiFetch } from '../lib/api';
import { downloadCsv } from '../lib/downloadCsv';
import { useAuth } from '../lib/auth';
import { useServerEvents } from './useServerEvents';
import type { CostRecord } from '../lib/types';

export type CostTimeFilter = 'month' | 'lastMonth' | 'year' | 'custom';
type CostGroupMode = 'day' | 'month' | 'year';
type CostSplitStats = {
  total: number;
  totalCount: number;
  approved: number;
  approvedCount: number;
  pending: number;
  pendingCount: number;
};

export interface CostFormState {
  /** Giá trị select: một trong COST_TYPES hoặc COST_TYPE_CUSTOM */
  type: string;
  customType: string;
  amount: string;
  description: string;
  /** YYYY-MM-DD — mặc định hôm nay khi thêm mới */
  costDate: string;
}

export const COST_TYPE_CUSTOM = '__custom__';

export interface CostRow {
  id: number;
  type: string;
  amount: number;
  description?: string | null;
  approved: boolean;
  canceled: boolean;
  creatorId?: number | null;
  creatorName: string;
  approverName: string;
  cancellerName: string;
  createdAt?: string;
}

function createDefaultForm(): CostFormState {
  return {
    type: '',
    customType: '',
    amount: '',
    description: '',
    costDate: toInputDate(new Date()),
  };
}

const COST_CHART_COLORS = ['#ea4335', '#008373', '#8b5cf6', '#f59e0b', '#3b82f6', '#ef4444'];
export const COST_TYPES = ['Google Ads', 'Bing Ads', 'Tài nguyên'] as const;

function isPresetCostType(type: string) {
  return (COST_TYPES as readonly string[]).includes(type);
}

export function resolveCostFormType(form: CostFormState): string {
  if (form.type === COST_TYPE_CUSTOM) return form.customType.trim();
  return form.type.trim();
}

function toRow(cost: CostRecord): CostRow {
  return {
    id: cost.id,
    type: cost.type,
    amount: cost.amount,
    description: cost.description,
    approved: cost.approved,
    canceled: !!cost.canceled,
    creatorId: cost.userId ?? null,
    creatorName: cost.creator?.name || (cost.userId ? `#${cost.userId}` : '—'),
    approverName: cost.user?.name || '—',
    cancellerName: cost.canceller?.name || '—',
    createdAt: cost.createdAt,
  };
}

export function formatCostAmount(amount: number) {
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
}

function formatShortNumber(value: number) {
  return value.toLocaleString('vi-VN', {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  });
}

export function formatCompactCostAmount(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${formatShortNumber(amount / 1_000_000_000)} tỷ`;
  if (abs >= 1_000_000) return `${formatShortNumber(amount / 1_000_000)} tr`;
  return formatCostAmount(amount);
}

function formatAmountInput(value: string | number) {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function parseAmountInput(value: string) {
  return Number(value.replace(/\D/g, ''));
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromInputDate(value: string, endOfDay = false) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function thisMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: endOfDay(now),
  };
}

function lastMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
  };
}

function thisYearRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: endOfDay(now),
  };
}

function labelForDate(date: Date) {
  return `${date.getDate()} thg ${date.getMonth() + 1}`;
}

function labelForMonth(date: Date) {
  return `Th${date.getMonth() + 1}/${date.getFullYear()}`;
}

function rangeLabel(start: Date, end: Date) {
  return `${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`;
}

/** Chọn đơn vị nhóm: 1 tháng → theo ngày; nhiều tháng trong năm → theo tháng; nhiều năm → theo năm */
function resolveGroupMode(start: Date, end: Date): CostGroupMode {
  const monthSpan =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const yearSpan = end.getFullYear() - start.getFullYear() + 1;

  if (monthSpan <= 1) return 'day';
  if (yearSpan <= 1) return 'month';
  return 'year';
}

function getDonutPercent(opts: unknown) {
  const apexOpts = opts as
    | { w?: { globals?: { seriesPercent?: number[][] } }; seriesIndex?: number }
    | undefined;
  const seriesIndex = apexOpts?.seriesIndex ?? 0;
  return apexOpts?.w?.globals?.seriesPercent?.[seriesIndex]?.[0] ?? 0;
}

function emptyCostStats(): CostSplitStats {
  return {
    total: 0,
    totalCount: 0,
    approved: 0,
    approvedCount: 0,
    pending: 0,
    pendingCount: 0,
  };
}

function addToCostStats(stats: CostSplitStats, row: CostRow) {
  if (row.canceled) return;
  stats.total += row.amount;
  stats.totalCount += 1;
  if (row.approved) {
    stats.approved += row.amount;
    stats.approvedCount += 1;
    return;
  }
  stats.pending += row.amount;
  stats.pendingCount += 1;
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

function costRowExportMeta(row: CostRow) {
  const statusText = row.approved ? 'Đã duyệt' : row.canceled ? 'Đã hủy' : 'Chờ duyệt';
  const handlerName = row.approved
    ? row.approverName
    : row.canceled
      ? row.cancellerName
      : '—';
  return { statusText, handlerName };
}

export function useCostsPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<CostRow[]>([]);
  const defaultRange = useMemo(() => thisMonthRange(), []);
  const [timeFilter, setTimeFilter] = useState<CostTimeFilter>('month');
  const [customStart, setCustomStart] = useState(toInputDate(defaultRange.start));
  const [customEnd, setCustomEnd] = useState(toInputDate(defaultRange.end));
  const [filterCreatorId, setFilterCreatorId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CostFormState>(createDefaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const mainChartRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<{ main?: ApexCharts; donut?: ApexCharts }>({});
  const rowsRef = useRef<CostRow[]>([]);
  rowsRef.current = rows;

  const isAdmin = user?.role === 'admin';

  const chartRange = useMemo(() => {
    if (timeFilter === 'lastMonth') return lastMonthRange();
    if (timeFilter === 'year') return thisYearRange();
    if (timeFilter === 'custom') {
      const start = fromInputDate(customStart);
      const end = fromInputDate(customEnd, true);
      if (start && end && start <= end) return { start, end };
    }
    return thisMonthRange();
  }, [customEnd, customStart, timeFilter]);

  const rowsInTimeRange = useMemo(
    () =>
      rows.filter((row) => {
        if (!row.createdAt) return false;
        const created = new Date(row.createdAt);
        return (
          !Number.isNaN(created.getTime()) &&
          created >= chartRange.start &&
          created <= chartRange.end
        );
      }),
    [chartRange, rows]
  );

  const creatorOptions = useMemo(() => {
    const map = new Map<number, string>();
    rowsInTimeRange.forEach((row) => {
      if (row.creatorId != null) {
        map.set(row.creatorId, row.creatorName);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [rowsInTimeRange]);

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    rowsInTimeRange.forEach((row) => {
      if (row.type.trim()) types.add(row.type);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [rowsInTimeRange]);

  useEffect(() => {
    if (filterCreatorId && !creatorOptions.some((c) => String(c.id) === filterCreatorId)) {
      setFilterCreatorId('');
    }
  }, [creatorOptions, filterCreatorId]);

  useEffect(() => {
    if (filterType && !typeOptions.includes(filterType)) {
      setFilterType('');
    }
  }, [filterType, typeOptions]);

  const filteredRows = useMemo(
    () =>
      rowsInTimeRange.filter((row) => {
        if (filterCreatorId && String(row.creatorId) !== filterCreatorId) {
          return false;
        }
        if (filterType && row.type !== filterType) {
          return false;
        }
        return true;
      }),
    [filterCreatorId, filterType, rowsInTimeRange]
  );

  const hasActiveFilters = filterCreatorId !== '' || filterType !== '';

  const stats = useMemo(() => {
    const total = emptyCostStats();
    const byType = Object.fromEntries(
      COST_TYPES.map((type) => [type, emptyCostStats()])
    ) as Record<(typeof COST_TYPES)[number], CostSplitStats>;

    filteredRows.forEach((row) => {
      addToCostStats(total, row);
      if (row.type in byType) {
        addToCostStats(byType[row.type as (typeof COST_TYPES)[number]], row);
      }
    });

    return { total, byType };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const groupMode = resolveGroupMode(chartRange.start, chartRange.end);
    const buckets = new Map<string, { label: string; value: number }>();

    if (groupMode === 'day') {
      for (let d = startOfDay(chartRange.start); d <= chartRange.end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        const key = toInputDate(d);
        buckets.set(key, { label: labelForDate(d), value: 0 });
      }
    } else if (groupMode === 'month') {
      for (let d = new Date(chartRange.start.getFullYear(), chartRange.start.getMonth(), 1); d <= chartRange.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        buckets.set(key, { label: labelForMonth(d), value: 0 });
      }
    } else {
      for (let year = chartRange.start.getFullYear(); year <= chartRange.end.getFullYear(); year++) {
        const key = String(year);
        buckets.set(key, { label: String(year), value: 0 });
      }
    }

    const typeCosts = new Map<string, number>();
    filteredRows.forEach((row) => {
      if (!row.approved || !row.createdAt) return;
      if (row.canceled) return;
      const created = new Date(row.createdAt);
      if (Number.isNaN(created.getTime())) return;

      const bucketKey =
        groupMode === 'day'
          ? toInputDate(created)
          : groupMode === 'month'
            ? `${created.getFullYear()}-${pad(created.getMonth() + 1)}`
            : String(created.getFullYear());
      const bucket = buckets.get(bucketKey);
      if (bucket) bucket.value += row.amount;
      typeCosts.set(row.type, (typeCosts.get(row.type) || 0) + row.amount);
    });

    const sourceLabels = Array.from(typeCosts.keys());
    const sourceSeries = Array.from(typeCosts.values());

    return {
      groupMode,
      labels: Array.from(buckets.values()).map((b) => b.label),
      series: Array.from(buckets.values()).map((b) => b.value),
      sourceLabels: sourceLabels.length ? sourceLabels : ['Chưa có dữ liệu'],
      sourceSeries: sourceSeries.length ? sourceSeries : [0],
      rangeText: rangeLabel(chartRange.start, chartRange.end),
    };
  }, [chartRange, filteredRows]);

  useEffect(() => {
    let disposed = false;

    (async () => {
      const ApexCharts = (await import('apexcharts')).default;
      if (disposed) return;

      chartsRef.current.main?.destroy();
      chartsRef.current.donut?.destroy();

      if (mainChartRef.current) {
        chartsRef.current.main = new ApexCharts(mainChartRef.current, {
          series: [{ name: 'Chi phí đã duyệt', data: chartData.series }],
          chart: {
            type: 'line',
            height: 350,
            width: '100%',
            fontFamily: 'Be Vietnam Pro, sans-serif',
            toolbar: { show: false },
          },
          colors: ['#ef4444'],
          dataLabels: { enabled: false },
          stroke: { curve: 'smooth', width: 3 },
          markers: {
            size: chartData.series.length <= 2 ? 5 : 0,
            strokeWidth: 0,
            hover: { size: 6 },
          },
          xaxis: {
            categories: chartData.labels,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
              rotate: chartData.labels.length > 12 ? -45 : 0,
              hideOverlappingLabels: true,
              style: { colors: '#94a3b8', fontSize: '12px' },
            },
          },
          yaxis: {
            labels: {
              formatter: (v: number) => `${Math.round(v).toLocaleString('vi-VN')} ₫`,
              style: { colors: '#94a3b8', fontSize: '12px' },
            },
          },
          tooltip: {
            y: { formatter: (v: number) => formatCostAmount(v) },
          },
          noData: { text: 'Chưa có dữ liệu chi phí đã duyệt' },
        });
        chartsRef.current.main.render();
      }

      if (donutRef.current) {
        chartsRef.current.donut = new ApexCharts(donutRef.current, {
          series: chartData.sourceSeries,
          labels: chartData.sourceLabels,
          chart: {
            type: 'donut',
            height: 350,
            width: '100%',
            fontFamily: 'Be Vietnam Pro, sans-serif',
          },
          colors: COST_CHART_COLORS,
          plotOptions: { pie: { donut: { size: '72%' } } },
          dataLabels: {
            enabled: true,
            formatter: (_value, opts) => `${getDonutPercent(opts).toFixed(1)}%`,
          },
          legend: {
            position: 'bottom',
            formatter: (seriesName) => seriesName,
          },
          tooltip: {
            y: {
              formatter: (v, opts) => {
                const pct = getDonutPercent(opts);
                return `${pct.toFixed(1)}% - ${formatCostAmount(v)}`;
              },
            },
          },
          noData: { text: 'Chưa có dữ liệu chi phí đã duyệt' },
        });
        chartsRef.current.donut.render();
      }
    })();

    return () => {
      disposed = true;
      chartsRef.current.main?.destroy();
      chartsRef.current.donut?.destroy();
      chartsRef.current = {};
    };
  }, [chartData]);

  const loadCosts = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    try {
      const { ok, data } = await apiFetch<CostRecord[]>('/api/costs');
      if (!ok) throw new Error('load failed');
      setRows(data.map(toRow));
    } catch {
      if (!silent || rowsRef.current.length === 0) {
        alert('Không tải được danh sách chi phí.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCosts({ silent: false });
  }, [loadCosts]);

  useServerEvents({
    token,
    path: '/api/costs/events',
    eventName: 'costs',
    pollMs: 0,
    onEvent: () => {
      void loadCosts({ silent: true });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(createDefaultForm());
    setModalOpen(true);
  };

  const openEdit = (row: CostRow) => {
    if (row.approved) {
      alert('Chi phí đã được duyệt, không thể chỉnh sửa.');
      return;
    }
    setEditingId(row.id);
    setForm({
      type: isPresetCostType(row.type) ? row.type : COST_TYPE_CUSTOM,
      customType: isPresetCostType(row.type) ? '' : row.type,
      amount: formatAmountInput(row.amount),
      description: row.description || '',
      costDate: row.createdAt
        ? toInputDate(new Date(row.createdAt))
        : toInputDate(new Date()),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(createDefaultForm());
  };

  const updateForm = (field: keyof CostFormState, value: string) => {
    setForm((prev) => {
      const next: CostFormState = {
        ...prev,
        [field]: field === 'amount' ? formatAmountInput(value) : value,
      };
      if (field === 'type' && value !== COST_TYPE_CUSTOM) {
        next.customType = '';
      }
      return next;
    });
  };

  const saveCost = async () => {
    const costType = resolveCostFormType(form);
    if (!form.type.trim()) {
      alert('Vui lòng chọn loại chi phí.');
      return;
    }
    if (form.type === COST_TYPE_CUSTOM && !costType) {
      alert('Vui lòng nhập tên loại chi phí tùy chỉnh.');
      return;
    }

    const amount = parseAmountInput(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    const costDateObj = fromInputDate(form.costDate);
    if (!costDateObj) {
      alert('Vui lòng chọn ngày chi phí.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: costType,
        amount,
        description: form.description.trim(),
        costDate: costDateObj.toISOString(),
      };
      const path = editingId ? `/api/costs/${editingId}` : '/api/costs';
      const { ok, data } = await apiFetch<{ error?: string }>(path, {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      if (!ok) {
        alert(data.error || 'Không lưu được chi phí.');
        return;
      }

      await loadCosts({ silent: true });
      closeModal();
    } catch {
      alert('Không lưu được chi phí. Kiểm tra backend và thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const approveCost = async (id: number) => {
    if (!isAdmin) return;
    setActionLoading(id);
    try {
      const { ok, data } = await apiFetch<{ error?: string }>(`/api/costs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!ok) {
        alert(data.error || 'Không duyệt được chi phí.');
        return;
      }
      await loadCosts({ silent: true });
    } catch {
      alert('Không duyệt được chi phí.');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteCost = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy chi phí đang chờ duyệt này?')) return;
    setActionLoading(id);
    try {
      const { ok, data } = await apiFetch<{ error?: string }>(`/api/costs/${id}`, {
        method: 'DELETE',
      });
      if (!ok) {
        alert(data.error || 'Không hủy được chi phí.');
        return;
      }
      await loadCosts({ silent: true });
    } catch {
      alert('Không hủy được chi phí.');
    } finally {
      setActionLoading(null);
    }
  };

  const exportExcel = useCallback(() => {
    if (filteredRows.length === 0) {
      alert('Không có chi phí để xuất trong khoảng thời gian / bộ lọc hiện tại.');
      return;
    }

    const headers = [
      'Loại chi phí',
      'Số tiền',
      'Người thêm',
      'Người xử lý',
      'Trạng thái',
      'Ngày tạo',
      'Mô tả',
    ];

    const dataRows = filteredRows.map((row) => {
      const { statusText, handlerName } = costRowExportMeta(row);
      return [
        row.type,
        row.amount,
        row.creatorName,
        handlerName,
        statusText,
        formatExportDateTime(row.createdAt),
        row.description?.trim() || '',
      ];
    });

    const filename = `danh-sach-chi-phi_${toInputDate(chartRange.start)}_${toInputDate(chartRange.end)}.csv`;
    downloadCsv(filename, headers, dataRows);
  }, [chartRange, filteredRows]);

  return {
    user,
    isAdmin,
    rows: filteredRows,
    stats,
    timeFilter,
    setTimeFilter,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    filterCreatorId,
    setFilterCreatorId,
    filterType,
    setFilterType,
    creatorOptions,
    typeOptions,
    hasActiveFilters,
    showCustomDates: timeFilter === 'custom',
    chartData,
    mainChartRef,
    donutRef,
    loading,
    saving,
    actionLoading,
    modalOpen,
    editingId,
    form,
    setModalOpen,
    openCreate,
    openEdit,
    closeModal,
    updateForm,
    saveCost,
    approveCost,
    deleteCost,
    exportExcel,
  };
}
