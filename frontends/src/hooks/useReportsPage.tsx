import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { monthLabel, todayDateKey } from '../lib/attendance/calendar';
import type { DailyReport, TeamMemberReportRow } from '../lib/reports/types';
import { useAuth } from '../lib/auth';

export type ReportsViewTab = 'mine' | 'team';

export function useReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const todayKey = useMemo(() => todayDateKey(), []);
  const today = useMemo(() => new Date(), []);

  const [viewTab, setViewTab] = useState<ReportsViewTab>('mine');
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [monthReports, setMonthReports] = useState<DailyReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [saving, setSaving] = useState(false);

  const [teamMembers, setTeamMembers] = useState<TeamMemberReportRow[]>([]);
  const [teamRecords, setTeamRecords] = useState<DailyReport[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [adminFilter, setAdminFilter] = useState('');
  const [viewUserId, setViewUserId] = useState<number | null>(null);

  const activeUserId = viewUserId ?? user?.id ?? 0;
  const activeUserName =
    teamMembers.find((m) => m.user.id === activeUserId)?.user.name ?? user?.name ?? '';

  const loadToday = useCallback(async () => {
    if (!user) return;
    setLoadingToday(true);
    try {
      const { ok, data } = await apiFetch<DailyReport | null>('/api/reports/today');
      if (ok) setTodayReport(data);
    } finally {
      setLoadingToday(false);
    }
  }, [user]);

  const loadMonthReports = useCallback(async () => {
    if (!user) return;
    setLoadingMonth(true);
    try {
      const monthParam = calendarMonth + 1;
      const path =
        isAdmin && viewUserId
          ? `/api/reports?userId=${viewUserId}&year=${calendarYear}&month=${monthParam}`
          : `/api/reports?year=${calendarYear}&month=${monthParam}`;

      const { ok, data } = await apiFetch<DailyReport[]>(path);
      if (ok) {
        setMonthReports(data);
        setSelectedReportId((prev) => {
          if (data.length === 0) return null;
          if (prev && data.some((r) => r.id === prev)) return prev;
          return data[0].id;
        });
      }
    } finally {
      setLoadingMonth(false);
    }
  }, [user, calendarYear, calendarMonth, viewUserId, isAdmin]);

  const loadTeam = useCallback(async () => {
    if (!isAdmin) return;
    setTeamLoading(true);
    try {
      const { ok, data } = await apiFetch<{
        members: TeamMemberReportRow[];
        records: DailyReport[];
      }>(`/api/reports/team?year=${calendarYear}&month=${calendarMonth + 1}`);
      if (ok) {
        setTeamMembers(data.members);
        setTeamRecords(data.records);
      }
    } finally {
      setTeamLoading(false);
    }
  }, [isAdmin, calendarYear, calendarMonth]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (viewTab === 'team' && isAdmin) void loadTeam();
    else void loadMonthReports();
  }, [viewTab, isAdmin, loadTeam, loadMonthReports]);

  const selectedReport = useMemo(
    () => monthReports.find((r) => r.id === selectedReportId) ?? null,
    [monthReports, selectedReportId]
  );

  const teamRows = useMemo(() => {
    const q = adminFilter.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter(
      (m) =>
        m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
    );
  }, [teamMembers, adminFilter]);

  const teamOverview = useMemo(() => {
    const submittedToday = teamMembers.filter((m) => m.todaySubmitted).length;
    return {
      total: teamMembers.length,
      submittedToday,
      missingToday: teamMembers.length - submittedToday,
      monthSubmitted: teamMembers.reduce((sum, m) => sum + m.monthSubmitted, 0),
    };
  }, [teamMembers]);

  const memberReports = useMemo(() => {
    if (!viewUserId) return [];
    return teamRecords
      .filter((r) => r.userId === viewUserId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [teamRecords, viewUserId]);

  const saveReport = async (payload: {
    content: string;
    planNext: string;
    blockers: string;
    submit: boolean;
  }) => {
    if (!user) return false;
    setSaving(true);
    try {
      const { ok, data } = await apiFetch<DailyReport & { error?: string }>('/api/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!ok) {
        alert(data.error || 'Không lưu được');
        return false;
      }
      setTodayReport(data);
      if (viewTab === 'team') await loadTeam();
      else await loadMonthReports();
      return true;
    } catch {
      alert('Không lưu được báo cáo');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(calendarYear, calendarMonth + delta, 1);
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth());
    setSelectedReportId(null);
  };

  const openMemberReports = (memberId: number) => {
    setViewUserId(memberId);
    setViewTab('mine');
    setSelectedReportId(null);
  };

  const resetToMyReports = () => {
    setViewUserId(null);
    setSelectedReportId(null);
  };

  return {
    user,
    isAdmin,
    todayKey,
    viewTab,
    setViewTab,
    calendarYear,
    calendarMonth,
    monthLabel: monthLabel(calendarYear, calendarMonth),
    shiftMonth,
    todayReport,
    loadingToday,
    loadingMonth,
    monthReports,
    selectedReport,
    selectedReportId,
    setSelectedReportId,
    saveReport,
    saving,
    teamRows,
    teamLoading,
    teamOverview,
    adminFilter,
    setAdminFilter,
    openMemberReports,
    viewUserId,
    activeUserId,
    activeUserName,
    resetToMyReports,
    isViewingOther: viewUserId != null && viewUserId !== user?.id,
    memberReports,
  };
}
