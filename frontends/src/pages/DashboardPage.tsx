import { TelegramLinkBanner } from '../components/dashboard/TelegramLinkBanner';

import { useDashboardActivity } from '../hooks/useDashboardActivity';

import { useDashboardFilter } from '../hooks/useDashboardFilter';



export function DashboardPage() {

  const activity = useDashboardActivity();

  const {

    filter,

    showCustom,

    stats,

    costLabel,

    revenueLabel,

    progress,

    barHeights,

    trends,

    onFilterChange,

    applyCustom,

    exportReport,

    displayCurrency,

    setDisplayCurrency,

  } = useDashboardFilter({

    onRealtime: () => {

      void activity.refresh({ silent: true });

    },

  });



  const { items: activities, loading: activityLoading, formatTime } = activity;



  const barPairs = [];

  for (let i = 0; i < barHeights.length; i += 2) {

    barPairs.push([barHeights[i], barHeights[i + 1] ?? 40]);

  }



  return (

    <div className="content-wrapper">

      <div className="page-header">

        <h2 className="page-title">Tổng quan doanh nghiệp</h2>

        <div

          style={{

            display: 'flex',

            gap: 12,

            flexWrap: 'wrap',

            alignItems: 'center',

          }}

        >

          <select
            className="btn btn-outline"
            style={{ appearance: 'auto', cursor: 'pointer' }}
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as typeof displayCurrency)}
            aria-label="Đơn vị hiển thị"
          >
            <option value="USD">USD ($)</option>
            <option value="VND">VND (₫)</option>
          </select>

          <select

            className="btn btn-outline"

            style={{ appearance: 'auto', cursor: 'pointer' }}

            value={filter}

            onChange={(e) => onFilterChange(e.target.value)}

          >

            <option value="month">Tháng này</option>

            <option value="day">Hôm nay</option>

            <option value="yesterday">Hôm qua</option>

            <option value="week">Tuần này</option>

            <option value="year">Năm nay</option>

            <option value="custom">Tùy chỉnh...</option>

          </select>

          {showCustom && (

            <div

              style={{

                display: 'flex',

                alignItems: 'center',

                gap: 8,

                border: '1px solid var(--border-color)',

                borderRadius: 6,

                padding: '0 8px',

                background: 'var(--surface)',

              }}

            >

              <input type="date" style={{ border: 'none', outline: 'none', background: 'transparent', padding: '8px 4px', fontFamily: 'inherit', fontSize: 'var(--font-sm)' }} />

              <span style={{ color: 'var(--slate-400)' }}>-</span>

              <input type="date" style={{ border: 'none', outline: 'none', background: 'transparent', padding: '8px 4px', fontFamily: 'inherit', fontSize: 'var(--font-sm)' }} />

              <button type="button" onClick={applyCustom} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)' }}>

                <i className="bx bx-check" style={{ fontSize: 20 }} />

              </button>

            </div>

          )}

          <button
            type="button"
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => exportReport(activities)}
          >
            <i className="bx bx-export" /> Xuất báo cáo
          </button>

        </div>

      </div>



      <TelegramLinkBanner />



      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-header">

            <div className="stat-details">

              <p>{revenueLabel}</p>

              <h3>{stats.revenue}</h3>

            </div>

            <div className="stat-icon indigo-bg">

              <i className="bx bx-wallet" />

            </div>

          </div>

          <div className="stat-footer">

            <span className={`trend ${trends[0]?.positive ? 'positive' : 'negative'}`}>

              <i className={`bx bx-trending-${trends[0]?.positive ? 'up' : 'down'}`} />{' '}

              {trends[0]?.positive ? '+' : '-'}

              {trends[0]?.value}%

            </span>

            <span className="text-muted">{stats.labelSuffix}</span>

          </div>

        </div>



        <div className="stat-card">

          <div className="stat-header">

            <div className="stat-details">

              <p>{costLabel}</p>

              <h3>{stats.costs}</h3>

            </div>

            <div className="stat-icon slate-bg">

              <i className="bx bx-receipt" />

            </div>

          </div>

          <div className="stat-footer">

            <span className={`trend ${trends[1]?.positive ? 'positive' : 'negative'}`}>

              <i className={`bx bx-trending-${trends[1]?.positive ? 'up' : 'down'}`} />{' '}

              {trends[1]?.positive ? '+' : '-'}

              {trends[1]?.value}%

            </span>

            <span className="text-muted">{stats.labelSuffix}</span>

          </div>

        </div>



        <div className="stat-card">

          <div className="stat-header">

            <div className="stat-details">

              <p>Tiến độ công việc</p>

              <h3>{stats.progressPct}</h3>

            </div>

            <div className="stat-icon purple-bg">

              <i className="bx bx-task" />

            </div>

          </div>

          <div className="stat-footer stat-footer--stacked">

            <div className="progress-bar-container">

              <div className="progress-bar" style={{ width: `${progress}%` }} />

            </div>

            <span className="text-muted">

              {stats.taskTotal > 0

                ? `${stats.taskDone}/${stats.taskTotal} công việc đã giao hoàn thành (có hạn trong kỳ)`

                : 'Không có công việc có hạn trong kỳ'}

            </span>

          </div>

        </div>



        <div className="stat-card">

          <div className="stat-header">

            <div className="stat-details">

              <p>Lợi nhuận ròng</p>

              <h3>{stats.profit}</h3>

            </div>

            <div className="stat-icon green-bg">

              <i className="bx bx-bar-chart-alt-2" />

            </div>

          </div>

          <div className="stat-footer">

            <span className={`trend ${trends[2]?.positive ? 'positive' : 'negative'}`}>

              <i className={`bx bx-trending-${trends[2]?.positive ? 'up' : 'down'}`} />{' '}

              {trends[2]?.positive ? '+' : '-'}

              {trends[2]?.value}%

            </span>

            <span className="text-muted">{stats.labelSuffix}</span>

          </div>

        </div>

      </div>



      <div className="charts-grid">

        <div className="chart-card data-chart">

          <div className="card-header">

            <h3>Thống kê doanh thu & chi phí</h3>

            <button type="button" className="icon-btn">

              <i className="bx bx-dots-vertical-rounded" />

            </button>

          </div>

          <div className="chart-placeholder">

            <div className="chart-grid-bg" />

            <div className="bars">

              {barPairs.slice(0, 6).map((pair, idx) => (

                <div key={idx} className="bar-group">

                  <div className="bar-item bar-indigo" style={{ height: `${pair[0]}%` }} />

                  <div className="bar-item bar-slate" style={{ height: `${pair[1]}%` }} />

                </div>

              ))}

            </div>

            <div className="x-axis-labels">

              {stats.xAxis.map((l) => (

                <span key={l}>{l}</span>

              ))}

            </div>

          </div>

        </div>



        <div className="chart-card recent-activity">

          <div className="card-header">

            <h3>Hoạt động gần đây</h3>

          </div>

          {activityLoading ? (

            <p className="activity-empty">Đang tải...</p>

          ) : activities.length === 0 ? (

            <p className="activity-empty">Chưa có hoạt động nào</p>

          ) : (

            <div className="activity-scroll">

              <ul className="activity-list">

                {activities.map((item) => (

                  <li key={item.id}>

                    <div className={`activity-dot ${item.dotClass}`} />

                    <div className="activity-content">

                      <p>

                        <strong>{item.actor}</strong> {item.text}{' '}

                        <em>{item.detail}</em>

                      </p>

                      <span className="time">{formatTime(item.createdAt)}</span>

                    </div>

                  </li>

                ))}

              </ul>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}


