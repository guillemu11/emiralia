import { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../../api.js';
import ArtifactCard from './ArtifactCard.jsx';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import {
    RESEARCH_TYPES,
    RESEARCH_IMPACT_LEVELS,
    RESEARCH_CATEGORIES,
    RESEARCH_SOURCES,
    RESEARCH_HANDOFF_AGENTS,
} from './artifactConstants.js';

const TABS = [
    { id: 'feed',    label: '📡 Intelligence Feed' },
    { id: 'sources', label: '🔍 Source Monitor'    },
    { id: 'actions', label: '⚡ Action Items'       },
    { id: 'trends',  label: '📈 Trend Analysis'    },
];

const STATUS_OPTS = [
    { value: 'all',            label: 'Todos los estados' },
    { value: 'draft',          label: 'Borrador'          },
    { value: 'pending_review', label: 'En revisión'       },
    { value: 'approved',       label: 'Aprobado'          },
    { value: 'rejected',       label: 'Rechazado'         },
    { value: 'published',      label: 'Publicado'         },
];

function ImpactBadge({ impact }) {
    const level = RESEARCH_IMPACT_LEVELS.find(l => l.id === impact);
    if (!level) return null;
    return (
        <span
            style={{ color: level.textColor, background: level.bg, border: `1px solid ${level.color}30` }}
            className="text-xs font-bold px-2 py-0.5 rounded-full"
        >
            {level.label}
        </span>
    );
}

function SourceStatusBadge({ status }) {
    const map = {
        active:  { label: 'Activa',  bg: '#f0fdf4', color: '#16a34a' },
        idle:    { label: 'Inactiva', bg: '#f8fafc', color: '#64748b' },
        error:   { label: 'Error',   bg: '#fef2f2', color: '#dc2626' },
    };
    const s = map[status] || map.idle;
    return (
        <span
            style={{ background: s.bg, color: s.color }}
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
        >
            {s.label}
        </span>
    );
}

export default function ResearchWorkspace({ agentId, agent }) {
    const [activeTab, setActiveTab]             = useState('feed');
    const [artifacts, setArtifacts]             = useState([]);
    const [allArtifacts, setAllArtifacts]       = useState([]); // full set for trend/action derivation
    const [stats, setStats]                     = useState(null);
    const [loading, setLoading]                 = useState(true);
    const [statusFilter, setStatusFilter]       = useState('all');
    const [impactFilter, setImpactFilter]       = useState('all');
    const [categoryFilter, setCategoryFilter]   = useState('all');
    const [typeFilter, setTypeFilter]           = useState('all');
    const [previewArtifact, setPreviewArtifact] = useState(null);
    const [editArtifact, setEditArtifact]       = useState(null);
    const [editForm, setEditForm]               = useState({ title: '', content: '' });
    const [handoffState, setHandoffState]       = useState({}); // { [id]: { agent, instruction } }
    const [sendingHandoff, setSendingHandoff]   = useState({});
    const [toast, setToast]                     = useState(null);

    useEffect(() => {
        fetchArtifacts();
        fetchAllArtifacts();
        fetchStats();
    }, [agentId, activeTab, statusFilter, impactFilter, categoryFilter, typeFilter]);

    async function fetchArtifacts() {
        if (activeTab === 'sources' || activeTab === 'trends') { setLoading(false); return; }
        setLoading(true);
        try {
            const types = activeTab === 'actions'
                ? ['intelligence_report', 'market_alert', 'competitor_intel']
                : typeFilter !== 'all'
                    ? [typeFilter]
                    : ['intelligence_report', 'market_alert', 'competitor_intel'];

            const fetches = types.map(type => {
                const params = new URLSearchParams({ agent_id: agentId, type, limit: '100' });
                if (statusFilter !== 'all') params.append('status', statusFilter);
                return fetch(`${API_URL}/artifacts?${params}`).then(r => r.json());
            });
            let all = (await Promise.all(fetches)).flat();

            // Client-side filters on metadata
            if (impactFilter !== 'all') {
                all = all.filter(a => a.metadata?.impact === impactFilter);
            }
            if (categoryFilter !== 'all') {
                all = all.filter(a => a.metadata?.category === categoryFilter);
            }
            if (activeTab === 'actions') {
                all = all.filter(a => a.metadata?.requires_action === true);
            }
            all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setArtifacts(all);
        } catch {
            showToast('Error cargando artefactos', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function fetchAllArtifacts() {
        try {
            const types = ['intelligence_report', 'market_alert', 'competitor_intel'];
            const fetches = types.map(type => {
                const params = new URLSearchParams({ agent_id: agentId, type, limit: '200' });
                return fetch(`${API_URL}/artifacts?${params}`).then(r => r.json());
            });
            const all = (await Promise.all(fetches)).flat();
            setAllArtifacts(all);
        } catch { /* optional */ }
    }

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/artifacts/stats?agent_id=${agentId}`);
            setStats(await res.json());
        } catch { /* optional */ }
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

    async function sendActionHandoff(artifact) {
        const state = handoffState[artifact.id] || {};
        if (!state.agent) return showToast('Selecciona un agente destino', 'error');
        setSendingHandoff(s => ({ ...s, [artifact.id]: true }));
        try {
            await fetch(`${API_URL}/artifacts/${artifact.id}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to_agent_id: state.agent,
                    instruction: state.instruction || artifact.title,
                }),
            });
            showToast('Handoff enviado');
            setHandoffState(s => { const n = { ...s }; delete n[artifact.id]; return n; });
        } catch {
            showToast('Error en handoff', 'error');
        } finally {
            setSendingHandoff(s => ({ ...s, [artifact.id]: false }));
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

    // ─── Trend analysis derivation ─────────────────────────────────────────
    const trendData = useMemo(() => {
        const topicMap = {};
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        allArtifacts.forEach(a => {
            const topic = a.metadata?.topic;
            if (!topic) return;
            const ts = new Date(a.created_at).getTime();
            if (!topicMap[topic]) {
                topicMap[topic] = { topic, count: 0, lastSeen: ts, recentCount: 0 };
            }
            topicMap[topic].count++;
            if (ts > topicMap[topic].lastSeen) topicMap[topic].lastSeen = ts;
            if (now - ts < thirtyDays) topicMap[topic].recentCount++;
        });
        return Object.values(topicMap).sort((a, b) => b.count - a.count);
    }, [allArtifacts]);

    // ─── Source status derivation from recent artifacts ────────────────────
    const sourceStatus = useMemo(() => {
        const map = {};
        allArtifacts.forEach(a => {
            const src = a.metadata?.source_id;
            if (!src) return;
            if (!map[src]) map[src] = { count: 0, lastSeen: null };
            map[src].count++;
            const ts = new Date(a.created_at).getTime();
            if (!map[src].lastSeen || ts > map[src].lastSeen) map[src].lastSeen = ts;
        });
        return map;
    }, [allArtifacts]);

    // ─── Computed counts ───────────────────────────────────────────────────
    const highCount = allArtifacts.filter(
        a => a.metadata?.impact === 'HIGH' && a.status !== 'published'
    ).length;
    const actionCount = allArtifacts.filter(
        a => a.metadata?.requires_action === true
    ).length;
    const totalCount = stats?.total || allArtifacts.length;

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6">

            {/* Stats header */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Reportes totales</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{highCount}</div>
                    <div className="text-xs text-slate-500 mt-1">HIGH pendientes</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">{actionCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Action items</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: Intelligence Feed ── */}
            {activeTab === 'feed' && (
                <div className="flex flex-col gap-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 bg-white"
                        >
                            <option value="all">Todos los tipos</option>
                            {RESEARCH_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        <select
                            value={impactFilter}
                            onChange={e => setImpactFilter(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 bg-white"
                        >
                            <option value="all">Todo impacto</option>
                            {RESEARCH_IMPACT_LEVELS.map(l => (
                                <option key={l.id} value={l.id}>{l.label}</option>
                            ))}
                        </select>
                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 bg-white"
                        >
                            <option value="all">Todas las categorías</option>
                            {RESEARCH_CATEGORIES.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-slate-700 bg-white"
                        >
                            {STATUS_OPTS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Artifact grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse h-40" />
                            ))}
                        </div>
                    ) : artifacts.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                            <div className="text-4xl mb-3">📡</div>
                            <div className="text-slate-500 font-medium">No hay reportes de inteligencia</div>
                            <div className="text-slate-400 text-sm mt-1">
                                Ejecuta /research-monitor para generar el primer reporte
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {artifacts.map(artifact => (
                                <div key={artifact.id} className="relative">
                                    {artifact.metadata?.impact && (
                                        <div className="absolute top-3 right-3 z-10">
                                            <ImpactBadge impact={artifact.metadata.impact} />
                                        </div>
                                    )}
                                    <ArtifactCard
                                        artifact={artifact}
                                        onPreview={setPreviewArtifact}
                                        onEdit={openEdit}
                                        onStatusChange={handleStatusChange}
                                        onPublish={handlePublish}
                                        onHandoff={handleHandoff}
                                        handoffAgents={RESEARCH_HANDOFF_AGENTS}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Source Monitor ── */}
            {activeTab === 'sources' && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-500">
                        Estado de las fuentes monitoreadas. El estado se infiere de los artefactos guardados.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {RESEARCH_SOURCES.map(src => {
                            const info = sourceStatus[src.id] || {};
                            const hasData = !!info.lastSeen;
                            const status = hasData ? 'active' : 'idle';
                            const lastSeen = info.lastSeen
                                ? new Date(info.lastSeen).toLocaleDateString('es-ES', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                  })
                                : 'Sin datos';
                            return (
                                <div
                                    key={src.id}
                                    className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                                <i data-lucide={src.icon} className="w-5 h-5 text-slate-600" />
                                            </div>
                                            <span className="font-semibold text-slate-900 text-sm">{src.name}</span>
                                        </div>
                                        <SourceStatusBadge status={status} />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Artículos detectados</span>
                                        <span className="font-semibold text-slate-700">{info.count || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Última revisión</span>
                                        <span className="font-semibold text-slate-700">{lastSeen}</span>
                                    </div>
                                    {src.url && (
                                        <a
                                            href={src.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline mt-1"
                                        >
                                            Ver fuente →
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── TAB: Action Items ── */}
            {activeTab === 'actions' && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-500">
                        Hallazgos que requieren acción de otro agente.
                        Selecciona el agente destino y envía el handoff.
                    </p>
                    {loading ? (
                        <div className="flex flex-col gap-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse h-28" />
                            ))}
                        </div>
                    ) : artifacts.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                            <div className="text-4xl mb-3">✅</div>
                            <div className="text-slate-500 font-medium">No hay action items pendientes</div>
                            <div className="text-slate-400 text-sm mt-1">
                                Los hallazgos con <code className="text-xs">requires_action: true</code> aparecerán aquí
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {artifacts.map(artifact => {
                                const hs = handoffState[artifact.id] || {};
                                const isSending = sendingHandoff[artifact.id];
                                const suggestedAgent = artifact.metadata?.suggested_agent;
                                return (
                                    <div
                                        key={artifact.id}
                                        className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {artifact.metadata?.impact && (
                                                        <ImpactBadge impact={artifact.metadata.impact} />
                                                    )}
                                                    <span className="text-xs text-slate-400">
                                                        {artifact.type?.replace('_', ' ')}
                                                    </span>
                                                    {artifact.metadata?.category && (
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                            {artifact.metadata.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-semibold text-slate-900 text-sm">{artifact.title}</h4>
                                                {artifact.content && (
                                                    <p className="text-xs text-slate-500 line-clamp-2">{artifact.content}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setPreviewArtifact(artifact)}
                                                className="text-xs text-primary hover:underline shrink-0"
                                            >
                                                Ver
                                            </button>
                                        </div>
                                        {/* Handoff row */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                                            <select
                                                value={hs.agent || suggestedAgent || ''}
                                                onChange={e => setHandoffState(s => ({
                                                    ...s,
                                                    [artifact.id]: { ...s[artifact.id], agent: e.target.value },
                                                }))}
                                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white flex-1 min-w-0"
                                            >
                                                <option value="">Seleccionar agente destino…</option>
                                                {RESEARCH_HANDOFF_AGENTS.map(a => (
                                                    <option key={a.id} value={a.id}>{a.label}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={hs.instruction || ''}
                                                onChange={e => setHandoffState(s => ({
                                                    ...s,
                                                    [artifact.id]: { ...s[artifact.id], instruction: e.target.value },
                                                }))}
                                                placeholder="Instrucción (opcional)"
                                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white flex-1 min-w-0"
                                            />
                                            <button
                                                onClick={() => sendActionHandoff(artifact)}
                                                disabled={isSending || !hs.agent}
                                                className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
                                            >
                                                {isSending ? 'Enviando…' : 'Enviar handoff'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Trend Analysis ── */}
            {activeTab === 'trends' && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-500">
                        Topics emergentes detectados en los últimos reportes.
                        Los conteos se calculan sobre los artefactos guardados.
                    </p>
                    {trendData.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                            <div className="text-4xl mb-3">📈</div>
                            <div className="text-slate-500 font-medium">Sin datos de tendencias</div>
                            <div className="text-slate-400 text-sm mt-1">
                                Los reportes con <code className="text-xs">metadata.topic</code> alimentan este panel
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-slate-50">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Topic</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Menciones</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Últimos 30d</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tendencia</th>
                                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Última aparición</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trendData.map((item, idx) => {
                                        const trendIcon = item.recentCount > item.count / 2
                                            ? '↑'
                                            : item.recentCount > 0
                                                ? '→'
                                                : '↓';
                                        const trendColor = trendIcon === '↑'
                                            ? 'text-green-600'
                                            : trendIcon === '→'
                                                ? 'text-amber-600'
                                                : 'text-slate-400';
                                        return (
                                            <tr key={idx} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3 font-medium text-slate-800">{item.topic}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-bold text-slate-900">{item.count}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-semibold text-primary">{item.recentCount}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-lg font-bold ${trendColor}`}>{trendIcon}</span>
                                                </td>
                                                <td className="px-5 py-3 text-right text-slate-500 text-xs">
                                                    {new Date(item.lastSeen).toLocaleDateString('es-ES', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                    })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Preview modal ── */}
            {previewArtifact && (
                <ArtifactPreviewModal
                    artifact={previewArtifact}
                    onClose={() => setPreviewArtifact(null)}
                    onEdit={openEdit}
                    onStatusChange={handleStatusChange}
                />
            )}

            {/* ── Edit modal ── */}
            {editArtifact && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Editar artefacto</h3>
                            <button
                                onClick={() => setEditArtifact(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >✕</button>
                        </div>
                        <input
                            type="text"
                            value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Título"
                            className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-slate-900"
                        />
                        <textarea
                            value={editForm.content}
                            onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                            rows={8}
                            placeholder="Contenido"
                            className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-slate-900 resize-none"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setEditArtifact(null)}
                                className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveEdit}
                                className="text-sm bg-primary text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${
                    toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'
                }`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
