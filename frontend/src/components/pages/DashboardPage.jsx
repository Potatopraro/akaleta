import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import api from '../../utils/api';
import { format, parseISO } from 'date-fns';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/progress')
    ]).then(([statsRes, progressRes]) => {
      setData(statsRes.data);
      setProgress(progressRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  const chartData = (data?.dailyActivity || []).map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    translations: d.count,
    accuracy: d.avgConf
  }));

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = weekDays.map((day, i) => {
    const found = progress?.weeklyStats?.find(s => s._id === i + 1);
    return { day, count: found?.count || 0 };
  });

  const progressData = [
    { name: 'Overall', value: progress?.progress?.overall?.percentage || 0, fill: '#00ff9d' },
    { name: 'Alphabet', value: progress?.progress?.alphabet?.percentage || 0, fill: '#6366f1' },
  ];

  const streakDays = data?.user?.streak || 0;

  return (
    <div className="dashboard-page">
      {/* ── Welcome Banner ── */}
      <div className="welcome-banner">
        <div className="welcome-left">
          <p className="welcome-greeting">Good {getTimeOfDay()}, 👋</p>
          <h1 className="welcome-name">{data?.user?.fullName}</h1>
          <p className="welcome-sub">Keep practicing — you're making great progress with Nigerian Sign Language!</p>
        </div>
        <div className="streak-widget">
          <div className="streak-fire">🔥</div>
          <div className="streak-number">{streakDays}</div>
          <div className="streak-label">Day Streak</div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="stats-grid">
        <StatCard icon="🖐️" label="Total Translations" value={data?.stats?.totalTranslations || 0} accent />
        <StatCard icon="🎯" label="Avg Accuracy" value={`${data?.stats?.avgConfidence || 0}%`} />
        <StatCard icon="📚" label="Signs Practiced" value={`${data?.stats?.uniqueSignsPracticed || 0}/137`} />
        <StatCard icon="💬" label="Chat Sessions" value={data?.stats?.chatSessions || 0} />
        <StatCard icon="🔖" label="Saved Signs" value={data?.stats?.savedTranslations || 0} />
        <StatCard icon="📅" label="Member Since" value={data?.user?.joinDate ? format(new Date(data.user.joinDate), 'MMM yyyy') : '—'} />
      </div>

      <div className="dashboard-grid">
        {/* ── Activity Chart ── */}
        <div className="card dashboard-card span-2">
          <div className="card-header">
            <h3 className="card-title">Translation Activity</h3>
            <span className="badge badge-accent">Last 30 days</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTranslations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ff9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e8eaf6' }}
                  itemStyle={{ color: '#00ff9d' }}
                />
                <Area type="monotone" dataKey="translations" stroke="#00ff9d" strokeWidth={2} fill="url(#gradTranslations)" name="Translations" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Start translating to see your activity chart" />
          )}
        </div>

        {/* ── Weekly Breakdown ── */}
        <div className="card dashboard-card">
          <div className="card-header">
            <h3 className="card-title">This Week</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'rgba(0,255,157,0.05)' }}
              />
              <Bar dataKey="count" fill="#00ff9d" radius={[4, 4, 0, 0]} name="Translations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Progress Rings ── */}
        <div className="card dashboard-card">
          <div className="card-header">
            <h3 className="card-title">Learning Progress</h3>
          </div>
          <div className="progress-rings">
            <div style={{ position: 'relative', height: 140 }}>
              <ResponsiveContainer width="100%" height={140}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={progressData} startAngle={90} endAngle={-270}>
                  <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={4} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v}%`, '']}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="progress-legend">
              {progressData.map(p => (
                <div key={p.name} className="progress-legend-item">
                  <div className="progress-legend-dot" style={{ background: p.fill }} />
                  <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{p.name}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: p.fill }}>{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Top Signs ── */}
        <div className="card dashboard-card">
          <div className="card-header">
            <h3 className="card-title">🏆 Top Signs</h3>
          </div>
          {data?.topSigns?.length > 0 ? (
            <div className="top-signs-list">
              {data.topSigns.map((item, i) => (
                <div key={item.sign} className="top-sign-item">
                  <div className="rank-badge">{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.sign}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{item.count}×</span>
                    </div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${item.avgConf}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>
              Practice signs to see your top 5 here
            </p>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div className="card dashboard-card span-2">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
          </div>
          {data?.recentActivity?.length > 0 ? (
            <div className="activity-list">
              {data.recentActivity.map(item => (
                <div key={item._id} className="activity-item">
                  <div className="activity-icon">🖐️</div>
                  <div className="activity-content">
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      Detected <span className="text-accent">"{item.detectedSign}"</span>
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {item.mode.replace('_', ' ')} · {item.confidence}% confidence
                    </p>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                    {format(new Date(item.createdAt), 'MMM d, HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="activity-empty">
              <span>🖐️</span>
              <p>No recent activity. Start translating signs!</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .dashboard-page { display: flex; flex-direction: column; gap: 24px; }

        .welcome-banner {
          background: linear-gradient(135deg, var(--bg-card), var(--bg-elevated));
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-lg);
          padding: 28px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          position: relative;
          overflow: hidden;
        }

        .welcome-banner::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(0,255,157,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .welcome-greeting { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px; }
        .welcome-name { font-family: var(--font-display); font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; }
        .welcome-sub { font-size: 0.85rem; color: var(--text-secondary); margin-top: 6px; }

        .streak-widget {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: var(--accent-subtle);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius);
          padding: 16px 24px;
          flex-shrink: 0;
        }

        .streak-fire { font-size: 2rem; }
        .streak-number { font-family: var(--font-mono); font-size: 2.5rem; font-weight: 700; color: var(--accent); line-height: 1; }
        .streak-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .dashboard-card { display: flex; flex-direction: column; gap: 14px; }
        .span-2 { grid-column: span 2; }

        .card-header { display: flex; align-items: center; justify-content: space-between; }
        .card-title { font-weight: 700; font-size: 0.95rem; }

        .progress-rings { display: flex; flex-direction: column; gap: 10px; }
        .progress-legend { display: flex; flex-direction: column; gap: 8px; }
        .progress-legend-item { display: flex; align-items: center; gap: 8px; }
        .progress-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

        .top-signs-list { display: flex; flex-direction: column; gap: 10px; }
        .top-sign-item { display: flex; align-items: center; gap: 10px; }
        .rank-badge {
          width: 24px; height: 24px;
          background: var(--bg-elevated);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--accent);
          flex-shrink: 0;
          font-family: var(--font-mono);
        }

        .activity-list { display: flex; flex-direction: column; gap: 8px; }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-elevated);
          border-radius: var(--radius-sm);
        }
        .activity-icon { font-size: 1.2rem; flex-shrink: 0; }
        .activity-content { flex: 1; }
        .activity-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; color: var(--text-secondary); font-size: 0.9rem; }

        @media (max-width: 1100px) {
          .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 700px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .span-2 { grid-column: span 1; }
          .welcome-banner { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value" style={accent ? {} : { color: 'var(--text-primary)', fontSize: '1.6rem' }}>{value}</div>
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: '0.85rem', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: '1.5rem' }}>📊</span>
      <p>{message}</p>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
