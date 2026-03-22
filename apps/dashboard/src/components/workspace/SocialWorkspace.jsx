import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../api.js';
import PublishMenu from './PublishMenu.jsx';
import {
    STATUS_COLORS,
    AVATAR_OPTIONS,
    PLATFORM_OPTIONS,
    DURATION_OPTIONS,
    CTA_OPTIONS,
    SOCIAL_TYPE_LABELS,
    SOCIAL_TYPE_ICONS,
    PUBLISH_DESTINATIONS,
} from './artifactConstants.js';

// ─── Calendar helpers ──────────────────────────────────────────────────────────

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekDays(monday) {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function toISODate(date) {
    return date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function formatDayLabel(date) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${days[date.getDay()]} ${date.getDate()}`;
}

function formatWeekRange(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    if (monday.getMonth() === sunday.getMonth()) {
        return `${monday.getDate()}–${sunday.getDate()} ${months[monday.getMonth()]} ${monday.getFullYear()}`;
    }
    return `${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]} ${monday.getFullYear()}`;
}

function isToday(date) {
    const today = new Date();
    return toISODate(date) === toISODate(today);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function AvatarBadge({ avatar, small = false }) {
    const opt = AVATAR_OPTIONS.find(a => a.id === avatar);
    if (!opt) return null;
    return (
        <span style={{
            display: 'inline-block',
            padding: small ? '1px 6px' : '2px 8px',
            borderRadius: '10px',
            fontSize: small ? '0.65rem' : '0.72rem',
            fontWeight: 700,
            color: opt.color,
            background: opt.bg,
            border: `1px solid ${opt.color}30`,
            letterSpacing: '0.01em',
        }}>
            {opt.label}
        </span>
    );
}

function PlatformBadge({ platform, small = false }) {
    const opt = PLATFORM_OPTIONS.find(p => p.id === platform);
    if (!opt) return null;
    return (
        <span style={{
            display: 'inline-block',
            padding: small ? '1px 5px' : '2px 7px',
            borderRadius: '8px',
            fontSize: small ? '0.65rem' : '0.72rem',
            fontWeight: 600,
            background: '#f1f5f9',
            color: '#475569',
        }}>
            {opt.icon} {opt.label}
        </span>
    );
}

function StatusDot({ status }) {
    const s = STATUS_COLORS[status];
    if (!s) return null;
    return (
        <span style={{
            display: 'inline-block', width: '7px', height: '7px',
            borderRadius: '50%', background: s.color, flexShrink: 0,
        }} title={s.label} />
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SocialWorkspace({ agentId, agent }) {
    const [artifacts, setArtifacts]         = useState([]);
    const [loading, setLoading]             = useState(true);
    const [activeView, setActiveView]       = useState('calendar'); // 'calendar' | 'metrics'
    const [weekStart, setWeekStart]         = useState(() => getWeekStart(new Date()));
    const [selectedScript, setSelectedScript] = useState(null);
    const [showWizard, setShowWizard]       = useState(false);
    const [wizardStep, setWizardStep]       = useState(1);
    const [wizard, setWizard]               = useState({
        topic: '', avatar: 'Fernando', platform: 'Instagram',
        duration: '60s', cta: 'web', scheduledDate: '',
    });
    const [generating, setGenerating]       = useState(false);
    const [toast, setToast]                 = useState(null);
    // Panel state
    const [panelEdit, setPanelEdit]         = useState(false);
    const [panelContent, setPanelContent]   = useState('');
    const [panelTitle, setPanelTitle]       = useState('');
    const [rejectReason, setRejectReason]   = useState('');
    const [showReject, setShowReject]       = useState(false);
    const [showPublishMenu, setShowPublishMenu] = useState(false);

    useEffect(() => { fetchArtifacts(); }, [agentId]);

    async function fetchArtifacts() {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/artifacts?agent_id=${agentId}&limit=200`);
            setArtifacts(await res.json());
        } catch {
            showToast('Error cargando scripts', 'error');
        } finally {
            setLoading(false);
        }
    }

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    // ── Derived stats ────────────────────────────────────────────────────────
    const stats = {
        total:    artifacts.length,
        pending:  artifacts.filter(a => a.status === 'pending_review').length,
        approved: artifacts.filter(a => a.status === 'approved').length,
        scheduled: artifacts.filter(a => {
            if (!a.metadata?.scheduled_date) return false;
            const d = new Date(a.metadata.scheduled_date);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const sun   = new Date(weekStart); sun.setDate(weekStart.getDate() + 6);
            return d >= today && d <= sun;
        }).length,
    };

    // ── Calendar helpers ─────────────────────────────────────────────────────
    function getScriptsForDate(date) {
        const iso = toISODate(date);
        return artifacts.filter(a => a.metadata?.scheduled_date === iso);
    }

    // ── API actions ──────────────────────────────────────────────────────────
    async function handleStatusChange(id, status, reason = null) {
        try {
            await fetch(`${API_URL}/artifacts/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, rejection_reason: reason }),
            });
            const labels = { approved: 'aprobado', rejected: 'rechazado', pending_review: 'enviado a revisión' };
            showToast(`Script ${labels[status] || status}`);
            await fetchArtifacts();
            // refresh selected script if open
            if (selectedScript?.id === id) {
                setSelectedScript(prev => ({ ...prev, status, rejection_reason: reason }));
            }
            setShowReject(false);
            setRejectReason('');
        } catch { showToast('Error cambiando estado', 'error'); }
    }

    async function handlePublish(artifact, destination) {
        try {
            await fetch(`${API_URL}/artifacts/${artifact.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination }),
            });
            showToast(`Enviado a ${destination}`);
            setShowPublishMenu(false);
        } catch { showToast('Error al publicar', 'error'); }
    }

    async function handleHandoff(artifact, toAgentId, instruction) {
        try {
            await fetch(`${API_URL}/artifacts/${artifact.id}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_agent_id: toAgentId, instruction }),
            });
            showToast(`Handoff enviado a ${toAgentId}`);
        } catch { showToast('Error en handoff', 'error'); }
    }

    async function savePanelEdit() {
        try {
            await fetch(`${API_URL}/artifacts/${selectedScript.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: panelTitle, content: panelContent }),
            });
            showToast('Script guardado');
            setSelectedScript(prev => ({ ...prev, title: panelTitle, content: panelContent }));
            setPanelEdit(false);
            fetchArtifacts();
        } catch { showToast('Error al guardar', 'error'); }
    }

    async function handleGenerate() {
        setGenerating(true);
        try {
            const res = await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: 'video_script',
                    title: `[Generando] ${wizard.topic || 'Script'}`,
                    content: '',
                    metadata: {
                        avatar: wizard.avatar,
                        platform: wizard.platform,
                        duration: wizard.duration,
                        cta: wizard.cta,
                        scheduled_date: wizard.scheduledDate || null,
                        topic: wizard.topic,
                    },
                }),
            });
            const draft = await res.json();

            const dur = DURATION_OPTIONS.find(d => d.id === wizard.duration);
            const prompt = `/guionizar avatar:${wizard.avatar} plataforma:${wizard.platform} duracion:${wizard.duration} palabras_objetivo:${dur?.words || 150} tema:"${wizard.topic}" cta:${wizard.cta} artifact_id:${draft.id}`;
            fetch(`${API_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, userId: 'workspace-wizard' }),
            }).catch(() => {});

            setShowWizard(false);
            setWizardStep(1);
            setWizard({ topic: '', avatar: 'Fernando', platform: 'Instagram', duration: '60s', cta: 'web', scheduledDate: '' });
            showToast('Generación iniciada. El script aparecerá en el calendario.');
            setTimeout(fetchArtifacts, 2000);
        } catch {
            showToast('Error al generar script', 'error');
        } finally {
            setGenerating(false);
        }
    }

    // ─── Panel open ───────────────────────────────────────────────────────────
    function openScript(script) {
        setSelectedScript(script);
        setPanelTitle(script.title || '');
        setPanelContent(script.content || '');
        setPanelEdit(false);
        setShowReject(false);
        setShowPublishMenu(false);
        setRejectReason('');
    }

    // ─── Week navigation ──────────────────────────────────────────────────────
    function prevWeek() {
        const d = new Date(weekStart);
        d.setDate(d.getDate() - 7);
        setWeekStart(d);
    }
    function nextWeek() {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 7);
        setWeekStart(d);
    }
    function goToToday() { setWeekStart(getWeekStart(new Date())); }

    const weekDays = getWeekDays(weekStart);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                    { label: 'Scripts totales', value: stats.total,     color: '#64748b' },
                    { label: 'En revisión',      value: stats.pending,   color: '#f59e0b' },
                    { label: 'Aprobados',         value: stats.approved,  color: '#10b981' },
                    { label: 'Esta semana',       value: stats.scheduled, color: '#2563EB' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* View toggle + New script button */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {['calendar', 'metrics'].map(view => (
                    <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        style={{
                            padding: '7px 18px', borderRadius: '20px', border: 'none',
                            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                            background: activeView === view ? 'var(--primary)' : '#f1f5f9',
                            color: activeView === view ? '#fff' : '#475569',
                            transition: 'all 0.15s',
                        }}
                    >
                        {view === 'calendar' ? '📅 Calendario' : '📊 Métricas'}
                    </button>
                ))}
                <button
                    onClick={() => { setShowWizard(true); setWizardStep(1); }}
                    style={{
                        marginLeft: 'auto', padding: '7px 20px', borderRadius: '20px',
                        background: 'var(--primary)', color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    }}
                >
                    + Nuevo Script
                </button>
            </div>

            {/* ── CALENDAR VIEW ─────────────────────────────────────────────────── */}
            {activeView === 'calendar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Calendar nav */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={prevWeek}
                            style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >←</button>
                        <button
                            onClick={nextWeek}
                            style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >→</button>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            {formatWeekRange(weekStart)}
                        </span>
                        <button
                            onClick={goToToday}
                            style={{
                                marginLeft: '4px', padding: '4px 12px', borderRadius: '8px',
                                border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer',
                                fontSize: '0.78rem', fontWeight: 600, color: '#2563EB',
                            }}
                        >
                            Hoy
                        </button>
                    </div>

                    {/* Week grid */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando...</div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '8px',
                        }}>
                            {weekDays.map(day => {
                                const scripts = getScriptsForDate(day);
                                const today = isToday(day);
                                return (
                                    <div
                                        key={toISODate(day)}
                                        className="card"
                                        style={{
                                            padding: '10px 8px',
                                            minHeight: '140px',
                                            border: today ? '2px solid var(--primary)' : '1px solid #e5e7eb',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                        }}
                                    >
                                        {/* Day label */}
                                        <div style={{
                                            fontSize: '0.75rem', fontWeight: 700,
                                            color: today ? 'var(--primary)' : '#64748b',
                                            marginBottom: '2px',
                                        }}>
                                            {formatDayLabel(day)}
                                        </div>

                                        {/* Script pills */}
                                        {scripts.slice(0, 3).map(script => {
                                            const avatar = AVATAR_OPTIONS.find(a => a.id === script.metadata?.avatar);
                                            const platform = PLATFORM_OPTIONS.find(p => p.id === script.metadata?.platform);
                                            const status = STATUS_COLORS[script.status];
                                            return (
                                                <div
                                                    key={script.id}
                                                    onClick={() => openScript(script)}
                                                    style={{
                                                        padding: '5px 7px',
                                                        borderRadius: '6px',
                                                        background: avatar?.bg || '#f8fafc',
                                                        border: `1px solid ${avatar?.color || '#e5e7eb'}30`,
                                                        cursor: 'pointer',
                                                        transition: 'opacity 0.1s',
                                                    }}
                                                    title={script.title}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                                                        <StatusDot status={script.status} />
                                                        {platform && <span style={{ fontSize: '0.65rem' }}>{platform.icon}</span>}
                                                        {avatar && (
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: avatar.color }}>
                                                                {avatar.label[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.68rem', color: '#0f172a', fontWeight: 600,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        maxWidth: '100%',
                                                    }}>
                                                        {(script.title || 'Sin título').replace(/^\[Generando\] /, '')}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {scripts.length > 3 && (
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                                                +{scripts.length - 3} más
                                            </div>
                                        )}

                                        {/* Add button */}
                                        <button
                                            onClick={() => {
                                                setWizard(w => ({ ...w, scheduledDate: toISODate(day) }));
                                                setShowWizard(true);
                                                setWizardStep(1);
                                            }}
                                            style={{
                                                marginTop: 'auto',
                                                padding: '3px 0',
                                                background: 'none',
                                                border: '1px dashed #d1d5db',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.72rem',
                                                color: '#94a3b8',
                                                fontWeight: 700,
                                                width: '100%',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; }}
                                            onMouseLeave={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.color = '#94a3b8'; }}
                                        >
                                            + añadir
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Unscheduled scripts (no scheduled_date) */}
                    {(() => {
                        const unscheduled = artifacts.filter(a => !a.metadata?.scheduled_date);
                        if (unscheduled.length === 0) return null;
                        return (
                            <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
                                    Sin programar ({unscheduled.length})
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {unscheduled.map(script => {
                                        const avatar = AVATAR_OPTIONS.find(a => a.id === script.metadata?.avatar);
                                        return (
                                            <div
                                                key={script.id}
                                                onClick={() => openScript(script)}
                                                style={{
                                                    padding: '6px 10px',
                                                    borderRadius: '8px',
                                                    background: avatar?.bg || '#f8fafc',
                                                    border: `1px solid ${avatar?.color || '#e5e7eb'}40`,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    maxWidth: '200px',
                                                }}
                                            >
                                                <StatusDot status={script.status} />
                                                <span style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {(script.title || 'Sin título').replace(/^\[Generando\] /, '')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ── METRICS VIEW ──────────────────────────────────────────────────── */}
            {activeView === 'metrics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Fernando vs Yolanda */}
                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                            Rendimiento por Avatar
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {AVATAR_OPTIONS.map(avatar => {
                                const avScripts = artifacts.filter(a => a.metadata?.avatar === avatar.id);
                                const approved  = avScripts.filter(a => a.status === 'approved' || a.status === 'published').length;
                                const pct = avScripts.length > 0 ? Math.round((approved / avScripts.length) * 100) : 0;
                                return (
                                    <div key={avatar.id} style={{
                                        padding: '16px', borderRadius: '12px',
                                        background: avatar.bg, border: `1px solid ${avatar.color}30`,
                                    }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: avatar.color, marginBottom: '12px' }}>
                                            {avatar.label}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{avScripts.length}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Scripts</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: avatar.color }}>{pct}%</div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Aprobados</div>
                                            </div>
                                        </div>
                                        {/* Status breakdown */}
                                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            {['draft', 'pending_review', 'approved', 'published', 'rejected'].map(s => {
                                                const n = avScripts.filter(a => a.status === s).length;
                                                if (n === 0) return null;
                                                const sc = STATUS_COLORS[s];
                                                return (
                                                    <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                                        <span style={{ color: sc?.color }}>{sc?.label}</span>
                                                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{n}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Platform breakdown */}
                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                            Distribución por Plataforma
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {PLATFORM_OPTIONS.map(platform => {
                                const plScripts = artifacts.filter(a => a.metadata?.platform === platform.id);
                                const approved  = plScripts.filter(a => a.status === 'approved' || a.status === 'published').length;
                                const total     = artifacts.length || 1;
                                const barW      = Math.round((plScripts.length / total) * 100);
                                return (
                                    <div key={platform.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                                                {platform.icon} {platform.label}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                {plScripts.length} scripts · {approved} aprobados
                                            </span>
                                        </div>
                                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${barW}%`,
                                                background: 'var(--primary)', borderRadius: '6px',
                                                transition: 'width 0.4s ease',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Script type breakdown */}
                    <div className="card" style={{ padding: '20px' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                            Por Tipo de Artefacto
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {Object.entries(SOCIAL_TYPE_LABELS).map(([type, label]) => {
                                const n = artifacts.filter(a => a.type === type).length;
                                return (
                                    <div key={type} style={{
                                        padding: '12px 16px', borderRadius: '10px',
                                        background: '#f8fafc', border: '1px solid #e5e7eb',
                                        textAlign: 'center', minWidth: '90px',
                                    }}>
                                        <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{SOCIAL_TYPE_ICONS[type]}</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{n}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── SCRIPT DETAIL PANEL ───────────────────────────────────────────── */}
            {selectedScript && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setSelectedScript(null)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.25)', zIndex: 900,
                        }}
                    />
                    {/* Panel */}
                    <div style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0,
                        width: '420px', maxWidth: '95vw',
                        background: '#fff', zIndex: 901,
                        boxShadow: '-4px 0 30px rgba(0,0,0,0.12)',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden',
                    }}>
                        {/* Panel header */}
                        <div style={{
                            padding: '18px 20px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        }}>
                            <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                                {panelEdit ? (
                                    <input
                                        value={panelTitle}
                                        onChange={e => setPanelTitle(e.target.value)}
                                        className="edit-input-inline"
                                        style={{ width: '100%', fontWeight: 700, fontSize: '0.95rem' }}
                                    />
                                ) : (
                                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' }}>
                                        {selectedScript.title || 'Sin título'}
                                    </h3>
                                )}
                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
                                    <AvatarBadge avatar={selectedScript.metadata?.avatar} />
                                    <PlatformBadge platform={selectedScript.metadata?.platform} />
                                    {selectedScript.metadata?.duration && (
                                        <span style={{
                                            padding: '2px 7px', borderRadius: '8px', fontSize: '0.72rem',
                                            fontWeight: 600, background: '#f1f5f9', color: '#475569',
                                        }}>
                                            {DURATION_OPTIONS.find(d => d.id === selectedScript.metadata.duration)?.label || selectedScript.metadata.duration}
                                        </span>
                                    )}
                                    {(() => {
                                        const s = STATUS_COLORS[selectedScript.status];
                                        return s ? (
                                            <span style={{
                                                padding: '2px 7px', borderRadius: '8px', fontSize: '0.72rem',
                                                fontWeight: 700, background: s.bg, color: s.color,
                                            }}>
                                                {s.label}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                                {selectedScript.metadata?.scheduled_date && (
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                                        📅 {selectedScript.metadata.scheduled_date}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedScript(null)}
                                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, padding: '2px' }}
                            >✕</button>
                        </div>

                        {/* Panel body */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Content editor */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Guión</span>
                                    {panelEdit ? (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => setPanelEdit(false)}
                                                className="artifact-action-btn"
                                                style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                                            >Cancelar</button>
                                            <button
                                                onClick={savePanelEdit}
                                                className="artifact-action-btn approve"
                                                style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                                            >Guardar</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setPanelEdit(true)}
                                            className="artifact-action-btn"
                                            style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                                        >Editar</button>
                                    )}
                                </div>
                                {panelEdit ? (
                                    <>
                                        <textarea
                                            value={panelContent}
                                            onChange={e => setPanelContent(e.target.value)}
                                            className="edit-input-inline"
                                            style={{
                                                width: '100%', minHeight: '200px', resize: 'vertical',
                                                boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6,
                                                fontSize: '0.85rem',
                                            }}
                                        />
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>
                                            {panelContent.split(/\s+/).filter(Boolean).length} palabras
                                            {selectedScript.metadata?.duration && (() => {
                                                const dur = DURATION_OPTIONS.find(d => d.id === selectedScript.metadata.duration);
                                                return dur ? ` · objetivo: ${dur.words} palabras (${dur.label})` : '';
                                            })()}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{
                                        padding: '12px', background: '#f8fafc', borderRadius: '8px',
                                        fontSize: '0.84rem', color: '#0f172a', lineHeight: 1.65,
                                        minHeight: '100px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    }}>
                                        {selectedScript.content || (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                                {selectedScript.title?.startsWith('[Generando]') ? 'Generando contenido...' : 'Sin contenido aún.'}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* CTA */}
                            {selectedScript.metadata?.cta && (
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    <span style={{ fontWeight: 700 }}>CTA: </span>
                                    {CTA_OPTIONS.find(c => c.id === selectedScript.metadata.cta)?.label || selectedScript.metadata.cta}
                                </div>
                            )}

                            {/* Rejection reason */}
                            {selectedScript.rejection_reason && (
                                <div style={{
                                    padding: '10px 12px', background: '#fef2f2', borderRadius: '8px',
                                    border: '1px solid #fecaca',
                                }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', marginBottom: '2px' }}>Motivo de rechazo</div>
                                    <div style={{ fontSize: '0.82rem', color: '#7f1d1d' }}>{selectedScript.rejection_reason}</div>
                                </div>
                            )}

                            {/* Status actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Acciones</div>

                                {selectedScript.status === 'draft' && (
                                    <button
                                        onClick={() => handleStatusChange(selectedScript.id, 'pending_review')}
                                        className="artifact-action-btn"
                                        style={{ background: '#fffbeb', color: '#92400e', borderColor: '#fde68a', fontWeight: 700 }}
                                    >
                                        Enviar a revisión
                                    </button>
                                )}

                                {selectedScript.status === 'pending_review' && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleStatusChange(selectedScript.id, 'approved')}
                                            className="artifact-action-btn approve"
                                            style={{ flex: 1 }}
                                        >
                                            ✅ Aprobar
                                        </button>
                                        <button
                                            onClick={() => setShowReject(r => !r)}
                                            className="artifact-action-btn reject"
                                            style={{ flex: 1 }}
                                        >
                                            ❌ Rechazar
                                        </button>
                                    </div>
                                )}

                                {showReject && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <input
                                            className="edit-input-inline"
                                            placeholder="Motivo del rechazo..."
                                            value={rejectReason}
                                            onChange={e => setRejectReason(e.target.value)}
                                        />
                                        <button
                                            onClick={() => handleStatusChange(selectedScript.id, 'rejected', rejectReason)}
                                            className="artifact-action-btn reject"
                                            disabled={!rejectReason.trim()}
                                        >
                                            Confirmar rechazo
                                        </button>
                                    </div>
                                )}

                                {selectedScript.status === 'approved' && (
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setShowPublishMenu(m => !m)}
                                            className="artifact-action-btn"
                                            style={{ background: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe', fontWeight: 700, width: '100%' }}
                                        >
                                            Publicar en...
                                        </button>
                                        {showPublishMenu && (
                                            <PublishMenu
                                                artifact={selectedScript}
                                                onPublish={handlePublish}
                                                onClose={() => setShowPublishMenu(false)}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Handoff section */}
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Handoffs</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <button
                                        onClick={() => handleHandoff(selectedScript, 'content-agent', `Generar imagen de cover para el script: "${selectedScript.title}". Plataforma: ${selectedScript.metadata?.platform || 'Instagram'}. Estilo: profesional, minimalista.`)}
                                        className="artifact-action-btn"
                                        style={{ textAlign: 'left', fontSize: '0.78rem' }}
                                    >
                                        🎨 Pedir cover → Content Agent
                                    </button>
                                    <button
                                        onClick={() => handleHandoff(selectedScript, 'social-media-agent', `Generar variante del script para la otra plataforma: "${selectedScript.title}"`)}
                                        className="artifact-action-btn"
                                        style={{ textAlign: 'left', fontSize: '0.78rem' }}
                                    >
                                        🔄 Generar variante plataforma
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── WIZARD ────────────────────────────────────────────────────────── */}
            {showWizard && (
                <div className="modal-overlay" onClick={() => setShowWizard(false)} style={{ zIndex: 1000 }}>
                    <div
                        className="card"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '520px', width: '90vw',
                            margin: 'auto', marginTop: '6vh',
                            display: 'flex', flexDirection: 'column', gap: '20px',
                        }}
                    >
                        {/* Wizard header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                    Nuevo Script
                                </h3>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                    Paso {wizardStep} de 4
                                </div>
                            </div>
                            <button
                                onClick={() => setShowWizard(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}
                            >✕</button>
                        </div>

                        {/* Step progress */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3, 4].map(n => (
                                <div key={n} style={{
                                    flex: 1, height: '4px', borderRadius: '4px',
                                    background: n <= wizardStep ? 'var(--primary)' : '#e5e7eb',
                                    transition: 'background 0.2s',
                                }} />
                            ))}
                        </div>

                        {/* Step 1: Tema */}
                        {wizardStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    ¿Sobre qué tema es el script?
                                </h4>
                                <textarea
                                    className="edit-input-inline"
                                    style={{ minHeight: '120px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
                                    placeholder="Ej: Por qué invertir en Dubai en 2026, ventajas del mercado off-plan, cómo funciona el Golden Visa..."
                                    value={wizard.topic}
                                    onChange={e => setWizard(w => ({ ...w, topic: e.target.value }))}
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Step 2: Avatar + Plataforma */}
                        {wizardStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                        Avatar
                                    </h4>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {AVATAR_OPTIONS.map(avatar => (
                                            <div
                                                key={avatar.id}
                                                onClick={() => setWizard(w => ({ ...w, avatar: avatar.id }))}
                                                style={{
                                                    flex: 1, padding: '14px', borderRadius: '10px',
                                                    border: `2px solid ${wizard.avatar === avatar.id ? avatar.color : '#e5e7eb'}`,
                                                    background: wizard.avatar === avatar.id ? avatar.bg : '#fff',
                                                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, color: avatar.color, fontSize: '1rem' }}>{avatar.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                        Plataforma
                                    </h4>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {PLATFORM_OPTIONS.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setWizard(w => ({ ...w, platform: p.id }))}
                                                className={`wizard-option-pill ${wizard.platform === p.id ? 'selected' : ''}`}
                                            >
                                                {p.icon} {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Duración + CTA + Fecha */}
                        {wizardStep === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Duración</h4>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {DURATION_OPTIONS.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => setWizard(w => ({ ...w, duration: d.id }))}
                                                className={`wizard-option-pill ${wizard.duration === d.id ? 'selected' : ''}`}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>CTA (Call to Action)</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {CTA_OPTIONS.map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => setWizard(w => ({ ...w, cta: c.id }))}
                                                style={{
                                                    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                                    border: `1px solid ${wizard.cta === c.id ? 'var(--primary)' : '#e5e7eb'}`,
                                                    background: wizard.cta === c.id ? 'var(--primary-light, #eff6ff)' : '#fff',
                                                    fontSize: '0.85rem', fontWeight: 600,
                                                    color: wizard.cta === c.id ? 'var(--primary)' : '#475569',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {c.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                        Fecha de publicación <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span>
                                    </h4>
                                    <input
                                        type="date"
                                        className="edit-input-inline"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        value={wizard.scheduledDate}
                                        onChange={e => setWizard(w => ({ ...w, scheduledDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Resumen */}
                        {wizardStep === 4 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    Resumen del script
                                </h4>
                                {[
                                    { label: 'Tema',      value: wizard.topic || '(sin especificar)' },
                                    { label: 'Avatar',    value: wizard.avatar },
                                    { label: 'Plataforma', value: PLATFORM_OPTIONS.find(p => p.id === wizard.platform)?.label },
                                    { label: 'Duración',  value: DURATION_OPTIONS.find(d => d.id === wizard.duration)?.label },
                                    { label: 'CTA',       value: CTA_OPTIONS.find(c => c.id === wizard.cta)?.label },
                                    { label: 'Fecha',     value: wizard.scheduledDate || 'Sin programar' },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{
                                        display: 'flex', gap: '10px',
                                        padding: '8px 12px', background: '#f8fafc', borderRadius: '8px',
                                    }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', minWidth: '80px' }}>{label}</span>
                                        <span style={{ fontSize: '0.85rem', color: '#0f172a' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Wizard nav */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', paddingTop: '4px' }}>
                            <button
                                className="artifact-action-btn"
                                onClick={() => wizardStep === 1 ? setShowWizard(false) : setWizardStep(s => s - 1)}
                            >
                                {wizardStep === 1 ? 'Cancelar' : 'Atrás'}
                            </button>
                            {wizardStep < 4 ? (
                                <button
                                    style={{
                                        padding: '8px 24px', borderRadius: '20px',
                                        background: 'var(--primary)', color: '#fff', border: 'none',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                    onClick={() => setWizardStep(s => s + 1)}
                                    disabled={wizardStep === 1 && !wizard.topic.trim()}
                                >
                                    Siguiente
                                </button>
                            ) : (
                                <button
                                    style={{
                                        padding: '8px 24px', borderRadius: '20px',
                                        background: generating ? '#94a3b8' : 'var(--primary)',
                                        color: '#fff', border: 'none',
                                        fontWeight: 700, fontSize: '0.85rem',
                                        cursor: generating ? 'not-allowed' : 'pointer',
                                    }}
                                    onClick={handleGenerate}
                                    disabled={generating}
                                >
                                    {generating ? 'Generando...' : '🎬 Generar Script'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000,
                    background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
                    color: toast.type === 'error' ? '#991b1b' : '#065f46',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
                    padding: '12px 20px', borderRadius: '12px',
                    fontWeight: 600, fontSize: '0.85rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
