import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { API_URL } from '../api.js';

const DOMAIN_COLORS = {
    ejecucion: '#2563EB',
    data: '#16A34A',
    ops: '#64748B',
    producto: '#7C3AED',
    gtm: '#FB923C',
    marketing: '#EC4899',
    content: '#0EA5E9',
    design: '#F59E0B',
    unknown: '#94A3B8',
};

export default function SkillUsageTracker() {
    const { t } = useLanguage();

    const [stats, setStats] = useState(null);
    const [topSkills, setTopSkills] = useState([]);
    const [byDomain, setByDomain] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [recent, setRecent] = useState([]);
    const [registry, setRegistry] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.all([
            fetch(`${API_URL}/skills/stats`).then(r => r.json()),
            fetch(`${API_URL}/skills/top`).then(r => r.json()),
            fetch(`${API_URL}/skills/by-domain`).then(r => r.json()),
            fetch(`${API_URL}/skills/timeline`).then(r => r.json()),
            fetch(`${API_URL}/skills/recent`).then(r => r.json()),
            fetch(`${API_URL}/skills/registry`).then(r => r.json()),
        ])
            .then(([statsData, topData, domainData, timelineData, recentData, registryData]) => {
                if (cancelled) return;
                setStats(statsData);
                setTopSkills(topData);
                setByDomain(domainData);
                setTimeline(timelineData.map(d => ({
                    ...d,
                    date: new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                })));
                setRecent(recentData);
                setRegistry(registryData);
            })
            .catch(err => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="dashboard-container animate-fade-in">
                <p className="subtitle">Cargando Skill Usage Tracker...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container animate-fade-in">
                <p style={{ color: '#ef4444' }}>Error: {error}</p>
            </div>
        );
    }

    // Build coverage map: which skills from registry have been invoked
    const invokedSkills = new Set(topSkills.map(s => s.skill_name));
    const invocationMap = Object.fromEntries(topSkills.map(s => [s.skill_name, s.invocation_count]));

    return (
        <div className="dashboard-container animate-fade-in">
            {/* Header */}
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '2rem' }}>🎯</span>
                    <div>
                        <h1 style={{ fontSize: '1.8rem' }}>Skill Usage Tracker</h1>
                        <p className="subtitle">Monitoreo de invocaciones de skills por agente, dominio y tendencia</p>
                    </div>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="intelligence-summary-grid" style={{ marginBottom: '28px' }}>
                <StatCard label="Total Invocaciones" value={stats?.total_invocations ?? 0} />
                <StatCard label="Skills Unicos" value={stats?.unique_skills ?? 0} />
                <StatCard
                    label="Success Rate"
                    value={`${stats?.success_rate ?? 0}%`}
                    accent={stats?.success_rate >= 80 ? '#16A34A' : '#FB923C'}
                />
                <StatCard
                    label="Avg Duration"
                    value={stats?.avg_duration_ms ? `${(stats.avg_duration_ms / 1000).toFixed(1)}s` : '—'}
                />
            </div>

            {/* Charts Row: Top Skills + Domain Pie */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
                {/* Top Skills Bar Chart */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem' }}>Top Skills</h3>
                    {topSkills.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topSkills} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis type="number" />
                                <YAxis
                                    type="category"
                                    dataKey="skill_name"
                                    width={140}
                                    tick={{ fontSize: 12, fill: '#64748B' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}
                                    formatter={(val, name) => [val, name === 'invocation_count' ? 'Invocaciones' : name]}
                                />
                                <Bar dataKey="invocation_count" fill="#2563EB" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="subtitle" style={{ textAlign: 'center', padding: '40px 0' }}>Sin datos de invocaciones</p>
                    )}
                </div>

                {/* Domain Pie Chart */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem' }}>Por Dominio</h3>
                    {byDomain.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={byDomain}
                                    dataKey="invocation_count"
                                    nameKey="domain"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ domain, invocation_count }) => `${domain} (${invocation_count})`}
                                >
                                    {byDomain.map((entry, i) => (
                                        <Cell key={i} fill={DOMAIN_COLORS[entry.domain] || DOMAIN_COLORS.unknown} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="subtitle" style={{ textAlign: 'center', padding: '40px 0' }}>Sin datos por dominio</p>
                    )}
                </div>
            </div>

            {/* Timeline Area Chart */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '28px' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem' }}>Tendencia Diaria (30 dias)</h3>
                {timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={timeline}>
                            <defs>
                                <linearGradient id="colorInvocations" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}
                                formatter={(val) => [val, 'Invocaciones']}
                            />
                            <Area
                                type="monotone"
                                dataKey="invocation_count"
                                stroke="#2563EB"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorInvocations)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="subtitle" style={{ textAlign: 'center', padding: '40px 0' }}>Sin datos de tendencia</p>
                )}
            </div>

            {/* Skill Coverage Table */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '28px' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem' }}>
                    Cobertura de Skills ({invokedSkills.size}/{registry.length} usados)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                    {registry.map((skill) => {
                        const used = invokedSkills.has(skill.name);
                        const count = invocationMap[skill.name] || 0;
                        return (
                            <div
                                key={skill.name}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '9999px',
                                    background: used ? '#DCFCE7' : '#F1F5F9',
                                    fontSize: '0.85rem',
                                }}
                            >
                                <span style={{ color: used ? '#16A34A' : '#94A3B8', fontWeight: 600 }}>
                                    {used ? '✓' : '○'}
                                </span>
                                <span style={{ color: '#0F172A', fontWeight: 500, flex: 1 }}>{skill.name}</span>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    background: DOMAIN_COLORS[skill.domain] || DOMAIN_COLORS.unknown,
                                    color: '#fff',
                                    fontWeight: 500,
                                }}>
                                    {skill.domain}
                                </span>
                                {count > 0 && (
                                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{count}x</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Invocations Table */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem' }}>
                    Invocaciones Recientes
                </h3>
                {recent.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                                    <th style={thStyle}>Skill</th>
                                    <th style={thStyle}>Dominio</th>
                                    <th style={thStyle}>Agente</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Duracion</th>
                                    <th style={thStyle}>Args</th>
                                    <th style={thStyle}>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.map((row) => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={tdStyle}>
                                            <span style={{ fontWeight: 500 }}>{row.skill_name}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '9999px',
                                                background: DOMAIN_COLORS[row.skill_domain] || DOMAIN_COLORS.unknown,
                                                color: '#fff',
                                                fontWeight: 500,
                                            }}>
                                                {row.skill_domain}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>{row.agent_name || row.agent_id}</td>
                                        <td style={tdStyle}>
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td style={tdStyle}>
                                            {row.duration_ms ? `${(row.duration_ms / 1000).toFixed(1)}s` : '—'}
                                        </td>
                                        <td style={{ ...tdStyle, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {row.arguments || '—'}
                                        </td>
                                        <td style={{ ...tdStyle, color: '#94A3B8' }}>
                                            {new Date(row.timestamp).toLocaleString('es-ES', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="subtitle" style={{ textAlign: 'center', padding: '20px 0' }}>Sin invocaciones registradas</p>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
    return (
        <div className="card intel-stat-card">
            <span className="intel-stat-lbl">{label}</span>
            <div className="intel-stat-main">
                <span className="intel-stat-val" style={accent ? { color: accent } : undefined}>{value}</span>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const isOk = status === 'completed';
    const isFail = status === 'failed';
    return (
        <span style={{
            fontSize: '0.75rem',
            padding: '2px 10px',
            borderRadius: '9999px',
            fontWeight: 500,
            background: isOk ? '#DCFCE7' : isFail ? '#FEE2E2' : '#FEF3C7',
            color: isOk ? '#16A34A' : isFail ? '#EF4444' : '#D97706',
        }}>
            {status}
        </span>
    );
}

const thStyle = {
    textAlign: 'left',
    padding: '10px 12px',
    fontWeight: 600,
    color: '#64748B',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const tdStyle = {
    padding: '10px 12px',
    color: '#0F172A',
};
