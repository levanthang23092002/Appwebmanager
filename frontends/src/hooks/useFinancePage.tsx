import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type ApexCharts from 'apexcharts';
import { parseCSV } from '../lib/parseCsv';

export interface AffiliateRow {
  id: string;
  date: string;
  source: string;
  sourceIcon: ReactNode;
  clicks: string;
  conversion: string;
  commission: string;
  status: string;
  statusClass: string;
}

function getFinanceChartHeight(): number {
  if (typeof window === 'undefined') return 350;
  if (window.innerWidth < 480) return 240;
  if (window.innerWidth < 768) return 280;
  return 350;
}

function apexResize(chart?: ApexCharts) {
  (chart as ApexCharts & { resize?: () => void } | undefined)?.resize?.();
}

const DEFAULT_ROWS: AffiliateRow[] = [
  {
    id: '1',
    date: '28 Th4 2026',
    source: 'TikTok Ads',
    sourceIcon: <i className="bx bxl-tiktok" style={{ color: '#000', fontSize: 18 }} />,
    clicks: '1,240',
    conversion: '45 (3.6%)',
    commission: '+$450.00',
    status: 'Đã duyệt',
    statusClass: 'green-bg',
  },
  {
    id: '2',
    date: '27 Th4 2026',
    source: 'Facebook Social',
    sourceIcon: <i className="bx bxl-facebook-circle" style={{ color: '#1877f2', fontSize: 18 }} />,
    clicks: '850',
    conversion: '21 (2.4%)',
    commission: '+$210.00',
    status: 'Đã duyệt',
    statusClass: 'green-bg',
  },
  {
    id: '3',
    date: '26 Th4 2026',
    source: 'Organic Search',
    sourceIcon: <i className="bx bx-globe" style={{ color: 'var(--slate-500)', fontSize: 18 }} />,
    clicks: '3,120',
    conversion: '112 (3.5%)',
    commission: '+$1,120.00',
    status: 'Đã thanh toán',
    statusClass: 'purple-bg',
  },
  {
    id: '4',
    date: '25 Th4 2026',
    source: 'TikTok KOC',
    sourceIcon: <i className="bx bxl-tiktok" style={{ color: '#000', fontSize: 18 }} />,
    clicks: '420',
    conversion: '8 (1.9%)',
    commission: '+$80.00',
    status: 'Chờ duyệt',
    statusClass: 'slate-bg',
  },
  {
    id: '5',
    date: '24 Th4 2026',
    source: 'Email Marketing',
    sourceIcon: <i className="bx bxs-envelope" style={{ color: '#ea4335', fontSize: 18 }} />,
    clicks: '2,050',
    conversion: '65 (3.1%)',
    commission: '+$650.00',
    status: 'Đã thanh toán',
    statusClass: 'purple-bg',
  },
];

const BASE_STATS = [45231, 18400, 26831, 24];

function genDates(count: number, prefix: string) {
  const cats: string[] = [];
  const today = new Date();
  if (prefix === 'H') {
    for (let i = 0; i < count; i++) cats.push(`${i}h`);
    return cats;
  }
  if (prefix === 'T') {
    for (let i = 1; i <= count; i++) cats.push(`T${i}`);
    return cats;
  }
  if (prefix.startsWith('Tháng')) {
    for (let i = 1; i <= count; i++) cats.push(`Tháng ${i}`);
    return cats;
  }
  for (let i = count; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    cats.push(d.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
  }
  return cats;
}

function iconForNetwork(net: string, customLogo?: string) {
  if (customLogo) {
    return (
      <img
        src={customLogo}
        alt=""
        style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', marginRight: 4 }}
      />
    );
  }
  const n = net.toLowerCase();
  if (n.includes('tiktok')) return <i className="bx bxl-tiktok" style={{ color: '#000', fontSize: 18 }} />;
  if (n.includes('facebook')) return <i className="bx bxl-facebook-circle" style={{ color: '#1877f2', fontSize: 18 }} />;
  if (n.includes('impact')) return <i className="bx bxs-bolt" style={{ color: '#ea580c', fontSize: 18 }} />;
  if (n.includes('shopify')) return <i className="bx bxl-shopify" style={{ color: '#84cc16', fontSize: 18 }} />;
  if (n.includes('goaff')) return <i className="bx bxs-paper-plane" style={{ color: '#2563eb', fontSize: 18 }} />;
  if (n.includes('email')) return <i className="bx bxs-envelope" style={{ color: '#ea4335', fontSize: 18 }} />;
  if (n.includes('organic')) return <i className="bx bx-globe" style={{ color: 'var(--slate-500)', fontSize: 18 }} />;
  return <i className="bx bx-link" style={{ color: 'var(--slate-500)', fontSize: 18 }} />;
}

export function useFinancePage() {
  const [timeFilter, setTimeFilter] = useState('month');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [stats, setStats] = useState({
    revenue: '$45,231',
    profit: '$18,400',
    cost: '$26,831',
    campaigns: '24',
    trends: ['+18%', '+12%', '+5%', '+2'],
    trendClasses: ['positive', 'positive', 'negative', 'positive'] as string[],
  });
  const [rows, setRows] = useState<AffiliateRow[]>(DEFAULT_ROWS);
  const [importOpen, setImportOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showAddNet, setShowAddNet] = useState(false);
  const [customNetName, setCustomNetName] = useState('');
  const [networks, setNetworks] = useState(['Impact', 'Shopify Collabs', 'Uppromote', 'Goaff']);
  const [sheetUrl, setSheetUrl] = useState('');
  const [syncing, setSyncing] = useState(false);

  const sparkRefs = {
    revenue: useRef<HTMLDivElement>(null),
    profit: useRef<HTMLDivElement>(null),
    cost: useRef<HTMLDivElement>(null),
    campaign: useRef<HTMLDivElement>(null),
  };
  const mainChartRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<{
    spark1?: ApexCharts;
    spark2?: ApexCharts;
    spark3?: ApexCharts;
    spark4?: ApexCharts;
    main?: ApexCharts;
    donut?: ApexCharts;
  }>({});

  const applyTimeFilter = useCallback((val: string) => {
    let mult = 1;
    let points = 30;
    let prefix = 'Ng';

    if (val === 'day') {
      mult = 0.05;
      points = 24;
      prefix = 'H';
    } else if (val === 'yesterday') {
      mult = 0.045;
      points = 24;
      prefix = 'H';
    } else if (val === 'week') {
      mult = 0.25;
      points = 7;
      prefix = 'T';
    } else if (val === 'year') {
      mult = 12.5;
      points = 12;
      prefix = 'Tháng';
    } else if (val === 'custom') {
      mult = 0.6;
      points = 15;
      prefix = 'Ng';
    }

    const trends = Array.from({ length: 4 }, () => {
      const isPos = Math.random() > 0.4;
      const num = (Math.random() * 15).toFixed(1);
      return {
        text: `${isPos ? '+' : '-'}${num}%`,
        cls: isPos ? 'positive' : 'negative',
      };
    });

    setStats({
      revenue: `$${(BASE_STATS[0] * mult).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      profit: `$${(BASE_STATS[1] * mult).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      cost: `$${(BASE_STATS[2] * mult).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      campaigns: String(Math.max(1, Math.round(BASE_STATS[3] * (mult > 1 ? 1.5 : mult < 1 ? 0.5 : 1)))),
      trends: trends.map((t) => t.text),
      trendClasses: trends.map((t) => t.cls),
    });

    const genSpark = (base: number) =>
      Array.from({ length: points }, () => base + Math.random() * 20 - 10);

    chartsRef.current.spark1?.updateSeries([{ data: genSpark(50) }]);
    chartsRef.current.spark2?.updateSeries([{ data: genSpark(30) }]);
    chartsRef.current.spark3?.updateSeries([{ data: genSpark(20) }]);
    chartsRef.current.spark4?.updateSeries([{ data: genSpark(15) }]);

    const ms1: number[] = [];
    const ms2: number[] = [];
    const cats = genDates(points, prefix);
    for (let i = 0; i < points; i++) {
      ms1.push(Math.round((Math.random() * 1000 + 1000) * mult));
      ms2.push(Math.round((Math.random() * 800 + 500) * mult));
    }
    chartsRef.current.main?.updateSeries([
      { name: 'Doanh thu', data: ms1 },
      { name: 'Chi phí', data: ms2 },
    ]);
    chartsRef.current.main?.updateOptions({ xaxis: { categories: cats } });

    chartsRef.current.donut?.updateSeries([
      Math.floor(Math.random() * 40) + 20,
      Math.floor(Math.random() * 30) + 15,
      Math.floor(Math.random() * 20) + 10,
      Math.floor(Math.random() * 15) + 5,
    ]);
  }, []);

  const onTimeFilterChange = (val: string) => {
    setTimeFilter(val);
    if (val === 'custom') {
      setShowCustomDates(true);
      return;
    }
    setShowCustomDates(false);
    applyTimeFilter(val);
  };

  useEffect(() => {
    let mounted = true;
    const dates = genDates(31, '');

    (async () => {
      const ApexCharts = (await import('apexcharts')).default;
      if (!mounted) return;

      const indigo = '#4f46e5';
      const indigoLight = '#818cf8';
      const success = '#10b981';
      const danger = '#ef4444';
      const slate400 = '#94a3b8';

      const sparklineOptions = {
        chart: {
          type: 'area' as const,
          height: 60,
          width: '100%',
          sparkline: { enabled: true },
          animations: { enabled: true, easing: 'easeinout', speed: 800 },
        },
        stroke: { curve: 'smooth' as const, width: 2 },
        fill: {
          type: 'gradient' as const,
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.3,
            opacityTo: 0,
            stops: [0, 90, 100],
          },
        },
        tooltip: {
          fixed: { enabled: false },
          x: { show: false },
          y: {
            title: {
              formatter: () => '',
            },
          },
          marker: { show: false },
        },
      };

      if (sparkRefs.revenue.current) {
        chartsRef.current.spark1 = new ApexCharts(sparkRefs.revenue.current, {
          ...sparklineOptions,
          colors: [success],
          series: [{ data: [25, 30, 28, 35, 42, 50, 48, 55, 60, 65, 62, 70] }],
        });
        chartsRef.current.spark1.render();
      }
      if (sparkRefs.profit.current) {
        chartsRef.current.spark2 = new ApexCharts(sparkRefs.profit.current, {
          ...sparklineOptions,
          colors: [indigo],
          series: [{ data: [10, 15, 12, 18, 22, 28, 25, 30, 32, 38, 35, 42] }],
        });
        chartsRef.current.spark2.render();
      }
      if (sparkRefs.cost.current) {
        chartsRef.current.spark3 = new ApexCharts(sparkRefs.cost.current, {
          ...sparklineOptions,
          colors: [danger],
          series: [{ data: [15, 15, 16, 17, 20, 22, 23, 25, 28, 27, 27, 28] }],
        });
        chartsRef.current.spark3.render();
      }
      if (sparkRefs.campaign.current) {
        chartsRef.current.spark4 = new ApexCharts(sparkRefs.campaign.current, {
          ...sparklineOptions,
          colors: [indigoLight],
          series: [{ data: [10, 12, 12, 14, 15, 15, 18, 20, 21, 23, 24, 24] }],
        });
        chartsRef.current.spark4.render();
      }

      const chartHeight = getFinanceChartHeight();

      if (mainChartRef.current) {
        chartsRef.current.main = new ApexCharts(mainChartRef.current, {
          series: [
            {
              name: 'Doanh thu',
              data: [
                1200, 1350, 1250, 1500, 1700, 1600, 1800, 1950, 2100, 2000, 2200, 2400, 2300,
                2500, 2800, 2750, 3100, 3050, 3200, 3400, 3350, 3600, 3800, 4100, 4000, 4200,
                4350, 4500, 4400, 4800, 4950,
              ],
            },
            {
              name: 'Chi phí',
              data: [
                800, 850, 900, 1000, 950, 1100, 1050, 1200, 1150, 1300, 1250, 1400, 1350, 1500,
                1450, 1600, 1550, 1700, 1800, 1750, 1900, 1850, 2000, 2100, 2050, 2200, 2150,
                2300, 2250, 2400, 2600,
              ],
            },
          ],
          chart: {
            height: chartHeight,
            width: '100%',
            type: 'bar',
            fontFamily: 'Be Vietnam Pro, sans-serif',
            toolbar: { show: false },
          },
          plotOptions: {
            bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 },
          },
          colors: [success, danger],
          dataLabels: { enabled: false },
          stroke: { show: true, width: 2, colors: ['transparent'] },
          fill: { opacity: 1 },
          xaxis: {
            categories: dates,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { style: { colors: slate400, fontSize: '12px' } },
          },
          yaxis: {
            labels: {
              formatter: (v: number) => `$${v.toLocaleString()}`,
              style: { colors: slate400, fontSize: '12px' },
            },
          },
          legend: { position: 'top', horizontalAlign: 'right' as const },
          tooltip: {
            y: { formatter: (v: number) => `$${v.toLocaleString()}` },
          },
        });
        chartsRef.current.main.render();
      }

      if (donutRef.current) {
        chartsRef.current.donut = new ApexCharts(donutRef.current, {
          series: [45, 25, 20, 10],
          labels: ['TikTok', 'Facebook', 'Impact', 'Goaff'],
          chart: {
            type: 'donut',
            height: chartHeight,
            width: '100%',
            fontFamily: 'Be Vietnam Pro, sans-serif',
          },
          colors: ['#000000', '#2563eb', '#ea580c', '#16a34a'],
          plotOptions: { pie: { donut: { size: '72%' } } },
          dataLabels: { enabled: false },
          legend: { position: 'bottom' },
          tooltip: { y: { formatter: (v: number) => `${v}%` } },
        });
        chartsRef.current.donut.render();
      }
    })();

    return () => {
      mounted = false;
      chartsRef.current.spark1?.destroy();
      chartsRef.current.spark2?.destroy();
      chartsRef.current.spark3?.destroy();
      chartsRef.current.spark4?.destroy();
      chartsRef.current.main?.destroy();
      chartsRef.current.donut?.destroy();
    };
  }, []);

  useEffect(() => {
    const resizeCharts = () => {
      const h = getFinanceChartHeight();
      const narrow = window.innerWidth < 768;
      const c = chartsRef.current;
      apexResize(c.spark1);
      apexResize(c.spark2);
      apexResize(c.spark3);
      apexResize(c.spark4);
      c.main?.updateOptions(
        {
          chart: { height: h, width: '100%' },
          xaxis: {
            ...(narrow ? { tickAmount: 8 } : {}),
            labels: {
              rotate: narrow ? -45 : 0,
              hideOverlappingLabels: true,
            },
          },
          legend: {
            position: narrow ? 'bottom' : 'top',
            horizontalAlign: narrow ? 'center' : 'right',
          },
        },
        false,
        true
      );
      c.donut?.updateOptions(
        {
          chart: { height: h, width: '100%' },
          legend: { position: narrow ? 'bottom' : 'bottom' },
        },
        false,
        true
      );
    };

    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(resizeCharts, 150);
    };

    window.addEventListener('resize', onResize);

    const nodes = [
      document.querySelector('.finance-page'),
      sparkRefs.revenue.current,
      sparkRefs.profit.current,
      sparkRefs.cost.current,
      sparkRefs.campaign.current,
      mainChartRef.current,
      donutRef.current,
    ].filter(Boolean) as HTMLElement[];

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(onResize)
        : null;
    nodes.forEach((el) => ro?.observe(el));

    const initTimer = setTimeout(resizeCharts, 400);

    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
      clearTimeout(initTimer);
      ro?.disconnect();
    };
  }, []);

  const renderCsvToRows = useCallback((csvText: string) => {
    const parsed = parseCSV(csvText);
    const customNets: { name: string; logo: string }[] = JSON.parse(
      localStorage.getItem('entdash_custom_nets') || '[]'
    );
    const newRows: AffiliateRow[] = [];

    parsed.forEach((row, idx) => {
      if (row.length < 4 || !row[0]?.trim()) return;
      if (idx === 0 && row[0].toLowerCase().includes('ng')) return;

      const net = row[1] || 'Network';
      const matched = customNets.find((n) => n.name === net);
      newRows.push({
        id: `${idx}-${Date.now()}`,
        date: row[0],
        source: net,
        sourceIcon: iconForNetwork(net, matched?.logo),
        clicks: row[2],
        conversion: row[3],
        commission: row[4] || '+$0.00',
        status: 'Đã lưu CSV',
        statusClass: 'purple-bg',
      });
    });

    if (newRows.length) setRows(newRows);
  }, []);

  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      fetch(`/Sample_Affiliate_Data.csv?time=${Date.now()}`)
        .then((r) => (r.ok ? r.text() : Promise.reject()))
        .then((data) => {
          if (data !== last && data.trim()) {
            last = data;
            renderCsvToRows(data);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [renderCsvToRows]);

  useEffect(() => {
    const saved = localStorage.getItem('entdash_custom_nets');
    if (saved) {
      try {
        const custom: { name: string }[] = JSON.parse(saved);
        setNetworks((prev) => [...prev, ...custom.map((c) => c.name).filter((n) => !prev.includes(n))]);
      } catch {
        /* ignore */
      }
    }
    setSheetUrl(localStorage.getItem('entdash_sheet_url') || '');
  }, []);

  const saveCustomNetwork = (file: File | null) => {
    const name = customNetName.trim();
    if (!name) {
      alert('Chưa nhập tên Network!');
      return;
    }
    if (!file) {
      alert('Chưa chọn ảnh Logo!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const logo = e.target?.result as string;
      const list: { name: string; logo: string }[] = JSON.parse(
        localStorage.getItem('entdash_custom_nets') || '[]'
      );
      list.push({ name, logo });
      localStorage.setItem('entdash_custom_nets', JSON.stringify(list));
      setNetworks((prev) => (prev.includes(name) ? prev : [...prev, name]));
      setCustomNetName('');
      setShowAddNet(false);
      alert('Đã lưu Nguồn và Logo thành công.');
    };
    reader.readAsDataURL(file);
  };

  const syncGoogleSheet = async (url: string) => {
    if (!url.startsWith('https://docs.google.com/')) {
      alert('Link không hợp lệ. Vui lòng nhập link Publish to web dạng CSV của Google Sheets.');
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Mạng có vấn đề hoặc sai Link');
      const text = await res.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) parsed.shift();
      const customNets: { name: string; logo: string }[] = JSON.parse(
        localStorage.getItem('entdash_custom_nets') || '[]'
      );
      const newRows: AffiliateRow[] = [];
      parsed.forEach((cols, i) => {
        if (cols.length < 4) return;
        const net = cols[1] || 'Network';
        const matched = customNets.find((n) => n.name === net);
        newRows.push({
          id: `sync-${i}`,
          date: cols[0] || '',
          source: net,
          sourceIcon: iconForNetwork(net, matched?.logo),
          clicks: cols[2] || '0',
          conversion: cols[3] || '0',
          commission: cols[4] || '$0.00',
          status: 'Đã đồng bộ',
          statusClass: 'purple-bg',
        });
      });
      setRows(newRows);
      localStorage.setItem('entdash_sheet_url', url);
      setSheetOpen(false);
    } catch (err) {
      alert(`Lỗi kết nối tới Google Sheets: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncClick = () => {
    const saved = localStorage.getItem('entdash_sheet_url');
    if (saved) {
      if (
        confirm(
          'Bạn đã cài đặt Link Auto-sync trước đó. Bạn muốn Tải dữ liệu ngay bây giờ?\n(OK = Tải, Cancel = cấu hình lại link)'
        )
      ) {
        syncGoogleSheet(saved);
      } else {
        setSheetUrl(saved);
        setSheetOpen(true);
      }
    } else {
      setSheetOpen(true);
    }
  };

  const exportExcel = () => {
    alert('File Excel đã được chuẩn bị và sẵn sàng tải xuống!');
  };

  return {
    timeFilter,
    showCustomDates,
    stats,
    rows,
    importOpen,
    setImportOpen,
    sheetOpen,
    setSheetOpen,
    showAddNet,
    setShowAddNet,
    customNetName,
    setCustomNetName,
    networks,
    sheetUrl,
    setSheetUrl,
    syncing,
    sparkRefs,
    mainChartRef,
    donutRef,
    onTimeFilterChange,
    applyTimeFilter,
    saveCustomNetwork,
    syncGoogleSheet,
    handleSyncClick,
    exportExcel,
  };
}
