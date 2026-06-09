import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import type {
  AffiliateAccount,
  AffiliateNetwork,
  AffiliateRevenue,
} from '../lib/affiliateTypes';
import { useAuth } from '../lib/auth';
import { useSystemSettings } from '../lib/systemSettings';
import {
  convertAmount,
  formatMoney,
  normalizeUsdVndRate,
  type CurrencyCode,
} from '../lib/currency';

export type AffiliateTab = 'mine' | 'team' | 'networks';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function useAffiliatePage() {
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const isTeamViewer = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<AffiliateTab>('mine');
  const [networks, setNetworks] = useState<AffiliateNetwork[]>([]);
  const [accounts, setAccounts] = useState<AffiliateAccount[]>([]);
  const [revenues, setRevenues] = useState<AffiliateRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('USD');

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [revenueModalOpen, setRevenueModalOpen] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({});

  const [accountForm, setAccountForm] = useState({
    networkId: '',
    name: '',
    loginEmail: '',
    password: '',
    note: '',
    dashboardUrl: '',
  });

  const [revenueForm, setRevenueForm] = useState({
    networkId: '',
    accountId: '',
    amount: '',
    orderCount: '',
    revenueDate: todayIso(),
    storeDomain: '',
    note: '',
    currency: 'USD',
    usdVndRate: '27000',
  });

  const [networkForm, setNetworkForm] = useState({ name: '' });

  const scope = tab === 'team' ? 'team' : 'mine';

  const loadNetworks = useCallback(async () => {
    const all = isAdmin && tab === 'networks';
    const { ok, data } = await apiFetch<AffiliateNetwork[]>(
      `/api/affiliate/networks${all ? '?all=1' : ''}`
    );
    if (ok && Array.isArray(data)) setNetworks(data);
  }, [isAdmin, tab]);

  const loadAccounts = useCallback(async () => {
    const { ok, data } = await apiFetch<AffiliateAccount[]>(
      `/api/affiliate/accounts?scope=${scope}`
    );
    if (ok && Array.isArray(data)) setAccounts(data);
  }, [scope]);

  const loadRevenues = useCallback(async () => {
    const { ok, data } = await apiFetch<AffiliateRevenue[]>(
      `/api/affiliate/revenue?scope=${scope}`
    );
    if (ok && Array.isArray(data)) setRevenues(data);
  }, [scope]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loadNetworks();
      if (tab !== 'networks') {
        await Promise.all([loadAccounts(), loadRevenues()]);
      }
    } catch {
      setError('Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [loadAccounts, loadNetworks, loadRevenues, tab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myAccounts = useMemo(
    () => accounts.filter((a) => a.ownerId === user?.id),
    [accounts, user?.id]
  );

  const revenueAccounts = useMemo(() => {
    if (tab === 'team') return accounts.filter((a) => a.active);
    return myAccounts.filter((a) => a.active);
  }, [accounts, myAccounts, tab]);

  const stats = useMemo(() => {
    const totalRevenue = revenues.reduce(
      (s, r) =>
        s + convertAmount(r.amount, r.currency, normalizeUsdVndRate(r.usdVndRate), displayCurrency),
      0
    );
    const totalOrders = revenues.reduce((s, r) => s + (r.orderCount || 0), 0);
    const activeAccounts = revenueAccounts.length;
    const avgPerOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return {
      totalRevenue: formatMoney(totalRevenue, displayCurrency),
      totalOrders: String(totalOrders),
      activeAccounts: String(activeAccounts),
      avgPerOrder: totalOrders > 0 ? formatMoney(avgPerOrder, displayCurrency) : '—',
    };
  }, [displayCurrency, revenues, revenueAccounts.length]);

  const revealPassword = async (accountId: number) => {
    if (revealedPasswords[accountId]) {
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      return;
    }
    const { ok, data } = await apiFetch<AffiliateAccount>(
      `/api/affiliate/accounts/${accountId}?reveal=1`
    );
    if (ok && data.password) {
      setRevealedPasswords((prev) => ({ ...prev, [accountId]: data.password! }));
    } else {
      alert('Không xem được mật khẩu');
    }
  };

  const saveAccount = async () => {
    setSaving(true);
    setError('');
    const { ok, data } = await apiFetch<AffiliateAccount & { error?: string }>(
      '/api/affiliate/accounts',
      {
        method: 'POST',
        body: JSON.stringify({
          networkId: parseInt(accountForm.networkId, 10),
          name: accountForm.name.trim(),
          loginEmail: accountForm.loginEmail.trim(),
          password: accountForm.password,
          note: accountForm.note.trim() || null,
          dashboardUrl: accountForm.dashboardUrl.trim() || null,
        }),
      }
    );
    setSaving(false);
    if (!ok) {
      setError(data.error || 'Không lưu được account');
      return;
    }
    setAccountModalOpen(false);
    setAccountForm({
      networkId: '',
      name: '',
      loginEmail: '',
      password: '',
      note: '',
      dashboardUrl: '',
    });
    await refresh();
  };

  const saveRevenue = async () => {
    setSaving(true);
    setError('');
    const { ok, data } = await apiFetch<AffiliateRevenue & { error?: string }>(
      '/api/affiliate/revenue',
      {
        method: 'POST',
        body: JSON.stringify({
          accountId: parseInt(revenueForm.accountId, 10),
          amount: parseFloat(revenueForm.amount),
          orderCount: revenueForm.orderCount ? parseInt(revenueForm.orderCount, 10) : null,
          revenueDate: revenueForm.revenueDate,
          storeDomain: revenueForm.storeDomain.trim() || null,
          note: revenueForm.note.trim() || null,
          currency: revenueForm.currency,
          usdVndRate: normalizeUsdVndRate(revenueForm.usdVndRate),
        }),
      }
    );
    setSaving(false);
    if (!ok) {
      setError(data.error || 'Không lưu được doanh thu');
      return;
    }
    setRevenueModalOpen(false);
    setRevenueForm({
      networkId: '',
      accountId: '',
      amount: '',
      orderCount: '',
      revenueDate: todayIso(),
      storeDomain: '',
      note: '',
      currency: 'USD',
      usdVndRate: '27000',
    });
    await refresh();
  };

  const openRevenueModal = () => {
    setRevenueForm((f) => ({
      ...f,
      usdVndRate: String(settings.usdVndRate),
    }));
    setRevenueModalOpen(true);
  };

  const saveNetwork = async () => {
    if (!isAdmin) return;
    setSaving(true);
    const { ok, data } = await apiFetch<AffiliateNetwork & { error?: string }>(
      '/api/affiliate/networks',
      {
        method: 'POST',
        body: JSON.stringify({ name: networkForm.name.trim() }),
      }
    );
    setSaving(false);
    if (!ok) {
      alert(data.error || 'Không tạo được network');
      return;
    }
    setNetworkForm({ name: '' });
    await refresh();
  };

  const toggleNetwork = async (network: AffiliateNetwork) => {
    if (!isAdmin) return;
    await apiFetch(`/api/affiliate/networks/${network.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !network.active }),
    });
    await refresh();
  };

  const filteredRevenueAccounts = useMemo(() => {
    if (!revenueForm.networkId) return revenueAccounts;
    const nid = parseInt(revenueForm.networkId, 10);
    return revenueAccounts.filter((a) => a.networkId === nid);
  }, [revenueAccounts, revenueForm.networkId]);

  return {
    user,
    tab,
    setTab,
    isTeamViewer,
    isAdmin,
    networks,
    accounts,
    revenues,
    loading,
    saving,
    error,
    stats,
    accountModalOpen,
    setAccountModalOpen,
    revenueModalOpen,
    setRevenueModalOpen,
    accountForm,
    setAccountForm,
    revenueForm,
    setRevenueForm,
    networkForm,
    setNetworkForm,
    revealedPasswords,
    revealPassword,
    saveAccount,
    saveRevenue,
    saveNetwork,
    toggleNetwork,
    filteredRevenueAccounts,
    refresh,
    displayCurrency,
    setDisplayCurrency,
    openRevenueModal,
  };
}
