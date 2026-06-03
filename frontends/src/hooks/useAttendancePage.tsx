import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  buildMonthGrid,
  countWorkdaysInMonth,
  monthLabel,
  todayDateKey,
} from '../lib/attendance/calendar';
import { fetchAllowedWifiSsids } from '../lib/attendance/networkCheck';
import {
  buildDaySummary,
  countMonthStats,
  deriveStatus,
  formatAttendanceTime,
} from '../lib/attendance/stats';
import type { AttendanceRecord, AttendanceUserBrief, DaySummary, TeamMemberRow } from '../lib/attendance/types';
import { useAuth } from '../lib/auth';

export type AttendanceViewTab = 'mine' | 'team';

type ApiAttendanceRow = AttendanceRecord & { id: number | string };

function mapApiRecord(row: ApiAttendanceRow): AttendanceRecord {
  return {
    ...row,
    id: String(row.id),
    userName: row.userName || '',
    wifiVerified: row.wifiVerified ?? true,
  };
}

export function useAttendancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const todayKey = useMemo(() => todayDateKey(), []);
  const today = useMemo(() => new Date(), []);

  const [viewTab, setViewTab] = useState<AttendanceViewTab>('mine');
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [wifiSsids, setWifiSsids] = useState<string[]>([]);
  const [clockLoading, setClockLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [teamUsers, setTeamUsers] = useState<AttendanceUserBrief[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [adminFilter, setAdminFilter] = useState('');
  const [viewUserId, setViewUserId] = useState<number | null>(null);

  const activeUserId = viewUserId ?? user?.id ?? 0;
  const wifiConfigured = wifiSsids.length > 0;

  const records = useMemo(
    () => monthRecords.filter((r) => r.userId === activeUserId),
    [monthRecords, activeUserId]
  );

  const activeUserName =
    teamUsers.find((u) => u.id === activeUserId)?.name ?? user?.name ?? '';

  const loadWifiList = useCallback(async () => {
    const ssids = await fetchAllowedWifiSsids();
    setWifiSsids(ssids);
  }, []);

  useEffect(() => {
    void loadWifiList();
  }, [loadWifiList]);

  useEffect(() => {
    const onWifiUpdated = () => void loadWifiList();
    window.addEventListener('attendance-wifi-updated', onWifiUpdated);
    return () => window.removeEventListener('attendance-wifi-updated', onWifiUpdated);
  }, [loadWifiList]);

  const loadMonthRecords = useCallback(async () => {
    if (!user) return;
    setRecordsLoading(true);
    try {
      const monthParam = calendarMonth + 1;
      const targetId = viewUserId ?? user.id;
      const path =
        isAdmin && viewUserId
          ? `/api/attendance?userId=${targetId}&year=${calendarYear}&month=${monthParam}`
          : `/api/attendance/me?year=${calendarYear}&month=${monthParam}`;

      const { ok, data } = await apiFetch<ApiAttendanceRow[]>(path);
      if (!ok) throw new Error('load failed');
      setMonthRecords(data.map(mapApiRecord));
    } catch {
      setMonthRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [user, calendarYear, calendarMonth, viewUserId, isAdmin]);

  const loadTeam = useCallback(async () => {
    if (!isAdmin) return;
    setTeamLoading(true);
    try {
      const { ok, data } = await apiFetch<{
        users: AttendanceUserBrief[];
        records: ApiAttendanceRow[];
      }>(`/api/attendance/team?year=${calendarYear}&month=${calendarMonth + 1}`);
      if (!ok) throw new Error('team load failed');
      setTeamUsers(data.users);
      setMonthRecords(data.records.map(mapApiRecord));
    } catch {
      setTeamUsers([]);
    } finally {
      setTeamLoading(false);
    }
  }, [isAdmin, calendarYear, calendarMonth]);

  useEffect(() => {
    if (viewTab === 'team' && isAdmin) {
      void loadTeam();
    } else {
      void loadMonthRecords();
    }
  }, [viewTab, isAdmin, loadTeam, loadMonthRecords]);

  const todayRecord = useMemo(
    () =>
      user
        ? monthRecords.find((r) => r.userId === user.id && r.date === todayKey)
        : undefined,
    [user, todayKey, monthRecords]
  );

  const openSession = useMemo(
    () =>
      user
        ? monthRecords.find((r) => r.userId === user.id && r.checkIn && !r.checkOut)
        : undefined,
    [user, monthRecords]
  );

  const displayTodayRecord = todayRecord ?? openSession;

  const canCheckIn = wifiConfigured && !todayRecord?.checkIn && !openSession?.checkIn;
  const canCheckOut = wifiConfigured && !!openSession?.checkIn && !openSession?.checkOut;

  const calendarCells = useMemo(
    () => buildMonthGrid(calendarYear, calendarMonth, todayKey),
    [calendarYear, calendarMonth, todayKey]
  );

  const monthSummaries = useMemo(() => {
    const map = new Map<string, DaySummary>();
    if (!activeUserId) return map;
    calendarCells.forEach((cell) => {
      if (!cell.date) return;
      map.set(cell.date, buildDaySummary(activeUserId, cell.date, records, todayKey));
    });
    return map;
  }, [activeUserId, calendarCells, records, todayKey]);

  const selectedSummary = useMemo(() => {
    if (!activeUserId || !selectedDate) return null;
    return buildDaySummary(activeUserId, selectedDate, records, todayKey);
  }, [activeUserId, selectedDate, records, todayKey]);

  const myMonthStats = useMemo(() => {
    if (!user) return { present: 0, late: 0, absent: 0 };
    const mine = monthRecords.filter((r) => r.userId === user.id);
    return countMonthStats(user.id, calendarYear, calendarMonth, mine, today);
  }, [user, calendarYear, calendarMonth, monthRecords, today]);

  const teamRows = useMemo((): TeamMemberRow[] => {
    const q = adminFilter.trim().toLowerCase();
    const filtered = q
      ? teamUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        )
      : teamUsers;

    return filtered.map((u) => {
      const rec = monthRecords.find((r) => r.userId === u.id && r.date === todayKey);
      const todayStatus = rec?.status ?? deriveStatus(rec, todayKey, todayKey);
      const userRecords = monthRecords.filter((r) => r.userId === u.id);
      const month = countMonthStats(u.id, calendarYear, calendarMonth, userRecords, today);
      const workdays = countWorkdaysInMonth(
        calendarYear,
        calendarMonth,
        today.getMonth() === calendarMonth && today.getFullYear() === calendarYear
          ? today.getDate()
          : undefined
      );
      return {
        user: u,
        todayStatus,
        todayCheckIn: rec?.checkIn,
        todayCheckOut: rec?.checkOut,
        monthPresent: month.present,
        monthLate: month.late,
        monthAbsent: month.absent,
        monthWorkdays: workdays,
      };
    });
  }, [adminFilter, teamUsers, todayKey, calendarYear, calendarMonth, monthRecords, today]);

  const teamOverview = useMemo(() => {
    const checked = teamRows.filter((r) => r.todayCheckIn).length;
    return {
      total: teamRows.length,
      checked,
      working: teamRows.filter((r) => r.todayStatus === 'working').length,
      late: teamRows.filter((r) => r.todayStatus === 'late').length,
      present: teamRows.filter((r) => r.todayStatus === 'present').length,
      absent: teamRows.filter((r) => r.todayStatus === 'absent').length,
    };
  }, [teamRows]);

  const shiftMonth = (delta: number) => {
    const d = new Date(calendarYear, calendarMonth + delta, 1);
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth());
  };

  const goToday = () => {
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth());
    setSelectedDate(todayKey);
  };

  const clockIn = async () => {
    if (!user || !canCheckIn) return;
    setClockLoading(true);
    try {
      const { ok, data } = await apiFetch<{ error?: string }>('/api/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!ok) {
        alert(data.error || 'Không chấm vào được.');
        return;
      }
      if (viewTab === 'team') await loadTeam();
      else await loadMonthRecords();
    } catch {
      alert('Không chấm vào được. Kiểm tra backend.');
    } finally {
      setClockLoading(false);
    }
  };

  const clockOut = async () => {
    if (!user || !canCheckOut) return;
    setClockLoading(true);
    try {
      const { ok, data } = await apiFetch<{ error?: string }>('/api/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!ok) {
        alert(data.error || 'Không chấm ra được.');
        return;
      }
      if (viewTab === 'team') await loadTeam();
      else await loadMonthRecords();
    } catch {
      alert('Không chấm ra được.');
    } finally {
      setClockLoading(false);
    }
  };

  const openMemberCalendar = (memberId: number) => {
    setViewUserId(memberId);
    setViewTab('mine');
    setSelectedDate(todayKey);
  };

  const resetToMyCalendar = () => {
    setViewUserId(null);
    if (user) setSelectedDate(todayKey);
  };

  return {
    user,
    todayKey,
    isAdmin,
    viewTab,
    setViewTab,
    calendarYear,
    calendarMonth,
    calendarCells,
    monthLabel: monthLabel(calendarYear, calendarMonth),
    shiftMonth,
    goToday,
    selectedDate,
    setSelectedDate,
    selectedSummary,
    monthSummaries,
    myMonthStats,
    todayRecord: displayTodayRecord,
    canCheckIn,
    canCheckOut,
    clockIn,
    clockOut,
    clockLoading,
    recordsLoading,
    wifiConfigured,
    formatAttendanceTime,
    teamRows,
    teamLoading,
    teamOverview,
    adminFilter,
    setAdminFilter,
    openMemberCalendar,
    viewUserId,
    activeUserId,
    activeUserName,
    resetToMyCalendar,
    isViewingOther: viewUserId != null && viewUserId !== user?.id,
  };
}
