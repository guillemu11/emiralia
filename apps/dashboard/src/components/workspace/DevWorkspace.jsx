import { useState, useEffect, useRef } from 'react';
import {
    KANBAN_COLUMNS,
    DEV_TYPE_LABELS,
    DEV_TYPE_ICONS,
    DEV_PRIORITY_COLORS,
    DEV_HANDOFF_AGENTS,
} from './artifactConstants.js';

const API = 'http://localhost:3001';

const INNER_TABS = [
    { id: 'kanban', label: 'Kanban' },
    { id: 'health', label: 'System Health' },
    { id: 'deploy', label: 'Deploy & Migrations' },
    { id: 'errors', label: 'Error Log' },
];

const DEV_TYPES = [
    { id: 'feature',    label: 'Feature' },
    { id: 'bug_fix',    label: 'Bug Fix' },
    { id: 'migration',  label: 'Migration' },
    { id: 'deployment', label: 'Deployment' },
];

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

const MOCK_DEPLOYS = [
    { id: 1, ref: 'aa06331', message: 'feat: WAT system v2 — nuevos agentes, SEO', env: 'production', status: 'success', deployed_at: '2026-03-22T18:00:00Z', duration_s: 47 },
    { id: 2, ref: '52abf4c', message: 'fix: route image chat to proper handler',    env: 'production', status: 'success', deployed_at: '2026-03-21T14:30:00Z', duration_s: 52 },
    { id: 3, ref: 'adcc307', message: 'fix: send image as buffer to Telegram',      env: 'production', status: 'success', deployed_at: '2026-03-20T11:00:00Z', duration_s: 39 },
];

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
    if (!iso) return '—';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanCard({ artifact, onMove, onHandoff, movingId }) {
    const priority = artifact.metadata?.priority;
    const prLink   = artifact.metadata?.pr_link;
    const tests    = artifact.metadata?.tests_status;
    const pc       = priority && DEV_PRIORITY_COLORS[priority];
    const col      = KANBAN_COLUMNS.find(c => c.id === artifact.status);
    const isMoving = movingId === artifact.id;

    const nextStatus = {
        draft:          { label: 'Start',            next: 'pending_review' },
        pending_review: { label: 'Enviar a Review',  next: 'approved' },
        approved:       { label: 'Marcar Done',      next: 'published' },
        published:      { label: 'Reabrir',          next: 'pending_review' },
    };
    const backStatus = {
        approved: { label: 'Devolver', next: 'pending_review' },
    };

    const testsColor = tests === 'passing' ? '#10b981' : tests === 'failing' ? '#ef4444' : '#f59e0b';

    return (
        <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 8,
            opacity: isMoving ? 0.6 : 1,
            transition: 'opacity 0.2s',
        }}>
            {/* Type + Priority badges */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>
                    {DEV_TYPE_ICONS[artifact.type]} {DEV_TYPE_LABELS[artifact.type] || artifact.type}
                </span>
                {pc && (
                    <span style={{ fontSize: 11, background: pc.bg, color: pc.color, borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>
                        {priority}
                    </span>
                )}
                {tests && (
                    <span title={`Tests: ${tests}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: testsColor, display: 'inline-block' }} />
                        {tests}
                    </span>
                )}
            </div>

            {/* Title */}
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 6, lineHeight: '1.3' }}>
                {artifact.title}
            </div>

            {/* PR link */}
            {prLink && (
                <a href={prLink} target="_blank" rel="noreferrer"
                   style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', display: 'block', marginBottom: 6 }}>
                    ↗ PR link
                </a>
            )}

            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>{timeAgo(artifact.created_at)}</div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {nextStatus[artifact.status] && (
                    <button
                        onClick={() => onMove(artifact.id, nextStatus[artifact.status].next)}
                        disabled={isMoving}
                        style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                            background: col?.color || '#94a3b8', color: 'white',
                            border: 'none', cursor: 'pointer',
                        }}>
                        {nextStatus[artifact.status].label}
                    </button>
                )}
                {backStatus[artifact.status] && (
                    <button
                        onClick={() => onMove(artifact.id, backStatus[artifact.status].next)}
                        disabled={isMoving}
                        style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                            background: '#f1f5f9', color: '#475569',
                            border: '1px solid #e5e7eb', cursor: 'pointer',
                        }}>
                        {backStatus[artifact.status].label}
                    </button>
                )}
                <select
                    onChange={e => { if (e.target.value) { onHandoff(artifact.id, e.target.value, artifact.title); e.target.value = ''; } }}
                    style={{ fontSize: 11, padding: '3px 6px', borderRadius: 8, border: '1px solid #e5e7eb', color: '#475569', cursor: 'pointer' }}>
                    <option value="">Handoff…</option>
                    {DEV_HANDOFF_AGENTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
            </div>
        </div>
    );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, artifacts, onMove, onHandoff, movingId, onNewTask }) {
    return (
        <div style={{ flex: 1, minWidth: 220 }}>
            {/* Column header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                padding: '8px 10px', borderRadius: 10,
                background: '#f8fafc', borderLeft: `4px solid ${col.color}`,
            }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{col.label}</span>
                <span style={{
                    fontSize: 11, fontWeight: 700, background: col.color, color: 'white',
                    borderRadius: '50%', width: 20, height: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{artifacts.length}</span>
            </div>

            {/* Cards */}
            <div style={{ minHeight: 80 }}>
                {artifacts.map(a => (
                    <KanbanCard key={a.id} artifact={a} onMove={onMove} onHandoff={onHandoff} movingId={movingId} />
                ))}
            </div>

            {/* + Nueva Tarea — only in Todo column */}
            {col.id === 'draft' && (
                <button
                    onClick={onNewTask}
                    style={{
                        width: '100%', padding: '8px 10px', borderRadius: 10,
                        border: '1.5px dashed #cbd5e1', background: 'transparent',
                        color: '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 500,
                    }}>
                    + Nueva Tarea
                </button>
            )}
        </div>
    );
}

// ─── New Task Modal ───────────────────────────────────────────────────────────

function NewTaskModal({ agentId, onClose, onCreated }) {
    const [form, setForm] = useState({ title: '', type: 'feature', priority: 'Medium' });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            await fetch(`${API}/api/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: form.type,
                    title: form.title.trim(),
                    content: '',
                    metadata: { priority: form.priority },
                }),
            });
            onCreated();
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 18, color: '#0f172a' }}>Nueva Tarea</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Título</label>
                        <input
                            type="text"
                            required
                            placeholder="Describe la tarea…"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Tipo</label>
                            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14 }}>
                                {DEV_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Prioridad</label>
                            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14 }}>
                                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button type="button" onClick={onClose}
                            style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: 'white', color: '#475569', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                            {saving ? 'Creando…' : 'Crear Tarea'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({ svc }) {
    const dotColor = svc.status === 'up' ? '#10b981' : svc.status === 'down' ? '#ef4444' : '#f59e0b';
    const bgColor  = svc.status === 'up' ? '#ecfdf5' : svc.status === 'down' ? '#fef2f2' : '#fffbeb';

    return (
        <div style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 14,
            padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12, background: bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: dotColor, display: 'block',
                    boxShadow: svc.status === 'up' ? `0 0 0 3px ${dotColor}30` : 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{svc.label}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>:{svc.port}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: dotColor, textTransform: 'uppercase' }}>
                    {svc.status === 'up' ? 'Online' : svc.status === 'down' ? 'Down' : '—'}
                </div>
                {svc.latency_ms != null && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{svc.latency_ms}ms</div>
                )}
            </div>
        </div>
    );
}

// ─── Deploy Card ──────────────────────────────────────────────────────────────

function DeployCard({ deploy }) {
    const statusColor = {
        success:   { color: '#10b981', bg: '#ecfdf5', label: 'Success' },
        failed:    { color: '#ef4444', bg: '#fef2f2', label: 'Failed' },
        deploying: { color: '#f59e0b', bg: '#fffbeb', label: 'Deploying…' },
        rollback:  { color: '#6366f1', bg: '#eef2ff', label: 'Rollback' },
    }[deploy.status] || { color: '#94a3b8', bg: '#f1f5f9', label: deploy.status };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 16px', background: 'white', borderRadius: 12,
            border: '1px solid #e5e7eb', marginBottom: 8,
        }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb', background: '#eff6ff', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                {deploy.ref}
            </span>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{deploy.message}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {deploy.env} · {formatDate(deploy.deployed_at)}{deploy.duration_s ? ` · ${deploy.duration_s}s` : ''}
                </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: statusColor.bg, color: statusColor.color, borderRadius: 8, padding: '3px 10px' }}>
                {statusColor.label}
            </span>
        </div>
    );
}

// ─── Error Group ──────────────────────────────────────────────────────────────

function ErrorGroup({ group }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 8 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#ef4444', background: '#fef2f2', borderRadius: 8, padding: '2px 10px' }}>
                    {group.count}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{group.event_type}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>último {timeAgo(group.last_seen)}</span>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{open ? '▲' : '▼'}</span>
            </button>
            {open && group.recent?.length > 0 && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f1f5f9' }}>
                    {group.recent.map((r, i) => (
                        <div key={i} style={{ padding: '8px 0', borderBottom: i < group.recent.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{r.title || '—'}</div>
                            {r.details && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.details}</div>}
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{formatDate(r.date)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── DevWorkspace ─────────────────────────────────────────────────────────────

export default function DevWorkspace({ agentId }) {
    const [innerTab, setInnerTab] = useState('kanban');

    // Kanban state
    const [artifacts, setArtifacts]   = useState([]);
    const [loading, setLoading]        = useState(true);
    const [movingId, setMovingId]      = useState(null);
    const [showNewModal, setNewModal]  = useState(false);

    // Health state
    const [health, setHealth]             = useState(null);
    const [healthLoading, setHealthLoad]  = useState(false);
    const healthInterval                  = useRef(null);

    // Deploy + Migrations state
    const [deploys, setDeploys]               = useState(MOCK_DEPLOYS);
    const [deployInProgress, setDeployIP]     = useState(false);
    const [migrations, setMigrations]         = useState([]);
    const [migrationsLoading, setMigrLoad]    = useState(false);

    // Error log state
    const [errors, setErrors]           = useState(null);
    const [errorsLoading, setErrLoad]   = useState(false);

    // Toast
    const [toast, setToast] = useState(null);
    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    // ── Kanban data ──────────────────────────────────────────────────────────
    async function fetchArtifacts() {
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/artifacts?agent_id=${agentId}&type=feature,bug_fix,migration,deployment&limit=100`);
            const data = await r.json();
            setArtifacts(data.items || []);
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }

    async function moveArtifact(id, newStatus) {
        setMovingId(id);
        try {
            await fetch(`${API}/api/artifacts/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            setArtifacts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
        } catch {
            showToast('Error al mover la tarea', 'error');
        } finally {
            setMovingId(null);
        }
    }

    async function doHandoff(artifactId, toAgentId, title) {
        try {
            await fetch(`${API}/api/artifacts/${artifactId}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_agent_id: agentId, to_agent_id: toAgentId, instruction: `Handoff de "${title}"` }),
            });
            showToast('Handoff enviado');
        } catch {
            showToast('Error en handoff', 'error');
        }
    }

    // ── Health data ──────────────────────────────────────────────────────────
    async function fetchHealth() {
        setHealthLoad(true);
        try {
            const r = await fetch(`${API}/api/dev/health`);
            setHealth(await r.json());
        } catch { /* ignore */ } finally {
            setHealthLoad(false);
        }
    }

    // ── Migrations data ──────────────────────────────────────────────────────
    async function fetchMigrations() {
        if (migrations.length > 0) return;
        setMigrLoad(true);
        try {
            const r = await fetch(`${API}/api/dev/migrations`);
            const data = await r.json();
            setMigrations(data.migrations || []);
        } catch { /* ignore */ } finally {
            setMigrLoad(false);
        }
    }

    // ── Error log data ───────────────────────────────────────────────────────
    async function fetchErrors() {
        if (errors !== null) return;
        setErrLoad(true);
        try {
            const r = await fetch(`${API}/api/dev/errors?hours=24`);
            setErrors(await r.json());
        } catch { /* ignore */ } finally {
            setErrLoad(false);
        }
    }

    // ── Deploy simulation ────────────────────────────────────────────────────
    function simulateDeploy() {
        if (deployInProgress) return;
        setDeployIP(true);
        const fakeRef = Math.random().toString(36).slice(2, 9);
        const newDeploy = { id: Date.now(), ref: fakeRef, message: 'deploy: manual trigger from Engineering Hub', env: 'production', status: 'deploying', deployed_at: new Date().toISOString(), duration_s: null };
        setDeploys(prev => [newDeploy, ...prev]);
        setTimeout(() => {
            setDeploys(prev => prev.map(d => d.id === newDeploy.id ? { ...d, status: 'success', duration_s: Math.floor(Math.random() * 30) + 30 } : d));
            setDeployIP(false);
            showToast('Deploy completado');
        }, 3500);
    }

    // ── Tab effects ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (innerTab === 'kanban') fetchArtifacts();
    }, [innerTab, agentId]);

    useEffect(() => {
        if (innerTab === 'health') {
            fetchHealth();
            healthInterval.current = setInterval(fetchHealth, 30000);
        }
        return () => { if (healthInterval.current) { clearInterval(healthInterval.current); healthInterval.current = null; } };
    }, [innerTab]);

    useEffect(() => {
        if (innerTab === 'deploy') fetchMigrations();
    }, [innerTab]);

    useEffect(() => {
        if (innerTab === 'errors') fetchErrors();
    }, [innerTab]);

    // Initial fetch on mount
    useEffect(() => { fetchArtifacts(); }, [agentId]);

    // ── Computed ─────────────────────────────────────────────────────────────
    const byColumn = KANBAN_COLUMNS.reduce((acc, col) => {
        acc[col.id] = artifacts.filter(a => a.status === col.id);
        return acc;
    }, {});

    const totalByCol = KANBAN_COLUMNS.map(c => ({ ...c, count: byColumn[c.id]?.length || 0 }));

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '24px 28px', fontFamily: 'system-ui, sans-serif' }}>

            {/* Inner tab nav */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f8fafc', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                {INNER_TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setInnerTab(t.id)}
                        style={{
                            padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: 13,
                            background: innerTab === t.id ? 'white' : 'transparent',
                            color: innerTab === t.id ? '#0f172a' : '#64748b',
                            boxShadow: innerTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── KANBAN TAB ── */}
            {innerTab === 'kanban' && (
                <>
                    {/* Stats bar */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                        {totalByCol.map(col => (
                            <div key={col.id} style={{
                                background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
                                padding: '14px 20px', flex: '1 1 120px', minWidth: 120,
                                borderTop: `3px solid ${col.color}`,
                            }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{col.count}</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{col.label}</div>
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Cargando tareas…</div>
                    ) : (
                        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 8 }}>
                            {KANBAN_COLUMNS.map(col => (
                                <KanbanColumn
                                    key={col.id}
                                    col={col}
                                    artifacts={byColumn[col.id] || []}
                                    onMove={moveArtifact}
                                    onHandoff={doHandoff}
                                    movingId={movingId}
                                    onNewTask={() => setNewModal(true)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── SYSTEM HEALTH TAB ── */}
            {innerTab === 'health' && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>System Health</h3>
                            {health?.checked_at && (
                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                    Última verificación: {formatDate(health.checked_at)}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={fetchHealth}
                            disabled={healthLoading}
                            style={{
                                padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb',
                                background: 'white', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
                            }}>
                            {healthLoading ? 'Verificando…' : 'Actualizar'}
                        </button>
                    </div>

                    {healthLoading && !health ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Verificando servicios…</div>
                    ) : health ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                            {health.services.map(svc => <ServiceCard key={svc.id} svc={svc} />)}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No se pudo conectar al backend</div>
                    )}

                    <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#94a3b8' }}>
                        Auto-refresh cada 30s · {/* TODO: POST /api/dev/restart/:serviceId para reiniciar servicios */}
                        Restart por servicio — próximamente
                    </div>
                </>
            )}

            {/* ── DEPLOY & MIGRATIONS TAB ── */}
            {innerTab === 'deploy' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>

                    {/* DB Migrations */}
                    <div>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a' }}>DB Migrations</h3>
                        {migrationsLoading ? (
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>Verificando migraciones…</div>
                        ) : migrations.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>No se encontraron archivos migration_*.sql</div>
                        ) : (
                            migrations.map((m, i) => (
                                <div key={i} style={{
                                    background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
                                    padding: '14px 16px', marginBottom: 8,
                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                }}>
                                    <span style={{ fontSize: 18, marginTop: 1 }}>{m.applied ? '✅' : '⏳'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{m.file}</div>
                                        {m.tables.length > 0 && (
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                                Tablas: {m.tables.join(', ')}
                                                {!m.applied && ` (${m.applied_count}/${m.total_tables} aplicadas)`}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{
                                        fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '2px 9px',
                                        background: m.applied ? '#ecfdf5' : '#fffbeb',
                                        color: m.applied ? '#10b981' : '#f59e0b',
                                    }}>
                                        {m.applied ? 'Aplicada' : 'Pendiente'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Deploy Pipeline */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>Deploy Pipeline</h3>
                            <button
                                onClick={simulateDeploy}
                                disabled={deployInProgress}
                                style={{
                                    padding: '8px 16px', borderRadius: 10, border: 'none',
                                    background: deployInProgress ? '#e5e7eb' : '#2563eb',
                                    color: deployInProgress ? '#94a3b8' : 'white',
                                    fontSize: 13, fontWeight: 600, cursor: deployInProgress ? 'not-allowed' : 'pointer',
                                }}>
                                {deployInProgress ? 'Desplegando…' : 'Deploy Now'}
                            </button>
                        </div>
                        {deploys.map(d => <DeployCard key={d.id} deploy={d} />)}
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
                            {/* TODO: integrar con Vercel API — POST https://api.vercel.com/v13/deployments */}
                            Integración con Vercel API — próximamente
                        </div>
                    </div>
                </div>
            )}

            {/* ── ERROR LOG TAB ── */}
            {innerTab === 'errors' && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Error Log — últimas 24h</h3>
                        <button
                            onClick={() => { setErrors(null); fetchErrors(); }}
                            disabled={errorsLoading}
                            style={{
                                padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb',
                                background: 'white', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer',
                            }}>
                            {errorsLoading ? 'Cargando…' : 'Actualizar'}
                        </button>
                    </div>

                    {errorsLoading && !errors ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Cargando errores…</div>
                    ) : errors?.total === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>Sin errores en las últimas 24 horas</div>
                            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>El sistema funciona correctamente</div>
                        </div>
                    ) : errors?.by_type?.length > 0 ? (
                        <>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 20px' }}>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: '#ef4444' }}>{errors.total}</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Total errores</div>
                                </div>
                                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px' }}>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{errors.by_type.length}</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Tipos distintos</div>
                                </div>
                            </div>
                            {errors.by_type.map((g, i) => <ErrorGroup key={i} group={g} />)}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No hay datos de errores</div>
                    )}
                </>
            )}

            {/* New Task Modal */}
            {showNewModal && (
                <NewTaskModal
                    agentId={agentId}
                    onClose={() => setNewModal(false)}
                    onCreated={() => { setNewModal(false); fetchArtifacts(); showToast('Tarea creada'); }}
                />
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', padding: '12px 20px', borderRadius: 12,
                    fontWeight: 600, fontSize: 14,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
