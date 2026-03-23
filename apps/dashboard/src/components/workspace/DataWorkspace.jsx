import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../api.js';
import { DATA_JOB_STATUS } from './artifactConstants.js';
import WsIcon from './WsIcon.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatShortDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = DATA_JOB_STATUS[status] || DATA_JOB_STATUS.idle;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            color: cfg.color, background: cfg.bg,
        }}>
            {status === 'running' && (
                <span style={{
                    width: 7, height: 7, borderRadius: '50%', background: cfg.color,
                    animation: 'dataPulse 1.4s ease-in-out infinite',
                }} />
            )}
            {cfg.label}
        </span>
    );
}

function QualityBar({ pct }) {
    const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
                height: '100%', width: `${pct}%`, background: color,
                borderRadius: 999, transition: 'width 0.6s ease',
            }} />
        </div>
    );
}

function Toast({ toast }) {
    if (!toast) return null;
    const bg = toast.type === 'error' ? '#fef2f2' : '#ecfdf5';
    const color = toast.type === 'error' ? '#ef4444' : '#10b981';
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: bg, color, border: `1px solid ${color}30`,
            padding: '12px 20px', borderRadius: 12, fontWeight: 600,
            fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
            {toast.msg}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SECTIONS = [
    { id: 'jobs',    label: 'Scraping Jobs' },
    { id: 'quality', label: 'Calidad de Datos' },
    { id: 'dedup',   label: 'Deduplicación' },
    { id: 'dataset', label: 'Dataset' },
];

export default function DataWorkspace({ agentId }) {
    const [jobs,        setJobs]        = useState([]);
    const [quality,     setQuality]     = useState(null);
    const [dedup,       setDedup]       = useState(null);
    const [dedupJob,    setDedupJob]    = useState(null);
    const [properties,  setProperties]  = useState({ total: 0, items: [] });
    const [loading,     setLoading]     = useState(true);
    const [section,     setSection]     = useState('jobs');
    const [toast,       setToast]       = useState(null);
    const [filters,     setFilters]     = useState({ zona: '', tipo: '', bedrooms: '', min_price: '', max_price: '' });

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    // ── Fetch helpers ─────────────────────────────────────────────────────────

    const fetchJobs = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/data/jobs`);
            if (r.ok) setJobs(await r.json());
        } catch { /* silent */ }
    }, []);

    const fetchQuality = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/data/quality`);
            if (r.ok) setQuality(await r.json());
        } catch { /* silent */ }
    }, []);

    const fetchDedup = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/data/dedup`);
            if (r.ok) setDedup(await r.json());
        } catch { /* silent */ }
    }, []);

    const fetchProperties = useCallback(async () => {
        try {
            const params = new URLSearchParams({ limit: 50, offset: 0 });
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
            const r = await fetch(`${API_URL}/data/properties?${params}`);
            if (r.ok) setProperties(await r.json());
        } catch { /* silent */ }
    }, [filters]);

    // ── Initial load ──────────────────────────────────────────────────────────

    useEffect(() => {
        Promise.all([fetchJobs(), fetchQuality(), fetchDedup(), fetchProperties()])
            .finally(() => setLoading(false));
    }, []);

    // ── Re-fetch properties when filters change ───────────────────────────────

    useEffect(() => {
        if (!loading) fetchProperties();
    }, [filters]);

    // ── Polling while jobs are running ────────────────────────────────────────

    useEffect(() => {
        const hasRunning = jobs.some(j => j.status === 'running') || dedupJob?.status === 'running';
        if (!hasRunning) return;
        const timer = setInterval(fetchJobs, 5000);
        return () => clearInterval(timer);
    }, [jobs, dedupJob]);

    // ── Actions ───────────────────────────────────────────────────────────────

    async function runJob(source) {
        try {
            const r = await fetch(`${API_URL}/data/jobs/${source}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'incremental' }),
            });
            if (r.ok) {
                showToast('Job iniciado — actualizando cada 5s');
                fetchJobs();
            } else {
                const e = await r.json();
                showToast(e.error || 'Error al iniciar job', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    }

    async function runDedup(mode) {
        try {
            const r = await fetch(`${API_URL}/data/dedup/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, tier: 'all' }),
            });
            if (r.ok) {
                const job = await r.json();
                setDedupJob(job);
                showToast(`Deduplicación ${mode} iniciada`);
            } else {
                const e = await r.json();
                showToast(e.error || 'Error al iniciar deduplicación', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    }

    async function handoffToContent(property) {
        try {
            const artRes = await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: 'data-agent',
                    type:     'property_listing',
                    title:    property.title || `Propiedad ${property.pf_id}`,
                    content:  JSON.stringify(property),
                    metadata: { pf_id: property.pf_id, source: 'data-workspace' },
                }),
            });
            if (!artRes.ok) { showToast('Error al crear artefacto', 'error'); return; }
            const artifact = await artRes.json();

            const hofRes = await fetch(`${API_URL}/artifacts/${artifact.id}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_agent_id: 'data-agent',
                    to_agent_id:   'content-agent',
                    instruction:   'Generar ficha de propiedad en español con descripción atractiva para inversores hispanohablantes',
                }),
            });
            if (hofRes.ok) {
                showToast('Enviado a Content Agent');
            } else {
                showToast('Error en handoff', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    }

    // ── Derived data ──────────────────────────────────────────────────────────

    const pfJob    = jobs.find(j => j.source === 'propertyfinder');
    const psJob    = jobs.find(j => j.source === 'panicselling');
    const bayutJob = jobs.find(j => j.source === 'bayut');

    const totalProps   = pfJob?.total    || 0;
    const totalDrops   = psJob?.total    || 0;
    const qualityScore = quality?.score_global ?? '…';
    const dupCount     = dedup?.total_duplicates ?? '…';

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                Cargando Pipeline Control…
            </div>
        );
    }

    return (
        <>
            {/* Pulse animation */}
            <style>{`
                @keyframes dataPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.85); }
                }
            `}</style>

            <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', maxWidth: 1200 }}>

                {/* ── Header ────────────────────────────────────────────── */}
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Pipeline Control
                    </h2>
                    <p style={{ color: '#64748b', marginTop: 4, fontSize: 13, margin: '4px 0 0' }}>
                        Control de scraping, calidad de datos y deduplicación del Data Agent
                    </p>
                </div>

                {/* ── Stats bar ─────────────────────────────────────────── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 14, marginBottom: 28,
                }}>
                    {[
                        { label: 'Propiedades', value: totalProps.toLocaleString(), icon: 'home',        sub: 'PropertyFinder' },
                        { label: 'Price Drops',  value: totalDrops.toLocaleString(), icon: 'trending-down', sub: 'PanicSelling'   },
                        { label: 'Calidad',      value: typeof qualityScore === 'number' ? `${qualityScore}%` : qualityScore, icon: 'check-square', sub: 'Global'  },
                        { label: 'Duplicados',   value: typeof dupCount === 'number' ? dupCount.toLocaleString() : dupCount, icon: 'layers', sub: 'Detectados' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: '#fff', border: '1px solid #e2e8f0',
                            borderRadius: 12, padding: '16px 18px',
                        }}>
                            <div style={{ marginBottom: 8, color: '#94a3b8' }}><WsIcon name={s.icon} size={20} /></div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {s.label} · {s.sub}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Section tabs ──────────────────────────────────────── */}
                <div style={{
                    display: 'flex', gap: 2, borderBottom: '1px solid #e2e8f0',
                    marginBottom: 24,
                }}>
                    {SECTIONS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSection(tab.id)}
                            style={{
                                padding: '8px 16px', border: 'none', cursor: 'pointer',
                                background: 'transparent', fontSize: 13,
                                fontWeight: section === tab.id ? 600 : 400,
                                color: section === tab.id ? '#2563eb' : '#64748b',
                                borderBottom: section === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                                marginBottom: -1, borderRadius: '6px 6px 0 0',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ──────────────────────────────────────────────────────── */}
                {/* SECTION 1: Scraping Jobs                                */}
                {/* ──────────────────────────────────────────────────────── */}
                {section === 'jobs' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 16,
                    }}>
                        {[
                            { job: pfJob,    source: 'propertyfinder', label: 'PropertyFinder', icon: 'home',         desc: 'Propiedades residenciales y comerciales de UAE' },
                            { job: psJob,    source: 'panicselling',   label: 'PanicSelling',   icon: 'trending-down', desc: 'Price drops de propiedades de lujo en Dubai' },
                            { job: bayutJob, source: 'bayut',          label: 'Bayut',           icon: 'search',        desc: 'Portal inmobiliario alternativo de UAE' },
                        ].map(({ job, source, label, icon, desc }) => (
                            <div key={source} style={{
                                background: '#fff', border: '1px solid #e2e8f0',
                                borderRadius: 16, padding: 22,
                                opacity: source === 'bayut' ? 0.65 : 1,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                    <span style={{ color: '#64748b' }}><WsIcon name={icon} size={24} /></span>
                                    <StatusBadge status={job?.status || 'idle'} />
                                </div>

                                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{label}</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{desc}</div>

                                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
                                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 16, marginTop: 2 }}>
                                            {(job?.total || 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
                                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Último run</div>
                                        <div style={{ fontWeight: 500, color: '#475569', fontSize: 11, marginTop: 2 }}>
                                            {formatDate(job?.last_run_at)}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => runJob(source)}
                                    disabled={source === 'bayut' || job?.status === 'running'}
                                    style={{
                                        width: '100%', padding: '9px 0', borderRadius: 8,
                                        border: source === 'bayut' ? '1px solid #e2e8f0' : 'none',
                                        background: source === 'bayut' ? '#f8fafc' : '#2563eb',
                                        color: source === 'bayut' ? '#94a3b8' : '#fff',
                                        fontWeight: 600, fontSize: 13, cursor: source === 'bayut' ? 'not-allowed' : 'pointer',
                                        opacity: job?.status === 'running' ? 0.6 : 1,
                                        transition: 'opacity 0.2s',
                                    }}
                                >
                                    {job?.status === 'running'
                                        ? 'Ejecutando…'
                                        : source === 'bayut'
                                            ? 'Próximamente'
                                            : 'Run Now'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* SECTION 2: Data Quality                                 */}
                {/* ──────────────────────────────────────────────────────── */}
                {section === 'quality' && quality && (
                    <div>
                        {/* Global gauge card */}
                        <div style={{
                            background: '#fff', border: '1px solid #e2e8f0',
                            borderRadius: 16, padding: '24px 28px', marginBottom: 16,
                            display: 'flex', alignItems: 'center', gap: 28,
                        }}>
                            {/* Conic gauge */}
                            <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                <div style={{
                                    width: 88, height: 88, borderRadius: '50%',
                                    background: `conic-gradient(
                                        ${qualityScore >= 80 ? '#10b981' : qualityScore >= 50 ? '#f59e0b' : '#ef4444'}
                                        ${qualityScore * 3.6}deg, #e2e8f0 0deg)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 8px',
                                }}>
                                    <div style={{
                                        background: '#fff', width: 62, height: 62, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{qualityScore}%</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Score Global</div>
                            </div>

                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>
                                    {quality.total.toLocaleString()} propiedades auditadas
                                </div>
                                <div style={{ fontSize: 13, color: '#64748b' }}>
                                    Los campos faltantes reducen el ranking en el buscador y la tasa de conversión de fichas.
                                </div>
                            </div>
                        </div>

                        {/* Per-field breakdown */}
                        <div style={{
                            background: '#fff', border: '1px solid #e2e8f0',
                            borderRadius: 16, padding: '20px 24px',
                        }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 18 }}>
                                Completitud por campo
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {quality.fields.map(f => (
                                    <div key={f.field}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{f.label}</span>
                                            <span style={{
                                                fontSize: 13, fontWeight: 700,
                                                color: f.pct >= 80 ? '#10b981' : f.pct >= 50 ? '#f59e0b' : '#ef4444',
                                            }}>
                                                {f.pct}% &nbsp;
                                                <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>
                                                    ({f.count.toLocaleString()})
                                                </span>
                                            </span>
                                        </div>
                                        <QualityBar pct={f.pct} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {section === 'quality' && !quality && (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40, fontSize: 14 }}>
                        No hay datos de calidad disponibles — asegúrate de que la tabla properties existe.
                    </div>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* SECTION 3: Deduplication                                */}
                {/* ──────────────────────────────────────────────────────── */}
                {section === 'dedup' && dedup && (
                    <div>
                        {/* Tier stats */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 14, marginBottom: 16,
                        }}>
                            {[
                                { tier: 'Tier 1', desc: 'RERA idéntico',                              count: dedup.tiers?.tier1 || 0, color: '#10b981', conf: '99.9%' },
                                { tier: 'Tier 2', desc: 'Edificio + zona + camas + precio (±5%)',     count: dedup.tiers?.tier2 || 0, color: '#f59e0b', conf: '95%'   },
                                { tier: 'Tier 3', desc: 'GPS (~50 m) + camas + tamaño (±1%)',         count: dedup.tiers?.tier3 || 0, color: '#3b82f6', conf: '85%'   },
                            ].map(t => (
                                <div key={t.tier} style={{
                                    background: '#fff', border: '1px solid #e2e8f0',
                                    borderRadius: 14, padding: '18px 20px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{t.tier}</span>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600, color: t.color,
                                            background: `${t.color}18`, padding: '2px 8px', borderRadius: 999,
                                        }}>
                                            {t.conf} confianza
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                                        {t.count.toLocaleString()}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.desc}</div>
                                </div>
                            ))}
                        </div>

                        {/* Summary + actions */}
                        <div style={{
                            background: '#fff', border: '1px solid #e2e8f0',
                            borderRadius: 16, padding: '20px 24px',
                        }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', flexWrap: 'wrap', gap: 16,
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 3 }}>
                                        {dedup.total_duplicates.toLocaleString()} duplicados
                                        &nbsp;·&nbsp;
                                        {dedup.total_groups.toLocaleString()} grupos
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>
                                        Último análisis: {dedup.last_run_at ? formatDate(dedup.last_run_at) : 'Nunca ejecutado'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        onClick={() => runDedup('dry-run')}
                                        disabled={dedupJob?.status === 'running'}
                                        style={{
                                            padding: '9px 18px', borderRadius: 8,
                                            border: '1.5px solid #2563eb', background: '#fff',
                                            color: '#2563eb', fontWeight: 600, fontSize: 13,
                                            cursor: 'pointer', opacity: dedupJob?.status === 'running' ? 0.5 : 1,
                                        }}
                                    >
                                        Dry Run
                                    </button>
                                    <button
                                        onClick={() => runDedup('mark')}
                                        disabled={dedupJob?.status === 'running'}
                                        style={{
                                            padding: '9px 18px', borderRadius: 8,
                                            border: 'none', background: '#2563eb',
                                            color: '#fff', fontWeight: 600, fontSize: 13,
                                            cursor: 'pointer', opacity: dedupJob?.status === 'running' ? 0.5 : 1,
                                        }}
                                    >
                                        Mark Duplicates
                                    </button>
                                </div>
                            </div>

                            {dedupJob && (
                                <div style={{
                                    marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                                    background: dedupJob.status === 'running' ? '#fffbeb'
                                              : dedupJob.status === 'done'    ? '#ecfdf5'
                                              : '#fef2f2',
                                    color: dedupJob.status === 'running' ? '#92400e'
                                         : dedupJob.status === 'done'    ? '#065f46'
                                         : '#991b1b',
                                }}>
                                    {dedupJob.status === 'running' && 'Deduplicación en curso…'}
                                    {dedupJob.status === 'done'    && 'Deduplicación completada'}
                                    {dedupJob.status === 'error'   && 'Error en deduplicación'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {section === 'dedup' && !dedup && (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40, fontSize: 14 }}>
                        No hay datos de deduplicación disponibles.
                    </div>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* SECTION 4: Dataset Table                                */}
                {/* ──────────────────────────────────────────────────────── */}
                {section === 'dataset' && (
                    <div>
                        {/* Filters */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                            {[
                                { key: 'zona',      placeholder: 'Zona (Dubai Marina…)' },
                                { key: 'tipo',      placeholder: 'Tipo (Apartment, Villa…)' },
                                { key: 'bedrooms',  placeholder: 'Habitaciones' },
                                { key: 'min_price', placeholder: 'Precio mín AED' },
                                { key: 'max_price', placeholder: 'Precio máx AED' },
                            ].map(f => (
                                <input
                                    key={f.key}
                                    placeholder={f.placeholder}
                                    value={filters[f.key]}
                                    onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                                    style={{
                                        padding: '8px 14px', borderRadius: 8,
                                        border: '1px solid #e2e8f0', fontSize: 13,
                                        background: '#fff', color: '#0f172a',
                                        outline: 'none', minWidth: 160,
                                    }}
                                />
                            ))}
                            <button
                                onClick={() => setFilters({ zona: '', tipo: '', bedrooms: '', min_price: '', max_price: '' })}
                                style={{
                                    padding: '8px 14px', borderRadius: 8,
                                    border: '1px solid #e2e8f0', background: '#fff',
                                    color: '#64748b', fontSize: 13, cursor: 'pointer',
                                }}
                            >
                                Limpiar
                            </button>
                        </div>

                        {/* Count */}
                        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
                            {properties.total.toLocaleString()} propiedades · mostrando {properties.items.length}
                        </div>

                        {/* Table */}
                        <div style={{
                            background: '#fff', border: '1px solid #e2e8f0',
                            borderRadius: 14, overflow: 'hidden',
                        }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                            {['Propiedad', 'Zona', 'Tipo', 'Camas', 'Precio AED', 'Scraped', 'Acciones'].map(h => (
                                                <th key={h} style={{
                                                    padding: '11px 16px', textAlign: 'left',
                                                    color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap',
                                                }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {properties.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                                    No hay propiedades con los filtros seleccionados
                                                </td>
                                            </tr>
                                        ) : properties.items.map((p, i) => (
                                            <tr key={p.pf_id || i} style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                transition: 'background 0.15s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = ''}
                                            >
                                                <td style={{ padding: '11px 16px', maxWidth: 220 }}>
                                                    <div style={{
                                                        fontWeight: 600, color: '#0f172a',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {p.title || '(sin título)'}
                                                    </div>
                                                    {p.is_off_plan && (
                                                        <span style={{
                                                            fontSize: 10, fontWeight: 600, color: '#2563eb',
                                                            background: '#eff6ff', padding: '1px 6px', borderRadius: 999,
                                                            display: 'inline-block', marginTop: 3,
                                                        }}>
                                                            Off-Plan
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '11px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                                                    {p.community_name || p.display_address?.split(',')[0] || '—'}
                                                </td>
                                                <td style={{ padding: '11px 16px', color: '#475569' }}>
                                                    {p.property_type || '—'}
                                                </td>
                                                <td style={{ padding: '11px 16px', color: '#475569', textAlign: 'center' }}>
                                                    {p.bedrooms_value ?? '—'}
                                                </td>
                                                <td style={{ padding: '11px 16px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {p.price_aed ? new Intl.NumberFormat('en-US').format(p.price_aed) : '—'}
                                                </td>
                                                <td style={{ padding: '11px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                    {formatShortDate(p.scraped_at)}
                                                </td>
                                                <td style={{ padding: '11px 16px' }}>
                                                    <button
                                                        onClick={() => handoffToContent(p)}
                                                        style={{
                                                            padding: '4px 12px', borderRadius: 6,
                                                            border: '1px solid #2563eb', background: '#fff',
                                                            color: '#2563eb', fontSize: 12, fontWeight: 600,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        → Content
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Toast notification */}
            <Toast toast={toast} />
        </>
    );
}
