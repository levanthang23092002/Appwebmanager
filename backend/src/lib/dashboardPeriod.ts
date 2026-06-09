export type DashboardFilter =
  | 'day'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'year'
  | 'custom';

export type PeriodRanges = {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  labelSuffix: string;
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

const LABELS: Record<string, string> = {
  day: ' so với hôm qua',
  yesterday: ' so với hôm kia',
  week: ' so với tuần trước',
  month: ' so với tháng trước',
  year: ' so với năm trước',
  custom: ' so với chu kỳ tùy chỉnh',
};

export function parseDashboardFilter(raw: string | null): DashboardFilter {
  if (
    raw === 'day' ||
    raw === 'yesterday' ||
    raw === 'week' ||
    raw === 'year' ||
    raw === 'custom'
  ) {
    return raw;
  }
  return 'month';
}

export function getDashboardPeriodRanges(filter: DashboardFilter): PeriodRanges {
  const now = new Date();
  const labelSuffix = LABELS[filter] ?? LABELS.month;

  if (filter === 'day') {
    const start = startOfDay(now);
    const end = endOfDay(now);
    return {
      start,
      end,
      prevStart: startOfDay(addDays(now, -1)),
      prevEnd: endOfDay(addDays(now, -1)),
      labelSuffix,
    };
  }

  if (filter === 'yesterday') {
    const start = startOfDay(addDays(now, -1));
    const end = endOfDay(addDays(now, -1));
    return {
      start,
      end,
      prevStart: startOfDay(addDays(now, -2)),
      prevEnd: endOfDay(addDays(now, -2)),
      labelSuffix,
    };
  }

  if (filter === 'week') {
    const start = startOfWeek(now);
    const end = endOfDay(now);
    const prevEnd = endOfDay(addDays(start, -1));
    const prevStart = startOfWeek(addDays(start, -1));
    return { start, end, prevStart, prevEnd, labelSuffix };
  }

  if (filter === 'year') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: endOfDay(now),
      prevStart: new Date(now.getFullYear() - 1, 0, 1),
      prevEnd: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      labelSuffix,
    };
  }

  if (filter === 'custom') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endOfDay(now);
    return {
      start,
      end,
      prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      prevEnd: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      labelSuffix,
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endOfDay(now);
  return {
    start,
    end,
    prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    prevEnd: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    labelSuffix,
  };
}
