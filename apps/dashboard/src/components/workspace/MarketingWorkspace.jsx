import { useState, useEffect } from 'react';
import { API_URL } from '../../api.js';
import ArtifactCard from './ArtifactCard.jsx';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import WsIcon from './WsIcon.jsx';
import {
    MARKETING_TYPES, CAMPAIGN_CHANNELS, DOC_SUBTYPES,
    REPORT_PERIODS, MARKETING_HANDOFF_AGENTS,
} from './artifactConstants.js';

const INNER_TABS = [
    { id: 'campaigns',  label: 'Campañas',   icon: 'target'    },
    { id: 'documents',  label: 'Documentos', icon: 'file-text' },
    { id: 'channels',   label: 'Canales',    icon: 'bar-chart' },
    { id: 'calendar',   label: 'Calendario', icon: 'calendar'  },
];

const STATUS_COLORS = {
    draft:          { color: '#94a3b8', bg: '#f1f5f9', label: 'Borrador' },
    pending_review: { color: '#f59e0b', bg: '#fffbeb', label: 'En revisión' },
    approved:       { color: '#10b981', bg: '#ecfdf5', label: 'Aprobado' },
    rejected:       { color: '#ef4444', bg: '#fef2f2', label: 'Rechazado' },
    published:      { color: '#3b82f6', bg: '#eff6ff', label: 'Publicado' },
};

const CHANNEL_LABEL = Object.fromEntries(CAMPAIGN_CHANNELS.map(c => [c.id, c.label]));

export default function MarketingWorkspace({ agentId, agent }) {
    const [artifacts, setArtifacts]               = useState([]);
    const [stats, setStats]                       = useState(null);
    const [loading, setLoading]                   = useState(true);
    const [innerTab, setInnerTab]                 = useState('campaigns');
    const [filterStatus, setFilterStatus]         = useState('all');
    const [filterChannel, setFilterChannel]       = useState('all');
    const [previewArtifact, setPreviewArtifact]   = useState(null);
    const [editArtifact, setEditArtifact]         = useState(null);
    const [showWizard, setShowWizard]             = useState(false);
    const [wizardType, setWizardType]             = useState('campaign_brief');
    const [wizardStep, setWizardStep]             = useState(1);
    const [wizard, setWizard]                     = useState(defaultWizard());
    const [generating, setGenerating]             = useState(false);
    const [toast, setToast]                       = useState(null);
    const [editForm, setEditForm]                 = useState({ title: '', content: '' });

    function defaultWizard() {
        return {
            // campaign_brief fields
            channel: 'Organic', audience: '', budget: '', start_date: '', end_date: '', lead_goal: '',
            // positioning_doc fields
            subtype: 'icp', context: '',
            // channel_report fields
            report_channel: 'Organic', period: 'last_month', known_metrics: '',
            // gtm_strategy fields
            phase: 'Phase 1', quarter: 'Q2 2026',
        };
    }

    useEffect(() => {
        fetchArtifacts();
        fetchStats();
    }, [agentId]);

    async function fetchArtifacts() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ agent_id: agentId, limit: '100' });
            const res = await fetch(`${API_URL}/artifacts?${params}`);
            setArtifacts(await res.json());
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
        } catch { /* stats son opcionales */ }
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
            const labels = { approved: 'aprobado', rejected: 'rechazado', pending_review: 'enviado a revisión', published: 'publicado' };
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

    function openWizard(type) {
        setWizardType(type);
        setWizard(defaultWizard());
        setWizardStep(1);
        setShowWizard(true);
    }

    function wizardTotalSteps() {
        if (wizardType === 'campaign_brief') return 3;
        return 2;
    }

    async function handleGenerate() {
        setGenerating(true);
        try {
            let title = '';
            let metadata = {};
            let prompt = '';

            if (wizardType === 'campaign_brief') {
                title = `Campaign Brief — ${wizard.channel} (${wizard.quarter || new Date().getFullYear()})`;
                metadata = {
                    channel: wizard.channel, audience: wizard.audience,
                    budget: wizard.budget, start_date: wizard.start_date,
                    end_date: wizard.end_date, lead_goal: wizard.lead_goal,
                };
                prompt = `/generar tipo:campaign_brief canal:"${wizard.channel}" audiencia:"${wizard.audience}" presupuesto:"${wizard.budget}" inicio:"${wizard.start_date}" fin:"${wizard.end_date}" objetivo_leads:"${wizard.lead_goal}"`;
            } else if (wizardType === 'positioning_doc') {
                const subtypeLabel = DOC_SUBTYPES.find(d => d.value === wizard.subtype)?.label || wizard.subtype;
                title = `${subtypeLabel}`;
                metadata = { subtype: wizard.subtype, context: wizard.context };
                prompt = `/generar tipo:positioning_doc subtipo:"${wizard.subtype}" contexto:"${wizard.context}"`;
            } else if (wizardType === 'channel_report') {
                title = `Channel Report — ${CHANNEL_LABEL[wizard.report_channel] || wizard.report_channel} (${wizard.period})`;
                metadata = { channel: wizard.report_channel, period: wizard.period, known_metrics: wizard.known_metrics };
                prompt = `/generar tipo:channel_report canal:"${wizard.report_channel}" periodo:"${wizard.period}" metricas_conocidas:"${wizard.known_metrics}"`;
            } else if (wizardType === 'gtm_strategy') {
                title = `GTM Strategy — ${wizard.quarter}`;
                metadata = { phase: wizard.phase, quarter: wizard.quarter };
                prompt = `/generar tipo:gtm_strategy fase:"${wizard.phase}" trimestre:"${wizard.quarter}"`;
            }

            const res = await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: wizardType,
                    title: `[Generando] ${title}`,
                    content: '',
                    metadata,
                }),
            });
            const draft = await res.json();

            // Fire-and-forget: dispara generación via agent chat
            fetch(`${API_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `${prompt} artifact_id:${draft.id}`,
                    userId: 'workspace-wizard',
                }),
            }).catch(() => {});

            setShowWizard(false);
            setWizard(defaultWizard());
            showToast('Generación iniciada. El artefacto aparecerá en borrador.');
            setTimeout(fetchArtifacts, 2000);
        } catch {
            showToast('Error al iniciar generación', 'error');
        } finally {
            setGenerating(false);
        }
    }

    // ─── Derived data ──────────────────────────────────────────────────────────

    const campaigns    = artifacts.filter(a => a.type === 'campaign_brief');
    const documents    = artifacts.filter(a => ['positioning_doc', 'gtm_strategy'].includes(a.type));
    const channelRpts  = artifacts.filter(a => a.type === 'channel_report');

    const filteredCampaigns = campaigns.filter(a => {
        const statusOk  = filterStatus === 'all' || a.status === filterStatus;
        const channelOk = filterChannel === 'all' || (a.metadata?.channel === filterChannel);
        return statusOk && channelOk;
    });

    const calendarCampaigns = [...campaigns]
        .filter(a => a.metadata?.start_date)
        .sort((a, b) => new Date(a.metadata.start_date) - new Date(b.metadata.start_date));

    const statItems = stats ? [
        { label: 'Total',        value: stats.total,                          color: '#64748b' },
        { label: 'En revisión',  value: stats.by_status?.pending_review || 0, color: '#f59e0b' },
        { label: 'Aprobados',    value: stats.by_status?.approved || 0,       color: '#10b981' },
        { label: 'Publicados',   value: stats.by_status?.published || 0,      color: '#3b82f6' },
    ] : [];

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Stats bar */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {statItems.map(({ label, value, color }) => (
                        <div key={label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Inner tab nav */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
                {INNER_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setInnerTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '8px 16px', border: 'none', cursor: 'pointer', fontWeight: 600,
                            fontSize: '0.82rem', borderRadius: '8px 8px 0 0',
                            background: innerTab === tab.id ? '#fff' : 'transparent',
                            color: innerTab === tab.id ? 'var(--primary)' : '#64748b',
                            borderBottom: innerTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                        }}
                    >
                        <WsIcon name={tab.icon} size={13} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Campañas ───────────────────────────────────────────────── */}
            {innerTab === 'campaigns' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Filters + button */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                            className="edit-select"
                            value={filterChannel}
                            onChange={e => setFilterChannel(e.target.value)}
                        >
                            <option value="all">Todos los canales</option>
                            {CAMPAIGN_CHANNELS.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                        <select
                            className="edit-select"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="draft">Borrador</option>
                            <option value="pending_review">En revisión</option>
                            <option value="approved">Aprobado</option>
                            <option value="rejected">Rechazado</option>
                            <option value="published">Publicado</option>
                        </select>
                        <button
                            style={{
                                marginLeft: 'auto', padding: '8px 20px', borderRadius: '20px',
                                background: 'var(--primary)', color: '#fff', border: 'none',
                                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            }}
                            onClick={() => openWizard('campaign_brief')}
                        >
                            + Nueva Campaña
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando campañas...</div>
                    ) : filteredCampaigns.length === 0 ? (
                        <EmptyState
                            icon="target"
                            title="No hay campañas"
                            desc="Crea tu primer campaign brief con el wizard."
                            cta="Nueva Campaña"
                            onCta={() => openWizard('campaign_brief')}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredCampaigns.map(a => (
                                <CampaignRow
                                    key={a.id}
                                    artifact={a}
                                    onPreview={setPreviewArtifact}
                                    onStatusChange={handleStatusChange}
                                    onHandoff={handleHandoff}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Documentos ─────────────────────────────────────────────── */}
            {innerTab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                            style={{
                                padding: '8px 20px', borderRadius: '20px', background: '#f1f5f9',
                                color: '#475569', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            }}
                            onClick={() => openWizard('gtm_strategy')}
                        >
                            + GTM Strategy
                        </button>
                        <button
                            style={{
                                padding: '8px 20px', borderRadius: '20px',
                                background: 'var(--primary)', color: '#fff', border: 'none',
                                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            }}
                            onClick={() => openWizard('positioning_doc')}
                        >
                            + Nuevo Documento
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando documentos...</div>
                    ) : documents.length === 0 ? (
                        <EmptyState
                            icon="file-text"
                            title="No hay documentos estratégicos"
                            desc="Crea un ICP, propuesta de valor, battlecard o GTM Plan."
                            cta="Nuevo Documento"
                            onCta={() => openWizard('positioning_doc')}
                        />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {documents.map(a => (
                                <ArtifactCard
                                    key={a.id}
                                    artifact={a}
                                    onPreview={setPreviewArtifact}
                                    onEdit={openEdit}
                                    onStatusChange={handleStatusChange}
                                    onHandoff={handleHandoff}
                                    onPublish={handlePublish}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Canales ────────────────────────────────────────────────── */}
            {innerTab === 'channels' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            style={{
                                padding: '8px 20px', borderRadius: '20px',
                                background: 'var(--primary)', color: '#fff', border: 'none',
                                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            }}
                            onClick={() => openWizard('channel_report')}
                        >
                            + Nuevo Reporte
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando reportes...</div>
                    ) : channelRpts.length === 0 ? (
                        <EmptyState
                            icon="bar-chart"
                            title="No hay reportes de canal"
                            desc="Genera un reporte de rendimiento por canal de marketing."
                            cta="Nuevo Reporte"
                            onCta={() => openWizard('channel_report')}
                        />
                    ) : (
                        <ChannelTable reports={channelRpts} onPreview={setPreviewArtifact} onStatusChange={handleStatusChange} />
                    )}
                </div>
            )}

            {/* ── Tab: Calendario ─────────────────────────────────────────────── */}
            {innerTab === 'calendar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando calendario...</div>
                    ) : calendarCampaigns.length === 0 ? (
                        <EmptyState
                            icon="calendar"
                            title="No hay campañas con fecha"
                            desc="Las campañas con fechas inicio/fin aparecen aquí ordenadas cronológicamente."
                            cta="Nueva Campaña"
                            onCta={() => openWizard('campaign_brief')}
                        />
                    ) : (
                        <CalendarList campaigns={calendarCampaigns} onPreview={setPreviewArtifact} />
                    )}
                </div>
            )}

            {/* Preview modal */}
            {previewArtifact && (
                <ArtifactPreviewModal
                    artifact={previewArtifact}
                    onClose={() => setPreviewArtifact(null)}
                    onEdit={art => { setPreviewArtifact(null); openEdit(art); }}
                    onStatusChange={(id, status, reason) => {
                        handleStatusChange(id, status, reason);
                        setPreviewArtifact(null);
                    }}
                />
            )}

            {/* Edit modal */}
            {editArtifact && (
                <div className="modal-overlay" onClick={() => setEditArtifact(null)} style={{ zIndex: 1000 }}>
                    <div
                        className="card"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '600px', width: '90vw', margin: 'auto', marginTop: '8vh',
                            display: 'flex', flexDirection: 'column', gap: '14px',
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                            Editar artefacto
                        </h3>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                Título
                            </label>
                            <input
                                className="edit-input-inline"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                value={editForm.title}
                                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                Contenido
                            </label>
                            <textarea
                                className="edit-input-inline"
                                style={{ width: '100%', minHeight: '250px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                                value={editForm.content}
                                onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="artifact-action-btn" onClick={() => setEditArtifact(null)}>Cancelar</button>
                            <button className="artifact-action-btn approve" onClick={saveEdit}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generation Wizard */}
            {showWizard && (
                <WizardModal
                    wizardType={wizardType}
                    wizardStep={wizardStep}
                    wizard={wizard}
                    generating={generating}
                    totalSteps={wizardTotalSteps()}
                    onClose={() => setShowWizard(false)}
                    onStepBack={() => wizardStep === 1 ? setShowWizard(false) : setWizardStep(s => s - 1)}
                    onStepNext={() => setWizardStep(s => s + 1)}
                    onGenerate={handleGenerate}
                    onWizardChange={patch => setWizard(w => ({ ...w, ...patch }))}
                />
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000,
                    background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
                    color: toast.type === 'error' ? '#991b1b' : '#065f46',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
                    padding: '12px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc, cta, onCta }) {
    return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ marginBottom: '16px', color: '#cbd5e1' }}><WsIcon name={icon} size={36} /></div>
            <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1rem' }}>{title}</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>{desc}</p>
            <button
                style={{
                    padding: '8px 20px', borderRadius: '20px', background: 'var(--primary)',
                    color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer',
                }}
                onClick={onCta}
            >
                {cta}
            </button>
        </div>
    );
}

function CampaignRow({ artifact, onPreview, onStatusChange, onHandoff }) {
    const meta = artifact.metadata || {};
    const sc   = { draft: '#94a3b8', pending_review: '#f59e0b', approved: '#10b981', rejected: '#ef4444', published: '#3b82f6' };

    return (
        <div
            className="card"
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto auto auto',
                gap: '16px', alignItems: 'center',
                padding: '14px 20px', cursor: 'pointer',
            }}
            onClick={() => onPreview(artifact)}
        >
            {/* Title + channel */}
            <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginBottom: '2px' }}>
                    {artifact.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {meta.channel || '—'} {meta.start_date ? `· ${meta.start_date}` : ''}
                </div>
            </div>

            {/* Metrics */}
            <MetricCell label="Leads" value={meta.leads || '—'} color="#0f172a" />
            <MetricCell label="CPL"   value={meta.cpl   ? `$${meta.cpl}` : '—'} color="#0f172a" />
            <MetricCell label="ROI"   value={meta.roi   ? `${meta.roi}%` : '—'} color={meta.roi > 0 ? '#10b981' : '#0f172a'} />

            {/* Status badge */}
            <div style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                background: STATUS_COLORS[artifact.status]?.bg || '#f1f5f9',
                color: STATUS_COLORS[artifact.status]?.color || '#64748b',
                whiteSpace: 'nowrap',
            }}>
                {STATUS_COLORS[artifact.status]?.label || artifact.status}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                {artifact.status === 'pending_review' && (
                    <button
                        className="artifact-action-btn approve"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        onClick={() => onStatusChange(artifact.id, 'approved')}
                    >
                        Aprobar
                    </button>
                )}
                {artifact.status === 'approved' && (
                    <button
                        className="artifact-action-btn"
                        style={{ padding: '4px 10px', fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1' }}
                        onClick={() => onHandoff(artifact, 'social-media-agent', 'Crear posts para esta campaña')}
                    >
                        → Social
                    </button>
                )}
            </div>
        </div>
    );
}

function MetricCell({ label, value, color }) {
    return (
        <div style={{ textAlign: 'center', minWidth: '50px' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{value}</div>
        </div>
    );
}

function ChannelTable({ reports, onPreview, onStatusChange }) {
    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        {['Canal', 'Período', 'Visitas', 'Leads', 'Conv.%', 'CPL', 'Estado', ''].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.75rem' }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {reports.map((r, i) => {
                        const m = r.metadata || {};
                        return (
                            <tr
                                key={r.id}
                                style={{
                                    borderBottom: i < reports.length - 1 ? '1px solid #f1f5f9' : 'none',
                                    cursor: 'pointer',
                                }}
                                onClick={() => onPreview(r)}
                            >
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                                    {m.channel || r.title}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>{m.period || '—'}</td>
                                <td style={{ padding: '10px 14px', color: '#0f172a' }}>{m.visits ? m.visits.toLocaleString() : '—'}</td>
                                <td style={{ padding: '10px 14px', color: '#0f172a' }}>{m.leads || '—'}</td>
                                <td style={{ padding: '10px 14px', color: m.conversion_rate > 3 ? '#10b981' : '#0f172a' }}>
                                    {m.conversion_rate ? `${m.conversion_rate}%` : '—'}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#0f172a' }}>
                                    {m.cpl ? `$${m.cpl}` : '—'}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                                        background: STATUS_COLORS[r.status]?.bg || '#f1f5f9',
                                        color: STATUS_COLORS[r.status]?.color || '#64748b',
                                    }}>
                                        {STATUS_COLORS[r.status]?.label || r.status}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                                    {r.status === 'pending_review' && (
                                        <button
                                            className="artifact-action-btn approve"
                                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                            onClick={() => onStatusChange(r.id, 'approved')}
                                        >
                                            Aprobar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function CalendarList({ campaigns, onPreview }) {
    // Group by month
    const grouped = campaigns.reduce((acc, c) => {
        const d = new Date(c.metadata.start_date);
        const key = isNaN(d) ? 'Sin fecha' : d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        if (!acc[key]) acc[key] = [];
        acc[key].push(c);
        return acc;
    }, {});

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(grouped).map(([month, items]) => (
                <div key={month}>
                    <div style={{
                        fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8',
                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
                    }}>
                        {month}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map(c => {
                            const m = c.metadata || {};
                            const sc = STATUS_COLORS[c.status] || STATUS_COLORS.draft;
                            return (
                                <div
                                    key={c.id}
                                    className="card"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        padding: '12px 16px', cursor: 'pointer',
                                    }}
                                    onClick={() => onPreview(c)}
                                >
                                    {/* Date indicator */}
                                    <div style={{
                                        minWidth: '44px', textAlign: 'center',
                                        background: '#f8fafc', borderRadius: '8px', padding: '6px 4px',
                                    }}>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                                            {new Date(m.start_date).getDate() || '—'}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>
                                            {m.end_date ? '→ ' + new Date(m.end_date).getDate() : ''}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>{c.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                            {m.channel || '—'} {m.audience ? `· ${m.audience}` : ''}
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                                        background: sc.bg, color: sc.color,
                                    }}>
                                        {sc.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function WizardModal({ wizardType, wizardStep, wizard, generating, totalSteps, onClose, onStepBack, onStepNext, onGenerate, onWizardChange }) {
    const typeInfo = MARKETING_TYPES.find(t => t.value === wizardType) || MARKETING_TYPES[0];

    const canNext = () => {
        if (wizardType === 'campaign_brief' && wizardStep === 1) return wizard.channel && wizard.audience.trim();
        if (wizardType === 'positioning_doc' && wizardStep === 1) return wizard.context.trim();
        if (wizardType === 'channel_report' && wizardStep === 1) return wizard.report_channel && wizard.period;
        return true;
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div
                className="card"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '540px', width: '90vw', margin: 'auto', marginTop: '6vh',
                    display: 'flex', flexDirection: 'column', gap: '20px',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <WsIcon name={typeInfo.icon} size={15} />
                            {typeInfo.label}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            Paso {wizardStep} de {totalSteps}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div key={i} style={{
                            flex: 1, height: '4px', borderRadius: '4px',
                            background: i < wizardStep ? 'var(--primary)' : '#e5e7eb',
                            transition: 'background 0.2s',
                        }} />
                    ))}
                </div>

                {/* ── campaign_brief steps ── */}
                {wizardType === 'campaign_brief' && wizardStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Canal y audiencia</h4>
                        <div>
                            <label style={labelStyle}>Canal de marketing</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {CAMPAIGN_CHANNELS.map(c => (
                                    <button
                                        key={c.id}
                                        className={`wizard-option-pill ${wizard.channel === c.id ? 'selected' : ''}`}
                                        onClick={() => onWizardChange({ channel: c.id })}
                                    >
                                        <WsIcon name={c.icon} size={12} style={{marginRight:4}} />
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Público objetivo</label>
                            <input
                                className="edit-input-inline"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                placeholder="Ej: Inversores hispanohablantes de España, 35-55 años..."
                                value={wizard.audience}
                                onChange={e => onWizardChange({ audience: e.target.value })}
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {wizardType === 'campaign_brief' && wizardStep === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Presupuesto y fechas</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Fecha de inicio</label>
                                <input type="date" className="edit-input-inline" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={wizard.start_date} onChange={e => onWizardChange({ start_date: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Fecha de fin</label>
                                <input type="date" className="edit-input-inline" style={{ width: '100%', boxSizing: 'border-box' }}
                                    value={wizard.end_date} onChange={e => onWizardChange({ end_date: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Presupuesto (USD)</label>
                                <input type="number" className="edit-input-inline" style={{ width: '100%', boxSizing: 'border-box' }}
                                    placeholder="5000" value={wizard.budget} onChange={e => onWizardChange({ budget: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Objetivo de leads</label>
                                <input type="number" className="edit-input-inline" style={{ width: '100%', boxSizing: 'border-box' }}
                                    placeholder="50" value={wizard.lead_goal} onChange={e => onWizardChange({ lead_goal: e.target.value })} />
                            </div>
                        </div>
                    </div>
                )}

                {wizardType === 'campaign_brief' && wizardStep === 3 && (
                    <WizardSummary rows={[
                        { label: 'Canal',    value: wizard.channel },
                        { label: 'Audiencia', value: wizard.audience || '(no especificado)' },
                        { label: 'Fechas',   value: `${wizard.start_date || '—'} → ${wizard.end_date || '—'}` },
                        { label: 'Presupuesto', value: wizard.budget ? `$${wizard.budget}` : '—' },
                        { label: 'Objetivo leads', value: wizard.lead_goal || '—' },
                    ]} />
                )}

                {/* ── positioning_doc steps ── */}
                {wizardType === 'positioning_doc' && wizardStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Tipo de documento</h4>
                        {DOC_SUBTYPES.map(dt => (
                            <div
                                key={dt.value}
                                className={`wizard-step-card ${wizard.subtype === dt.value ? 'selected' : ''}`}
                                onClick={() => onWizardChange({ subtype: dt.value })}
                            >
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{dt.label}</div>
                            </div>
                        ))}
                        <div>
                            <label style={labelStyle}>Contexto / instrucciones adicionales</label>
                            <textarea
                                className="edit-input-inline"
                                style={{ width: '100%', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
                                placeholder="Enfoque, datos específicos de Emiralia que debe incluir..."
                                value={wizard.context}
                                onChange={e => onWizardChange({ context: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {wizardType === 'positioning_doc' && wizardStep === 2 && (
                    <WizardSummary rows={[
                        { label: 'Tipo',     value: DOC_SUBTYPES.find(d => d.value === wizard.subtype)?.label || wizard.subtype },
                        { label: 'Contexto', value: wizard.context || '(no especificado)' },
                    ]} />
                )}

                {/* ── channel_report steps ── */}
                {wizardType === 'channel_report' && wizardStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Canal y período</h4>
                        <div>
                            <label style={labelStyle}>Canal</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {CAMPAIGN_CHANNELS.map(c => (
                                    <button
                                        key={c.id}
                                        className={`wizard-option-pill ${wizard.report_channel === c.id ? 'selected' : ''}`}
                                        onClick={() => onWizardChange({ report_channel: c.id })}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Período</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {REPORT_PERIODS.map(p => (
                                    <button
                                        key={p.id}
                                        className={`wizard-option-pill ${wizard.period === p.id ? 'selected' : ''}`}
                                        onClick={() => onWizardChange({ period: p.id })}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Métricas conocidas (opcional)</label>
                            <input
                                className="edit-input-inline"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                placeholder="Ej: 1200 visitas, 45 leads, CPL $30..."
                                value={wizard.known_metrics}
                                onChange={e => onWizardChange({ known_metrics: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {wizardType === 'channel_report' && wizardStep === 2 && (
                    <WizardSummary rows={[
                        { label: 'Canal',   value: CAMPAIGN_CHANNELS.find(c => c.id === wizard.report_channel)?.label || wizard.report_channel },
                        { label: 'Período', value: REPORT_PERIODS.find(p => p.id === wizard.period)?.label || wizard.period },
                        { label: 'Métricas', value: wizard.known_metrics || '(no especificado)' },
                    ]} />
                )}

                {/* ── gtm_strategy steps ── */}
                {wizardType === 'gtm_strategy' && wizardStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>Trimestre y fase</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Trimestre</label>
                                <input className="edit-input-inline" style={{ width: '100%', boxSizing: 'border-box' }}
                                    placeholder="Q2 2026" value={wizard.quarter}
                                    onChange={e => onWizardChange({ quarter: e.target.value })} />
                            </div>
                            <div>
                                <label style={labelStyle}>Fase del proyecto</label>
                                <select className="edit-select" style={{ width: '100%' }}
                                    value={wizard.phase} onChange={e => onWizardChange({ phase: e.target.value })}>
                                    <option value="Phase 0">Phase 0 — Setup</option>
                                    <option value="Phase 1">Phase 1 — B2B Launch</option>
                                    <option value="Phase 2">Phase 2 — Scale</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {wizardType === 'gtm_strategy' && wizardStep === 2 && (
                    <WizardSummary rows={[
                        { label: 'Trimestre', value: wizard.quarter },
                        { label: 'Fase',      value: wizard.phase },
                    ]} />
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <button className="artifact-action-btn" onClick={onStepBack}>
                        {wizardStep === 1 ? 'Cancelar' : 'Atrás'}
                    </button>
                    {wizardStep < totalSteps ? (
                        <button
                            style={{
                                padding: '8px 24px', borderRadius: '20px',
                                background: canNext() ? 'var(--primary)' : '#e5e7eb',
                                color: canNext() ? '#fff' : '#94a3b8',
                                border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: canNext() ? 'pointer' : 'not-allowed',
                            }}
                            onClick={onStepNext}
                            disabled={!canNext()}
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            style={{
                                padding: '8px 24px', borderRadius: '20px',
                                background: generating ? '#94a3b8' : 'var(--primary)',
                                color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem',
                                cursor: generating ? 'not-allowed' : 'pointer',
                            }}
                            onClick={onGenerate}
                            disabled={generating}
                        >
                            {generating ? 'Generando...' : 'Generar'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function WizardSummary({ rows }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                Resumen
            </h4>
            {rows.map(({ label, value }) => (
                <div key={label} style={{
                    display: 'flex', gap: '10px',
                    padding: '8px 12px', background: '#f8fafc', borderRadius: '8px',
                }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', minWidth: '90px' }}>{label}</span>
                    <span style={{ fontSize: '0.85rem', color: '#0f172a' }}>{value}</span>
                </div>
            ))}
        </div>
    );
}

const labelStyle = {
    fontSize: '0.75rem', fontWeight: 700, color: '#64748b',
    display: 'block', marginBottom: '6px',
};
