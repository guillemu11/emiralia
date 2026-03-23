import { useState, useEffect } from 'react';
import { API_URL } from '../../api.js';
import ArtifactCard from './ArtifactCard.jsx';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import WsIcon from './WsIcon.jsx';
import {
    WAT_TYPES, WAT_HANDOFF_AGENTS, WAT_PUBLISH_DESTINATIONS,
    WAT_SEVERITIES, WAT_SCORE_COLORS,
} from './artifactConstants.js';

const ACCENT      = '#6366f1'; // indigo-500
const ACCENT_DARK = '#3730a3'; // indigo-800
const ACCENT_BG   = '#eef2ff'; // indigo-50

const TABS = [
    { id: 'reports',   label: 'Audit Reports',        icon: 'clipboard-list' },
    { id: 'issues',    label: 'Issues Activos',        icon: 'alert-circle'   },
    { id: 'proposals', label: 'Propuestas de Mejora',  icon: 'lightbulb'      },
];

const STATUS_OPTS = [
    { value: 'all',            label: 'Todos los estados' },
    { value: 'draft',          label: 'Borrador'          },
    { value: 'pending_review', label: 'En revisión'       },
    { value: 'approved',       label: 'Aprobado'          },
    { value: 'rejected',       label: 'Rechazado'         },
    { value: 'published',      label: 'Publicado'         },
];

const CATEGORY_BREAKDOWN_DEFAULTS = [
    { key: 'documentation', label: 'Documentation Coverage', value: 0 },
    { key: 'tools',         label: 'Tool Consistency',       value: 0 },
    { key: 'agents',        label: 'Agent Definitions',      value: 0 },
    { key: 'workflows',     label: 'Workflow Completeness',  value: 0 },
];

/** Devuelve el color del gauge según el score */
function scoreColor(score) {
    const found = WAT_SCORE_COLORS.find(c => score >= c.min && score < c.max);
    return found ? found.color : '#94a3b8';
}

/** SVG gauge circular (r=54, cx=cy=64, circunferencia≈339) */
function ScoreGauge({ score, size = 128 }) {
    const r = 54;
    const cx = 64;
    const cy = 64;
    const circumference = 2 * Math.PI * r;
    const filled = (score / 100) * circumference;
    const color = scoreColor(score);

    return (
        <svg width={size} height={size} viewBox="0 0 128 128">
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
            {/* Progress */}
            <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${filled} ${circumference - filled}`}
                strokeDashoffset={circumference * 0.25}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            {/* Score text */}
            <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 26, fontWeight: 700, fill: color, fontFamily: 'Inter, sans-serif' }}>
                {score}
            </text>
            <text x={cx} y={cy + 18} textAnchor="middle"
                style={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
                / 100
            </text>
        </svg>
    );
}

export default function WatAuditorWorkspace({ agentId }) {
    const [activeTab, setActiveTab]             = useState('reports');
    const [artifacts, setArtifacts]             = useState([]);
    const [stats, setStats]                     = useState(null);
    const [latestReport, setLatestReport]       = useState(null); // audit_report más reciente
    const [loading, setLoading]                 = useState(true);
    const [runningAudit, setRunningAudit]       = useState(false);
    const [statusFilter, setStatusFilter]       = useState('all');
    const [severityFilter, setSeverityFilter]   = useState('all');
    const [previewArtifact, setPreviewArtifact] = useState(null);
    const [editArtifact, setEditArtifact]       = useState(null);
    const [editForm, setEditForm]               = useState({ title: '', content: '' });
    const [toast, setToast]                     = useState(null);

    useEffect(() => {
        fetchArtifacts();
        fetchStats();
        fetchLatestReport();
    }, [agentId, activeTab, statusFilter, severityFilter]);

    function tabTypes() {
        if (activeTab === 'reports')   return ['audit_report'];
        if (activeTab === 'issues')    return ['inconsistency'];
        if (activeTab === 'proposals') return ['improvement_proposal'];
        return ['audit_report'];
    }

    async function fetchArtifacts() {
        setLoading(true);
        try {
            const types = tabTypes();
            const fetches = types.map(type => {
                const params = new URLSearchParams({ agent_id: agentId, type, limit: '50' });
                if (statusFilter !== 'all') params.append('status', statusFilter);
                return fetch(`${API_URL}/artifacts?${params}`).then(r => r.json());
            });
            let all = (await Promise.all(fetches)).flat();
            // Filtro de severidad (issues tab)
            if (activeTab === 'issues' && severityFilter !== 'all') {
                all = all.filter(a => a.metadata?.severity === severityFilter);
            }
            all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setArtifacts(all);
        } catch {
            showToast('Error cargando artefactos', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/artifacts/stats?agent_id=${agentId}`);
            setStats(await res.json());
        } catch { /* stats opcionales */ }
    }

    /** Carga el audit_report más reciente para extraer el score */
    async function fetchLatestReport() {
        try {
            const res = await fetch(
                `${API_URL}/artifacts?agent_id=${agentId}&type=audit_report&limit=1`
            );
            const data = await res.json();
            setLatestReport(Array.isArray(data) && data.length > 0 ? data[0] : null);
        } catch { /* score opcional */ }
    }

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    async function handleStatusChange(id, status, rejectionReason = null) {
        try {
            await fetch(`${API_URL}/artifacts/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, rejection_reason: rejectionReason }),
            });
            const labels = {
                approved: 'aprobado', rejected: 'rechazado',
                pending_review: 'enviado a revisión', published: 'publicado',
            };
            showToast(`Artefacto ${labels[status] || status}`);
            fetchArtifacts();
            fetchStats();
        } catch {
            showToast('Error cambiando estado', 'error');
        }
    }

    async function handlePublish(artifact, destination) {
        try {
            await fetch(`${API_URL}/artifacts/${artifact.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination }),
            });
            showToast(`Enviado a ${destination}`);
        } catch {
            showToast('Error al publicar', 'error');
        }
    }

    async function handleHandoff(artifact, toAgentId, instruction) {
        try {
            await fetch(`${API_URL}/artifacts/${artifact.id}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_agent_id: toAgentId, instruction }),
            });
            showToast(`Handoff enviado a ${toAgentId}`);
        } catch {
            showToast('Error en handoff', 'error');
        }
    }

    function openEdit(artifact) {
        setEditForm({ title: artifact.title || '', content: artifact.content || '' });
        setEditArtifact(artifact);
    }

    async function saveEdit() {
        try {
            await fetch(`${API_URL}/artifacts/${editArtifact.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editForm.title, content: editForm.content }),
            });
            setEditArtifact(null);
            showToast('Artefacto actualizado');
            fetchArtifacts();
        } catch {
            showToast('Error al guardar', 'error');
        }
    }

    /** Lanza el skill /wat-audit vía chat del agente */
    async function handleRunAudit() {
        setRunningAudit(true);
        try {
            fetch(`${API_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '/wat-audit' }),
            });
            showToast('Auditoría iniciada — los resultados aparecerán en breve');
            // Refresca tras 4s para capturar el artefacto creado
            setTimeout(() => {
                fetchArtifacts();
                fetchStats();
                fetchLatestReport();
                setRunningAudit(false);
            }, 4000);
        } catch {
            showToast('Error al lanzar la auditoría', 'error');
            setRunningAudit(false);
        }
    }

    // ── Datos derivados ──────────────────────────────────────────────────────
    const score = latestReport?.metadata?.score ?? null;
    const lastAuditDate = latestReport
        ? new Date(latestReport.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        : null;
    const categoryBreakdown = CATEGORY_BREAKDOWN_DEFAULTS.map(cat => ({
        ...cat,
        value: latestReport?.metadata?.categories?.[cat.key] ?? 0,
    }));

    const totalAudits    = stats?.by_type?.audit_report ?? 0;
    const activeIssues   = stats?.by_type?.inconsistency ?? 0;
    const totalProposals = stats?.by_type?.improvement_proposal ?? 0;
    const published      = stats?.by_status?.published ?? 0;

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: '24px 28px' }}>

            {/* ── Toast ── */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
                    color: toast.type === 'error' ? '#991b1b' : '#065f46',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
                    padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}>
                    {toast.msg}
                </div>
            )}

            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                        System Health
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                        Centro de control del sistema WAT — auditorías, issues y propuestas de mejora
                    </p>
                </div>
                <button
                    onClick={handleRunAudit}
                    disabled={runningAudit}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: runningAudit ? '#e2e8f0' : ACCENT,
                        color: runningAudit ? '#94a3b8' : '#fff',
                        border: 'none', borderRadius: 10, padding: '10px 18px',
                        fontSize: 13, fontWeight: 600, cursor: runningAudit ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    {runningAudit ? (
                        <>
                            <span style={{ width: 14, height: 14, border: '2px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                            Auditando...
                        </>
                    ) : (
                        <>▶ Ejecutar Auditoría</>
                    )}
                </button>
            </div>

            {/* ── KPI Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Audits Totales',    value: totalAudits,    color: ACCENT,     bg: ACCENT_BG },
                    { label: 'Issues Activos',     value: activeIssues,   color: '#ef4444',  bg: '#fef2f2' },
                    { label: 'Propuestas',         value: totalProposals, color: '#f59e0b',  bg: '#fffbeb' },
                    { label: 'Publicados',         value: published,      color: '#10b981',  bg: '#ecfdf5' },
                ].map(kpi => (
                    <div key={kpi.label} style={{
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                        padding: '16px 20px',
                    }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {kpi.label}
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>
                            {kpi.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Score Panel ── */}
            <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
                padding: '24px 28px', marginBottom: 24,
                display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center',
            }}>
                {/* Gauge + meta */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    {score !== null ? (
                        <ScoreGauge score={score} size={128} />
                    ) : (
                        <div style={{
                            width: 128, height: 128, borderRadius: '50%',
                            background: '#f1f5f9', border: '8px solid #e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column', gap: 4,
                        }}>
                            <span style={{ fontSize: 22, color: '#94a3b8' }}>—</span>
                        </div>
                    )}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                            Score Global WAT
                        </div>
                        {lastAuditDate && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                Última auditoría: {lastAuditDate}
                            </div>
                        )}
                        {!lastAuditDate && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                Sin auditorías todavía
                            </div>
                        )}
                    </div>
                </div>

                {/* Category breakdown */}
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>
                        Breakdown por categoría
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {categoryBreakdown.map(cat => (
                            <div key={cat.key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{cat.label}</span>
                                    <span style={{ fontSize: 12, color: scoreColor(cat.value), fontWeight: 700 }}>{cat.value}%</span>
                                </div>
                                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${cat.value}%`,
                                        background: scoreColor(cat.value),
                                        borderRadius: 999,
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    {score === null && (
                        <div style={{
                            marginTop: 16, padding: '10px 14px', borderRadius: 8,
                            background: ACCENT_BG, border: `1px solid ${ACCENT}22`,
                            fontSize: 12, color: ACCENT_DARK,
                        }}>
                            Ejecuta una auditoría para ver el score y el breakdown detallado por categoría.
                        </div>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setStatusFilter('all'); setSeverityFilter('all'); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: 13, fontWeight: 500,
                            background: activeTab === tab.id ? ACCENT : 'transparent',
                            color: activeTab === tab.id ? '#fff' : '#64748b',
                            transition: 'all 0.15s',
                        }}
                    >
                        <WsIcon name={tab.icon} size={13} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Filtros ── */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                        padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                        fontSize: 13, color: '#475569', background: '#fff', cursor: 'pointer',
                    }}
                >
                    {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {activeTab === 'issues' && (
                    <select
                        value={severityFilter}
                        onChange={e => setSeverityFilter(e.target.value)}
                        style={{
                            padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                            fontSize: 13, color: '#475569', background: '#fff', cursor: 'pointer',
                        }}
                    >
                        <option value="all">Todas las severidades</option>
                        {WAT_SEVERITIES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* ── Grid de Artifacts ── */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                            padding: 20, height: 160, animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                    ))}
                </div>
            ) : artifacts.length === 0 ? (
                <EmptyState tab={activeTab} onRunAudit={handleRunAudit} />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {artifacts.map(artifact => (
                        <ArtifactCard
                            key={artifact.id}
                            artifact={artifact}
                            publishDestinations={WAT_PUBLISH_DESTINATIONS[artifact.type] || []}
                            handoffAgents={WAT_HANDOFF_AGENTS}
                            onPreview={setPreviewArtifact}
                            onEdit={openEdit}
                            onStatusChange={handleStatusChange}
                            onHandoff={handleHandoff}
                            onPublish={handlePublish}
                        />
                    ))}
                </div>
            )}

            {/* ── Preview Modal ── */}
            {previewArtifact && (
                <ArtifactPreviewModal
                    artifact={previewArtifact}
                    onClose={() => setPreviewArtifact(null)}
                />
            )}

            {/* ── Edit Modal ── */}
            {editArtifact && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, padding: 28,
                        width: '90%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                                Editar artefacto
                            </h3>
                            <button
                                onClick={() => setEditArtifact(null)}
                                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
                            >×</button>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                                Título
                            </label>
                            <input
                                value={editForm.title}
                                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '10px 14px', borderRadius: 8,
                                    border: '1px solid #e2e8f0', fontSize: 14, color: '#0f172a',
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                                Contenido
                            </label>
                            <textarea
                                value={editForm.content}
                                onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                                rows={10}
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '10px 14px', borderRadius: 8,
                                    border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a',
                                    fontFamily: 'inherit', resize: 'vertical',
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setEditArtifact(null)}
                                style={{
                                    padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
                                    background: '#fff', color: '#475569', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                }}
                            >Cancelar</button>
                            <button
                                onClick={saveEdit}
                                style={{
                                    padding: '9px 18px', borderRadius: 8, border: 'none',
                                    background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                }}
                            >Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}

function EmptyState({ tab, onRunAudit }) {
    const configs = {
        reports: {
            icon: 'clipboard-list',
            title: 'Sin auditorías todavía',
            desc: 'Ejecuta tu primera auditoría WAT para generar un reporte con score 0-100 y breakdown por categoría.',
            cta: 'Ejecutar Auditoría',
            action: onRunAudit,
        },
        issues: {
            icon: 'alert-circle',
            title: 'Sin issues detectados',
            desc: 'Los issues se generan automáticamente durante una auditoría WAT.',
            cta: null,
            action: null,
        },
        proposals: {
            icon: 'lightbulb',
            title: 'Sin propuestas de mejora',
            desc: 'Las propuestas se generan durante el análisis de gaps de una auditoría WAT.',
            cta: null,
            action: null,
        },
    };
    const cfg = configs[tab] || configs.reports;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '64px 24px', textAlign: 'center',
            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        }}>
            <div style={{ marginBottom: 16, color: '#94a3b8' }}><WsIcon name={cfg.icon} size={40} /></div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                {cfg.title}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', maxWidth: 380, lineHeight: 1.6, marginBottom: 20 }}>
                {cfg.desc}
            </div>
            {cfg.cta && cfg.action && (
                <button
                    onClick={cfg.action}
                    style={{
                        padding: '10px 20px', borderRadius: 10, border: 'none',
                        background: '#6366f1', color: '#fff',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    {cfg.cta}
                </button>
            )}
        </div>
    );
}
