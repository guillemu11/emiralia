import { useState, useEffect } from 'react';
import { API_URL } from '../../api.js';
import ArtifactCard from './ArtifactCard.jsx';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import { ANALYTICS_REPORT_TYPES, FUNNEL_STAGES } from './artifactConstants.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showToastFor(setToast, msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
}

function TrendPill({ value }) {
    if (value === null || value === undefined || value === '—') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    const positive = num >= 0;
    return (
        <span style={{
            display: 'inline-block',
            marginTop: '4px',
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: positive ? '#ecfdf5' : '#fef2f2',
            color: positive ? '#16a34a' : '#ef4444',
        }}>
            {positive ? '+' : ''}{num.toFixed(1)}% MoM
        </span>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsWorkspace({ agentId, agent }) {
    const [artifacts, setArtifacts]             = useState([]);
    const [stats, setStats]                     = useState(null);
    const [loading, setLoading]                 = useState(true);
    const [filter, setFilter]                   = useState({ type: 'all', status: 'all' });
    const [previewArtifact, setPreviewArtifact] = useState(null);
    const [editArtifact, setEditArtifact]       = useState(null);
    const [showWizard, setShowWizard]           = useState(false);
    const [wizardStep, setWizardStep]           = useState(1);
    const [wizard, setWizard]                   = useState({
        type: 'kpi_snapshot',
        period: 'week',
        zone: '',
        competitors: 'ambos',
        property_type: '2BR',
        date_from: '',
        date_to: '',
    });
    const [generating, setGenerating]           = useState(false);
    const [toast, setToast]                     = useState(null);
    const [editForm, setEditForm]               = useState({ title: '', content: '' });
    const [activeSection, setActiveSection]     = useState('kpis');

    // ─── Fetch ────────────────────────────────────────────────────────────────

    async function fetchArtifacts() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ agent_id: agentId, limit: 100 });
            if (filter.type   !== 'all') params.set('type',   filter.type);
            if (filter.status !== 'all') params.set('status', filter.status);
            const res = await fetch(`${API_URL}/artifacts?${params}`);
            const data = await res.json();
            setArtifacts(data);
        } catch (e) {
            console.error('fetchArtifacts', e);
        } finally {
            setLoading(false);
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/artifacts/stats?agent_id=${agentId}`);
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error('fetchStats', e);
        }
    }

    useEffect(() => {
        fetchArtifacts();
        fetchStats();
    }, [agentId, filter]);

    // ─── Derived data from artifacts (no extra API calls) ─────────────────────

    function getLatestKpiData() {
        const snap = artifacts
            .filter(a => a.type === 'kpi_snapshot' && ['approved', 'published'].includes(a.status))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        if (!snap) return null;
        return { artifact: snap, meta: snap.metadata || {} };
    }

    function getLatestFunnelData() {
        const funnel = artifacts
            .filter(a => a.type === 'funnel_analysis' && ['approved', 'published'].includes(a.status))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        if (!funnel) return null;
        const stages = funnel.metadata?.stages || {};
        return { artifact: funnel, stages };
    }

    function getPropertyPerformanceRows() {
        const benchmarks = artifacts.filter(a => a.type === 'market_benchmark' && a.status !== 'rejected');
        const rows = [];
        benchmarks.forEach(a => {
            const props = a.metadata?.properties;
            if (Array.isArray(props)) rows.push(...props);
        });
        return rows;
    }

    function getDeveloperRows() {
        return artifacts
            .filter(a => a.type === 'report' && a.metadata?.developer_id)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // ─── Artifact actions ─────────────────────────────────────────────────────

    async function handleStatusChange(artifactId, newStatus, reason) {
        try {
            await fetch(`${API_URL}/artifacts/${artifactId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, rejection_reason: reason }),
            });
            showToastFor(setToast, `Estado actualizado a "${newStatus}"`);
            fetchArtifacts();
            fetchStats();
        } catch (e) {
            showToastFor(setToast, 'Error al cambiar estado', 'error');
        }
    }

    async function handleEdit(artifact) {
        setEditForm({ title: artifact.title || '', content: artifact.content || '' });
        setEditArtifact(artifact);
    }

    async function handleEditSave() {
        try {
            await fetch(`${API_URL}/artifacts/${editArtifact.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            showToastFor(setToast, 'Reporte actualizado');
            setEditArtifact(null);
            fetchArtifacts();
        } catch (e) {
            showToastFor(setToast, 'Error al guardar', 'error');
        }
    }

    async function handlePublish(artifact, destination) {
        try {
            await fetch(`${API_URL}/artifacts/${artifact.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination }),
            });
            showToastFor(setToast, `Enviado a ${destination}`);
        } catch (e) {
            showToastFor(setToast, 'Error al publicar', 'error');
        }
    }

    async function handleHandoff(artifact, toAgentId, instruction) {
        try {
            await fetch(`${API_URL}/artifacts/${artifact.id}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_agent_id: toAgentId, instruction }),
            });
            showToastFor(setToast, `Enviado a ${toAgentId}`);
        } catch (e) {
            showToastFor(setToast, 'Error en handoff', 'error');
        }
    }

    // ─── Wizard ───────────────────────────────────────────────────────────────

    function openWizardForType(type) {
        setWizard(w => ({ ...w, type }));
        setWizardStep(1);
        setShowWizard(true);
    }

    async function handleGenerate() {
        setGenerating(true);
        try {
            const reportType = ANALYTICS_REPORT_TYPES.find(r => r.id === wizard.type);
            const title = `[Generando] ${reportType.label} — ${wizard.period || wizard.zone || new Date().toLocaleDateString('es-ES')}`;
            const res = await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: wizard.type,
                    title,
                    content: '',
                    metadata: {
                        period:        wizard.period,
                        zone:          wizard.zone,
                        competitors:   wizard.competitors,
                        property_type: wizard.property_type,
                        date_from:     wizard.date_from,
                        date_to:       wizard.date_to,
                    },
                }),
            });
            const draft = await res.json();

            const skill = reportType.skill;
            const prompt = `${skill} período:${wizard.period} zona:"${wizard.zone}" competitors:${wizard.competitors} property_type:${wizard.property_type} artifact_id:${draft.id}`;
            fetch(`${API_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt }),
            });

            setShowWizard(false);
            setWizardStep(1);
            showToastFor(setToast, 'Generando reporte...');
            setTimeout(fetchArtifacts, 2000);
        } catch (e) {
            showToastFor(setToast, 'Error al iniciar generación', 'error');
        } finally {
            setGenerating(false);
        }
    }

    // ─── Render helpers ───────────────────────────────────────────────────────

    const kpiData     = getLatestKpiData();
    const funnelData  = getLatestFunnelData();
    const propRows    = getPropertyPerformanceRows();
    const devRows     = getDeveloperRows();
    const maxViews    = propRows.length > 0 ? Math.max(...propRows.map(r => r.views || 0), 1) : 1;

    const SECTION_TABS = [
        { id: 'kpis',       label: 'North Star KPIs' },
        { id: 'funnel',     label: 'Funnel' },
        { id: 'propiedades', label: 'Propiedades' },
        { id: 'b2b',        label: 'Developer B2B' },
    ];

    const filteredArtifacts = artifacts.filter(a => {
        if (filter.type   !== 'all' && a.type   !== filter.type)   return false;
        if (filter.status !== 'all' && a.status !== filter.status) return false;
        return true;
    });

    // ─── Styles (inline, no new CSS classes) ─────────────────────────────────

    const s = {
        container:    { padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' },
        statsBar:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' },
        statCard:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px 18px' },
        statNum:      { fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 },
        statLabel:    { fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' },
        sectionTabs:  { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
        tab:          (active) => ({
            padding: '7px 16px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none',
            background: active ? '#2563eb' : '#f1f5f9',
            color: active ? '#fff' : '#475569',
            transition: 'all 0.15s',
        }),
        sectionBox:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px', marginBottom: '24px' },
        sectionTitle: { fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' },
        kpiGrid:      { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
        kpiCard:      { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '20px', textAlign: 'center' },
        kpiNum:       { fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 },
        kpiLabel:     { fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' },
        emptyState:   { textAlign: 'center', padding: '40px 20px', color: '#94a3b8' },
        emptyTitle:   { fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#64748b' },
        amberBanner:  { background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem', color: '#92400e', fontWeight: 500 },
        table:        { width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' },
        th:           { background: '#f8fafc', padding: '9px 12px', textAlign: 'left', fontSize: '0.71rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' },
        td:           { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
        filterRow:    { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' },
        select:       { padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.83rem', color: '#334155', background: '#fff', cursor: 'pointer' },
        genBtn:       { marginLeft: 'auto', padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer' },
        grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
        modal:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
        modalBox:     { background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' },
        modalTitle:   { fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' },
        input:        { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.85rem', color: '#0f172a', boxSizing: 'border-box' },
        textarea:     { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.85rem', color: '#0f172a', minHeight: '120px', resize: 'vertical', boxSizing: 'border-box' },
        btnRow:       { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
        btnSecondary: { padding: '8px 18px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', color: '#475569', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer' },
        btnPrimary:   { padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer' },
        stepBar:      { display: 'flex', gap: '6px', marginBottom: '24px' },
        stepDot:      (active, done) => ({
            flex: 1, height: '4px', borderRadius: '2px',
            background: done || active ? '#2563eb' : '#e5e7eb',
            transition: 'background 0.2s',
        }),
        typeCard:     (selected) => ({
            padding: '14px 16px', border: `2px solid ${selected ? '#2563eb' : '#e5e7eb'}`,
            borderRadius: '12px', cursor: 'pointer', marginBottom: '10px',
            background: selected ? '#eff6ff' : '#fff',
            transition: 'all 0.15s',
        }),
        typeCardLabel: { fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' },
        typeCardDesc:  { fontSize: '0.77rem', color: '#64748b', marginTop: '3px' },
        periodPills:  { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' },
        pill:         (active) => ({
            padding: '6px 14px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none',
            background: active ? '#2563eb' : '#f1f5f9', color: active ? '#fff' : '#475569',
        }),
        summaryRow:   { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', fontSize: '0.84rem' },
        summaryKey:   { color: '#64748b', fontWeight: 500 },
        summaryVal:   { color: '#0f172a', fontWeight: 600 },
        label:        { fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '6px', marginTop: '14px', display: 'block' },
    };

    // ─── Sections ─────────────────────────────────────────────────────────────

    function renderKpiSection() {
        if (!kpiData) {
            return (
                <div style={s.emptyState}>
                    <div style={s.emptyTitle}>Sin KPI Snapshot aprobado</div>
                    <p style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                        Genera un KPI Snapshot para ver las métricas North Star de la plataforma.
                    </p>
                    <button style={s.genBtn} onClick={() => openWizardForType('kpi_snapshot')}>
                        Generar KPI Snapshot
                    </button>
                </div>
            );
        }

        const { artifact, meta } = kpiData;
        const unverified = ['draft', 'pending_review'].includes(artifact.status);

        return (
            <>
                {unverified && (
                    <div style={s.amberBanner}>
                        ⚠ Datos no verificados — este snapshot aún no ha sido aprobado.
                    </div>
                )}
                <div style={s.kpiGrid}>
                    {[
                        { label: 'Leads totales', value: meta.leads_total, wow: meta.leads_wow },
                        { label: 'Propiedades activas', value: meta.properties_total, wow: meta.properties_wow },
                        { label: 'Revenue B2B est.', value: meta.revenue_b2b !== undefined ? `$${Number(meta.revenue_b2b).toLocaleString('es-ES')}` : '—', wow: meta.revenue_wow },
                    ].map(kpi => (
                        <div key={kpi.label} style={s.kpiCard}>
                            <div style={s.kpiNum}>{kpi.value ?? '—'}</div>
                            <div style={s.kpiLabel}>{kpi.label}</div>
                            <TrendPill value={kpi.wow} />
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                    Generado: {new Date(artifact.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}
                    <span
                        style={{ cursor: 'pointer', color: '#2563eb' }}
                        onClick={() => setPreviewArtifact(artifact)}
                    >
                        Ver reporte completo
                    </span>
                </div>
            </>
        );
    }

    function renderFunnelSection() {
        if (!funnelData) {
            return (
                <div style={s.emptyState}>
                    <div style={s.emptyTitle}>Sin Funnel Report aprobado</div>
                    <p style={{ fontSize: '0.82rem', marginBottom: '14px' }}>
                        Genera un Funnel Report para visualizar la conversión por etapa.
                    </p>
                    <button style={s.genBtn} onClick={() => openWizardForType('funnel_analysis')}>
                        Generar Funnel Report
                    </button>
                </div>
            );
        }

        const stages = funnelData.stages;
        const widths = [100, 80, 60, 42, 28];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '16px 0' }}>
                {FUNNEL_STAGES.map((stage, i) => {
                    const count = stages[stage.id] ?? 0;
                    const prevCount = i > 0 ? (stages[FUNNEL_STAGES[i - 1].id] ?? 0) : null;
                    const convRate = (prevCount && prevCount > 0) ? ((count / prevCount) * 100).toFixed(1) : null;
                    return (
                        <div
                            key={stage.id}
                            style={{
                                width: `${widths[i]}%`,
                                background: stage.color,
                                borderRadius: '8px',
                                padding: '12px 16px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'opacity 0.15s',
                            }}
                            onClick={() => setFilter(f => ({ ...f, type: 'funnel_analysis' }))}
                            title="Ver reportes de funnel"
                        >
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                                {count.toLocaleString('es-ES')}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '0.82rem', marginTop: '2px' }}>
                                {stage.label}
                            </div>
                            {convRate && (
                                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', marginTop: '1px' }}>
                                    {convRate}% conv.
                                </div>
                            )}
                        </div>
                    );
                })}
                <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Haz clic en una etapa para filtrar los reportes de funnel →
                </div>
            </div>
        );
    }

    function renderPropSection() {
        if (propRows.length === 0) {
            return (
                <div style={s.emptyState}>
                    <div style={s.emptyTitle}>Sin datos de propiedades</div>
                    <p style={{ fontSize: '0.82rem' }}>
                        Genera un Market Benchmark para ver el rendimiento por propiedad.
                    </p>
                    <button style={{ ...s.genBtn, marginLeft: 0, marginTop: '12px' }} onClick={() => openWizardForType('market_benchmark')}>
                        Generar Market Benchmark
                    </button>
                </div>
            );
        }

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                    <thead>
                        <tr>
                            {['Propiedad', 'Zona', 'Vistas', 'Leads', 'ROI est.'].map(h => (
                                <th key={h} style={s.th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {propRows.map((row, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={s.td}>{row.name || '—'}</td>
                                <td style={s.td}>{row.zone || '—'}</td>
                                <td style={s.td}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {row.views?.toLocaleString('es-ES') || '—'}
                                        {row.views > 0 && (
                                            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: '#e5e7eb', minWidth: '40px' }}>
                                                <div style={{ width: `${Math.min(100, (row.views / maxViews) * 100)}%`, height: '100%', background: '#2563eb', borderRadius: '2px' }} />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={s.td}>{row.leads?.toLocaleString('es-ES') || '—'}</td>
                                <td style={{ ...s.td, color: row.roi > 0 ? '#16a34a' : '#334155', fontWeight: row.roi > 0 ? 700 : 400 }}>
                                    {row.roi !== undefined ? `${row.roi}%` : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    function renderB2bSection() {
        if (devRows.length === 0) {
            return (
                <>
                    <div style={s.amberBanner}>
                        ℹ Módulo B2B activo en Phase 1. Disponible cuando haya developers registrados con listings activos.
                    </div>
                    <div style={s.emptyState}>
                        <div style={s.emptyTitle}>Sin datos de developers</div>
                        <p style={{ fontSize: '0.82rem' }}>
                            Genera reportes de developer para ver el dashboard B2B.
                        </p>
                    </div>
                </>
            );
        }

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                    <thead>
                        <tr>
                            {['Developer', 'Listings activos', 'Leads (semana)', 'Revenue est.', 'Acción'].map(h => (
                                <th key={h} style={s.th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {devRows.map((artifact, i) => {
                            const m = artifact.metadata || {};
                            return (
                                <tr key={artifact.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                    <td style={{ ...s.td, fontWeight: 600, color: '#0f172a' }}>{m.developer_name || m.developer_id || '—'}</td>
                                    <td style={s.td}>{m.listings_active ?? '—'}</td>
                                    <td style={s.td}>{m.leads_week ?? '—'}</td>
                                    <td style={{ ...s.td, color: '#16a34a', fontWeight: 600 }}>
                                        {m.revenue_est !== undefined ? `$${Number(m.revenue_est).toLocaleString('es-ES')}` : '—'}
                                    </td>
                                    <td style={s.td}>
                                        <button
                                            style={{ ...s.btnPrimary, padding: '5px 12px', fontSize: '0.78rem' }}
                                            onClick={() => setPreviewArtifact(artifact)}
                                        >
                                            Ver reporte
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    // ─── Wizard render ────────────────────────────────────────────────────────

    function renderWizard() {
        const currentType = ANALYTICS_REPORT_TYPES.find(r => r.id === wizard.type);

        return (
            <div style={s.modal} onClick={e => { if (e.target === e.currentTarget) setShowWizard(false); }}>
                <div style={s.modalBox}>
                    <div style={s.modalTitle}>Generar Reporte — Paso {wizardStep} de 3</div>

                    <div style={s.stepBar}>
                        {[1, 2, 3].map(n => (
                            <div key={n} style={s.stepDot(wizardStep === n, wizardStep > n)} />
                        ))}
                    </div>

                    {/* Paso 1: Tipo */}
                    {wizardStep === 1 && (
                        <>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>¿Qué tipo de reporte quieres generar?</div>
                            {ANALYTICS_REPORT_TYPES.map(rt => (
                                <div
                                    key={rt.id}
                                    style={s.typeCard(wizard.type === rt.id)}
                                    onClick={() => setWizard(w => ({ ...w, type: rt.id }))}
                                >
                                    <div style={s.typeCardLabel}>{rt.label}</div>
                                    <div style={s.typeCardDesc}>{rt.desc}</div>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Paso 2: Parámetros */}
                    {wizardStep === 2 && (
                        <>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
                                Parámetros para <strong>{currentType?.label}</strong>
                            </div>

                            {/* Período (todos excepto funnel) */}
                            {wizard.type !== 'funnel_analysis' && (
                                <>
                                    <span style={s.label}>Período</span>
                                    <div style={s.periodPills}>
                                        {[
                                            { id: 'week',  label: 'Esta semana' },
                                            { id: 'month', label: 'Este mes' },
                                            { id: '4w',    label: 'Últimas 4 semanas' },
                                        ].map(p => (
                                            <button key={p.id} style={s.pill(wizard.period === p.id)} onClick={() => setWizard(w => ({ ...w, period: p.id }))}>
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Zona (market pulse, benchmark, cohort) */}
                            {['report', 'market_benchmark', 'cohort_analysis'].includes(wizard.type) && (
                                <>
                                    <span style={s.label}>Zona (opcional)</span>
                                    <input
                                        style={s.input}
                                        placeholder="ej. Dubai Marina, Downtown..."
                                        value={wizard.zone}
                                        onChange={e => setWizard(w => ({ ...w, zone: e.target.value }))}
                                    />
                                </>
                            )}

                            {/* Fecha inicio/fin (funnel) */}
                            {wizard.type === 'funnel_analysis' && (
                                <>
                                    <span style={s.label}>Desde</span>
                                    <input style={s.input} type="date" value={wizard.date_from} onChange={e => setWizard(w => ({ ...w, date_from: e.target.value }))} />
                                    <span style={s.label}>Hasta</span>
                                    <input style={s.input} type="date" value={wizard.date_to} onChange={e => setWizard(w => ({ ...w, date_to: e.target.value }))} />
                                </>
                            )}

                            {/* Competidores (benchmark) */}
                            {wizard.type === 'market_benchmark' && (
                                <>
                                    <span style={s.label}>Comparar con</span>
                                    <div style={s.periodPills}>
                                        {[
                                            { id: 'propertyfinder', label: 'PropertyFinder' },
                                            { id: 'bayut',          label: 'Bayut' },
                                            { id: 'ambos',          label: 'Ambos' },
                                        ].map(c => (
                                            <button key={c.id} style={s.pill(wizard.competitors === c.id)} onClick={() => setWizard(w => ({ ...w, competitors: c.id }))}>
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Tipo de propiedad (cohort) */}
                            {wizard.type === 'cohort_analysis' && (
                                <>
                                    <span style={s.label}>Tipo de propiedad</span>
                                    <div style={s.periodPills}>
                                        {['Studio', '1BR', '2BR', '3BR', 'Villa'].map(t => (
                                            <button key={t} style={s.pill(wizard.property_type === t)} onClick={() => setWizard(w => ({ ...w, property_type: t }))}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* Paso 3: Resumen */}
                    {wizardStep === 3 && (
                        <>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>Resumen del reporte a generar:</div>
                            {[
                                { k: 'Tipo',       v: currentType?.label },
                                { k: 'Período',    v: wizard.period,        show: wizard.type !== 'funnel_analysis' },
                                { k: 'Zona',       v: wizard.zone,          show: !!wizard.zone },
                                { k: 'Desde',      v: wizard.date_from,     show: wizard.type === 'funnel_analysis' && !!wizard.date_from },
                                { k: 'Hasta',      v: wizard.date_to,       show: wizard.type === 'funnel_analysis' && !!wizard.date_to },
                                { k: 'Comparar',   v: wizard.competitors,   show: wizard.type === 'market_benchmark' },
                                { k: 'Propiedad',  v: wizard.property_type, show: wizard.type === 'cohort_analysis' },
                                { k: 'Skill',      v: currentType?.skill },
                            ].filter(row => row.show !== false && row.v).map(row => (
                                <div key={row.k} style={s.summaryRow}>
                                    <span style={s.summaryKey}>{row.k}</span>
                                    <span style={s.summaryVal}>{row.v}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: '14px', fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                                Se creará un borrador y se enviará el skill al Analytics Agent.
                            </div>
                        </>
                    )}

                    <div style={s.btnRow}>
                        {wizardStep > 1 && (
                            <button style={s.btnSecondary} onClick={() => setWizardStep(s => s - 1)}>Atrás</button>
                        )}
                        <button style={s.btnSecondary} onClick={() => setShowWizard(false)}>Cancelar</button>
                        {wizardStep < 3 ? (
                            <button style={s.btnPrimary} onClick={() => setWizardStep(s => s + 1)}>Siguiente →</button>
                        ) : (
                            <button style={{ ...s.btnPrimary, opacity: generating ? 0.7 : 1 }} disabled={generating} onClick={handleGenerate}>
                                {generating ? 'Generando...' : 'Generar Reporte'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Main render ──────────────────────────────────────────────────────────

    return (
        <div style={s.container}>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#fff', padding: '10px 18px', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Stats bar */}
            <div style={s.statsBar}>
                {[
                    { label: 'Total Reportes', value: stats?.total ?? artifacts.length, color: '#0f172a' },
                    { label: 'En revisión',    value: stats?.by_status?.pending_review ?? artifacts.filter(a => a.status === 'pending_review').length, color: '#f59e0b' },
                    { label: 'Aprobados',      value: stats?.by_status?.approved       ?? artifacts.filter(a => a.status === 'approved').length,       color: '#10b981' },
                    { label: 'Publicados',     value: stats?.by_status?.published      ?? artifacts.filter(a => a.status === 'published').length,      color: '#3b82f6' },
                ].map(stat => (
                    <div key={stat.label} style={s.statCard}>
                        <div style={{ ...s.statNum, color: stat.color }}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Section tabs */}
            <div style={s.sectionTabs}>
                {SECTION_TABS.map(tab => (
                    <button
                        key={tab.id}
                        style={s.tab(activeSection === tab.id)}
                        onClick={() => setActiveSection(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Active section content */}
            <div style={s.sectionBox}>
                <div style={s.sectionTitle}>
                    {SECTION_TABS.find(t => t.id === activeSection)?.label}
                </div>
                {activeSection === 'kpis'        && renderKpiSection()}
                {activeSection === 'funnel'       && renderFunnelSection()}
                {activeSection === 'propiedades'  && renderPropSection()}
                {activeSection === 'b2b'          && renderB2bSection()}
            </div>

            {/* Reports Library (always visible) */}
            <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                    Reports Library
                </div>

                <div style={s.filterRow}>
                    <select style={s.select} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
                        <option value="all">Todos los tipos</option>
                        <option value="kpi_snapshot">KPI Snapshot</option>
                        <option value="report">Market Pulse</option>
                        <option value="funnel_analysis">Funnel</option>
                        <option value="market_benchmark">Benchmark</option>
                        <option value="cohort_analysis">ROI / Cohorte</option>
                    </select>
                    <select style={s.select} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                        <option value="all">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="pending_review">En revisión</option>
                        <option value="approved">Aprobado</option>
                        <option value="rejected">Rechazado</option>
                        <option value="published">Publicado</option>
                    </select>
                    <button style={s.genBtn} onClick={() => { setWizardStep(1); setShowWizard(true); }}>
                        + Generar Reporte
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        Cargando reportes...
                    </div>
                ) : filteredArtifacts.length === 0 ? (
                    <div style={s.emptyState}>
                        <div style={s.emptyTitle}>Sin reportes</div>
                        <p style={{ fontSize: '0.82rem' }}>Usa el wizard para generar tu primer reporte de analytics.</p>
                    </div>
                ) : (
                    <div style={s.grid}>
                        {filteredArtifacts.map(artifact => (
                            <ArtifactCard
                                key={artifact.id}
                                artifact={artifact}
                                onPreview={setPreviewArtifact}
                                onEdit={handleEdit}
                                onStatusChange={handleStatusChange}
                                onPublish={handlePublish}
                                onHandoff={handleHandoff}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {previewArtifact && (
                <ArtifactPreviewModal
                    artifact={previewArtifact}
                    onClose={() => setPreviewArtifact(null)}
                    onStatusChange={handleStatusChange}
                />
            )}

            {editArtifact && (
                <div style={s.modal} onClick={e => { if (e.target === e.currentTarget) setEditArtifact(null); }}>
                    <div style={s.modalBox}>
                        <div style={s.modalTitle}>Editar Reporte</div>
                        <span style={s.label}>Título</span>
                        <input
                            style={s.input}
                            value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        />
                        <span style={{ ...s.label, marginTop: '12px' }}>Contenido</span>
                        <textarea
                            style={s.textarea}
                            value={editForm.content}
                            onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                        />
                        <div style={s.btnRow}>
                            <button style={s.btnSecondary} onClick={() => setEditArtifact(null)}>Cancelar</button>
                            <button style={s.btnPrimary} onClick={handleEditSave}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {showWizard && renderWizard()}
        </div>
    );
}
