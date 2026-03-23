import { useState, useEffect } from 'react';
import { API_URL } from '../../api.js';
import WsIcon from './WsIcon.jsx';
import ArtifactCard from './ArtifactCard.jsx';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import {
    SEO_TYPES, KEYWORD_INTENTS, AUDIT_SEVERITIES, SCHEMA_TYPES,
} from './artifactConstants.js';

const ACCENT = '#f59e0b';         // amber-500
const ACCENT_DARK = '#92400e';    // amber-900 (text on light bg)
const ACCENT_BG = '#fffbeb';      // amber-50

const TABS = [
    { id: 'keywords',        label: 'Keyword Matrix'  },
    { id: 'audit',           label: 'Site Audit'      },
    { id: 'meta',            label: 'Meta Tags'       },
    { id: 'structured_data', label: '{} Structured Data' },
    { id: 'ranking',         label: 'Ranking Tracker' },
];

const STATUS_OPTS = [
    { value: 'all',            label: 'Todos los estados' },
    { value: 'draft',          label: 'Borrador'          },
    { value: 'pending_review', label: 'En revisión'       },
    { value: 'approved',       label: 'Aprobado'          },
    { value: 'rejected',       label: 'Rechazado'         },
    { value: 'published',      label: 'Publicado'         },
];

const EMPTY_STATES = {
    keywords:        { icon: 'key',    title: 'Sin keywords todavía',        desc: 'Añade keywords para construir tu matriz SEO.' },
    audit:           { icon: 'search', title: 'Sin auditorías',              desc: 'Lanza un audit de página para detectar issues.' },
    meta:            { icon: 'tag',    title: 'Sin meta tags gestionados',   desc: 'Añade meta tags para controlar el SEO on-page.' },
    structured_data: { icon: '{}',    title: 'Sin structured data',         desc: 'Genera schemas para mejorar el SEO estructurado.' },
};

export default function SeoWorkspace({ agentId }) {
    const [activeTab, setActiveTab]             = useState('keywords');
    const [artifacts, setArtifacts]             = useState([]);
    const [stats, setStats]                     = useState(null);
    const [loading, setLoading]                 = useState(true);
    const [statusFilter, setStatusFilter]       = useState('all');
    const [intentFilter, setIntentFilter]       = useState('all');
    const [schemaFilter, setSchemaFilter]       = useState('all');
    const [previewArtifact, setPreviewArtifact] = useState(null);
    const [editArtifact, setEditArtifact]       = useState(null);
    const [editForm, setEditForm]               = useState({ title: '', content: '' });
    const [showWizard, setShowWizard]           = useState(false);
    const [wizardStep, setWizardStep]           = useState(1);
    const [wizard, setWizard]                   = useState({
        type: 'keyword', keyword: '', volume: '', difficulty: '',
        intent: 'informational', page: '', schema_type: 'property', notes: '',
    });
    const [generating, setGenerating]           = useState(false);
    const [toast, setToast]                     = useState(null);

    useEffect(() => {
        fetchArtifacts();
        fetchStats();
    }, [agentId, activeTab, statusFilter, intentFilter, schemaFilter]);

    function tabTypes() {
        if (activeTab === 'keywords')        return ['keyword'];
        if (activeTab === 'audit')           return ['seo_audit'];
        if (activeTab === 'meta')            return ['meta_tag'];
        if (activeTab === 'structured_data') return ['structured_data'];
        return null; // ranking: placeholder, no fetch
    }

    async function fetchArtifacts() {
        if (activeTab === 'ranking') { setLoading(false); return; }
        setLoading(true);
        try {
            const types = tabTypes();
            const fetches = (types || []).map(type => {
                const params = new URLSearchParams({ agent_id: agentId, type, limit: '50' });
                if (statusFilter !== 'all') params.append('status', statusFilter);
                return fetch(`${API_URL}/artifacts?${params}`).then(r => r.json());
            });
            let all = (await Promise.all(fetches)).flat();
            // Client-side secondary filters
            if (activeTab === 'keywords' && intentFilter !== 'all') {
                all = all.filter(a => a.metadata?.intent === intentFilter);
            }
            if (activeTab === 'structured_data' && schemaFilter !== 'all') {
                all = all.filter(a => a.metadata?.schema_type === schemaFilter);
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

    async function handleGenerate() {
        setGenerating(true);
        try {
            const titleKey = wizard.keyword || wizard.page || wizard.type;
            const res = await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: wizard.type,
                    title: `[Generando] ${titleKey}`,
                    content: '',
                    metadata: { ...wizard },
                }),
            });
            const draft = await res.json();

            const prompt = wizard.type === 'keyword'
                ? `/generar tipo:keyword keyword:"${wizard.keyword}" volumen:${wizard.volume} dificultad:${wizard.difficulty} intencion:${wizard.intent} artifact_id:${draft.id}`
                : wizard.type === 'seo_audit'
                ? `/generar tipo:seo_audit pagina:"${wizard.page}" notas:"${wizard.notes}" artifact_id:${draft.id}`
                : wizard.type === 'meta_tag'
                ? `/generar tipo:meta_tag pagina:"${wizard.page}" notas:"${wizard.notes}" artifact_id:${draft.id}`
                : `/generar tipo:structured_data pagina:"${wizard.page}" esquema:${wizard.schema_type} artifact_id:${draft.id}`;

            fetch(`${API_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, userId: 'workspace-wizard' }),
            }).catch(() => {});

            setShowWizard(false);
            setWizardStep(1);
            setWizard({
                type: 'keyword', keyword: '', volume: '', difficulty: '',
                intent: 'informational', page: '', schema_type: 'property', notes: '',
            });
            showToast('Generación iniciada. El artefacto aparecerá en borrador.');

            if (wizard.type === 'keyword')         setActiveTab('keywords');
            else if (wizard.type === 'seo_audit')  setActiveTab('audit');
            else if (wizard.type === 'meta_tag')   setActiveTab('meta');
            else                                   setActiveTab('structured_data');

            setTimeout(fetchArtifacts, 2000);
        } catch {
            showToast('Error al iniciar generación', 'error');
        } finally {
            setGenerating(false);
        }
    }

    // ─── Derived stats ──────────────────────────────────────────────────────────

    const seoStats = stats ? {
        keyword:         stats.by_type?.keyword || 0,
        seo_audit:       stats.by_type?.seo_audit || 0,
        meta_tag:        stats.by_type?.meta_tag || 0,
        structured_data: stats.by_type?.structured_data || 0,
        total:           (stats.by_type?.keyword || 0) +
                         (stats.by_type?.seo_audit || 0) +
                         (stats.by_type?.meta_tag || 0) +
                         (stats.by_type?.structured_data || 0),
        pending_review:  stats.by_status?.pending_review || 0,
        approved:        stats.by_status?.approved || 0,
        published:       stats.by_status?.published || 0,
    } : null;

    // ─── Render helpers ─────────────────────────────────────────────────────────

    function EmptyState({ tab }) {
        const m = EMPTY_STATES[tab] || EMPTY_STATES.keywords;
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ marginBottom: '12px', color: '#94a3b8' }}><WsIcon name={m.icon} size={40} /></div>
                <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1rem' }}>{m.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>{m.desc}</p>
                <button
                    style={{
                        padding: '8px 20px', borderRadius: '20px', background: ACCENT,
                        color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer',
                    }}
                    onClick={() => { setShowWizard(true); setWizardStep(1); }}
                >
                    + Nueva acción SEO
                </button>
            </div>
        );
    }

    function renderArtifactGrid(tab) {
        if (loading) {
            return <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando...</div>;
        }
        if (artifacts.length === 0) {
            return <EmptyState tab={tab} />;
        }
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {artifacts.map(a => (
                    <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <ArtifactCard
                            artifact={a}
                            onPreview={setPreviewArtifact}
                            onEdit={openEdit}
                            onStatusChange={handleStatusChange}
                            onHandoff={handleHandoff}
                            onPublish={handlePublish}
                        />
                        {/* Gap → Content Agent banner for keywords without content */}
                        {a.type === 'keyword' && a.metadata?.has_content === false && (
                            <div style={{
                                padding: '7px 12px', borderRadius: '8px',
                                background: ACCENT_BG, border: `1px solid ${ACCENT}`,
                                display: 'flex', alignItems: 'center', gap: '8px',
                                fontSize: '0.78rem', color: ACCENT_DARK, fontWeight: 600,
                            }}>
                                <span style={{ flex: 1 }}>⚠ Keyword sin contenido (Gap)</span>
                                <button
                                    style={{
                                        padding: '3px 12px', borderRadius: '12px', border: 'none',
                                        background: ACCENT, color: '#fff', fontWeight: 700,
                                        fontSize: '0.75rem', cursor: 'pointer',
                                    }}
                                    onClick={() => handleHandoff(
                                        a, 'content-agent',
                                        `Crear brief para keyword: "${a.title}"`
                                    )}
                                >
                                    → Content Agent
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // ─── Main render ────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Stats bar */}
            {seoStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                        { label: 'Total',       value: seoStats.total,          color: '#64748b' },
                        { label: 'En revisión', value: seoStats.pending_review, color: ACCENT    },
                        { label: 'Aprobados',   value: seoStats.approved,       color: '#10b981' },
                        { label: 'Publicados',  value: seoStats.published,      color: '#3b82f6' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Internal tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setStatusFilter('all');
                            setIntentFilter('all');
                            setSchemaFilter('all');
                        }}
                        style={{
                            padding: '8px 16px', border: 'none', cursor: 'pointer',
                            fontSize: '0.82rem', fontWeight: 600, borderRadius: '8px 8px 0 0',
                            background: activeTab === tab.id ? ACCENT : 'transparent',
                            color: activeTab === tab.id ? '#fff' : '#64748b',
                            borderBottom: activeTab === tab.id ? `2px solid ${ACCENT}` : '2px solid transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}

                {/* Generate button */}
                <button
                    style={{
                        marginLeft: 'auto', padding: '6px 16px', borderRadius: '20px',
                        background: ACCENT, color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    }}
                    onClick={() => { setShowWizard(true); setWizardStep(1); }}
                >
                    + Nueva acción
                </button>
            </div>

            {/* Tab: Keyword Matrix */}
            {activeTab === 'keywords' && (
                <>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Intent filter chips */}
                        {[{ id: 'all', label: 'Todas las intenciones' }, ...KEYWORD_INTENTS].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setIntentFilter(opt.id)}
                                style={{
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem',
                                    fontWeight: 600, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                                    background: intentFilter === opt.id ? ACCENT : ACCENT_BG,
                                    color: intentFilter === opt.id ? '#fff' : ACCENT_DARK,
                                    borderColor: intentFilter === opt.id ? ACCENT : '#fde68a',
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <select
                            className="edit-select"
                            style={{ marginLeft: 'auto', minWidth: '150px' }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {renderArtifactGrid('keywords')}
                </>
            )}

            {/* Tab: Site Audit */}
            {activeTab === 'audit' && (
                <>
                    <div style={{
                        padding: '10px 16px', borderRadius: '10px',
                        background: '#fef2f2', border: '1px solid #fecaca',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.82rem', color: '#991b1b', fontWeight: 600,
                    }}>
                        Los issues detectados en el audit pueden escalarse directamente al Dev Agent o generar un brief para el Content Agent.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {AUDIT_SEVERITIES.map(s => (
                            <span key={s.id} style={{
                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem',
                                fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.color}20`,
                            }}>
                                {s.label}
                            </span>
                        ))}
                        <select
                            className="edit-select"
                            style={{ marginLeft: 'auto', minWidth: '150px' }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {renderArtifactGrid('audit')}
                </>
            )}

            {/* Tab: Meta Tags */}
            {activeTab === 'meta' && (
                <>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            Gestiona title, description y OG tags por página. Aplica cambios directamente al site.
                        </span>
                        <select
                            className="edit-select"
                            style={{ marginLeft: 'auto', minWidth: '150px' }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {renderArtifactGrid('meta')}
                </>
            )}

            {/* Tab: Structured Data */}
            {activeTab === 'structured_data' && (
                <>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {[{ id: 'all', label: 'Todos los schemas' }, ...SCHEMA_TYPES].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setSchemaFilter(opt.id)}
                                style={{
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem',
                                    fontWeight: 600, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                                    background: schemaFilter === opt.id ? ACCENT : ACCENT_BG,
                                    color: schemaFilter === opt.id ? '#fff' : ACCENT_DARK,
                                    borderColor: schemaFilter === opt.id ? ACCENT : '#fde68a',
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <select
                            className="edit-select"
                            style={{ marginLeft: 'auto', minWidth: '150px' }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {renderArtifactGrid('structured_data')}
                </>
            )}

            {/* Tab: Ranking Tracker (placeholder) */}
            {activeTab === 'ranking' && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ marginBottom: '12px', opacity: 0.4 }}><WsIcon name="trending-up" size={32} /></div>
                    <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1rem' }}>
                        Ranking Tracker
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        Próximamente — seguimiento de posiciones en Google por keyword en el tiempo.
                    </p>
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
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Editar artefacto</h3>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Título</label>
                            <input
                                className="edit-input-inline"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                                value={editForm.title}
                                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Contenido</label>
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
                <div className="modal-overlay" onClick={() => setShowWizard(false)} style={{ zIndex: 1000 }}>
                    <div
                        className="card"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '520px', width: '90vw', margin: 'auto', marginTop: '6vh',
                            display: 'flex', flexDirection: 'column', gap: '20px',
                        }}
                    >
                        {/* Wizard header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                    Nueva acción SEO
                                </h3>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                    Paso {wizardStep} de 3
                                </div>
                            </div>
                            <button
                                onClick={() => setShowWizard(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3].map(n => (
                                <div key={n} style={{
                                    flex: 1, height: '4px', borderRadius: '4px',
                                    background: n <= wizardStep ? ACCENT : '#e5e7eb',
                                    transition: 'background 0.2s',
                                }} />
                            ))}
                        </div>

                        {/* Step 1: Tipo */}
                        {wizardStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    ¿Qué tipo de artefacto SEO?
                                </h4>
                                {SEO_TYPES.map(st => (
                                    <div
                                        key={st.id}
                                        className={`wizard-step-card ${wizard.type === st.id ? 'selected' : ''}`}
                                        onClick={() => setWizard(w => ({ ...w, type: st.id }))}
                                        style={{ borderColor: wizard.type === st.id ? ACCENT : undefined }}
                                    >
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '1.2rem' }}>{st.icon}</span>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{st.label}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{st.desc}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Step 2: Detalles por tipo */}
                        {wizardStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    Detalles de la acción
                                </h4>

                                {/* Keyword */}
                                {wizard.type === 'keyword' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Keyword *</label>
                                            <input
                                                className="edit-input-inline"
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                                placeholder="Ej: comprar piso en Dubai"
                                                value={wizard.keyword}
                                                onChange={e => setWizard(w => ({ ...w, keyword: e.target.value }))}
                                                autoFocus
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Vol. mensual est.</label>
                                                <input
                                                    className="edit-input-inline"
                                                    type="number"
                                                    placeholder="Ej: 1200"
                                                    value={wizard.volume}
                                                    onChange={e => setWizard(w => ({ ...w, volume: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Dificultad (0-100)</label>
                                                <input
                                                    className="edit-input-inline"
                                                    type="number"
                                                    min="0" max="100"
                                                    placeholder="Ej: 45"
                                                    value={wizard.difficulty}
                                                    onChange={e => setWizard(w => ({ ...w, difficulty: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Intención de búsqueda</label>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {KEYWORD_INTENTS.map(ki => (
                                                    <button
                                                        key={ki.id}
                                                        className={`wizard-option-pill ${wizard.intent === ki.id ? 'selected' : ''}`}
                                                        onClick={() => setWizard(w => ({ ...w, intent: ki.id }))}
                                                        style={{
                                                            background: wizard.intent === ki.id ? ACCENT : undefined,
                                                            borderColor: wizard.intent === ki.id ? ACCENT : undefined,
                                                        }}
                                                    >
                                                        {ki.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* SEO Audit */}
                                {wizard.type === 'seo_audit' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>URL o path a auditar *</label>
                                            <input
                                                className="edit-input-inline"
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                                placeholder="Ej: /blog/invertir-dubai o https://emiralia.com"
                                                value={wizard.page}
                                                onChange={e => setWizard(w => ({ ...w, page: e.target.value }))}
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Notas o contexto <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                            <textarea
                                                className="edit-input-inline"
                                                style={{ minHeight: '70px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                                placeholder="Ej: página con bajo CTR, revisar title y meta description"
                                                value={wizard.notes}
                                                onChange={e => setWizard(w => ({ ...w, notes: e.target.value }))}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Meta Tag */}
                                {wizard.type === 'meta_tag' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>URL de la página *</label>
                                            <input
                                                className="edit-input-inline"
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                                placeholder="Ej: /propiedades/marina-bay-residences"
                                                value={wizard.page}
                                                onChange={e => setWizard(w => ({ ...w, page: e.target.value }))}
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Instrucciones o metas actuales <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                            <textarea
                                                className="edit-input-inline"
                                                style={{ minHeight: '70px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                                placeholder="Pega aquí los meta tags actuales o indica el objetivo..."
                                                value={wizard.notes}
                                                onChange={e => setWizard(w => ({ ...w, notes: e.target.value }))}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Structured Data */}
                                {wizard.type === 'structured_data' && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>URL de la página *</label>
                                            <input
                                                className="edit-input-inline"
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                                placeholder="Ej: /blog/guia-inversion-dubai"
                                                value={wizard.page}
                                                onChange={e => setWizard(w => ({ ...w, page: e.target.value }))}
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>Tipo de schema</label>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {SCHEMA_TYPES.map(sc => (
                                                    <button
                                                        key={sc.id}
                                                        className={`wizard-option-pill ${wizard.schema_type === sc.id ? 'selected' : ''}`}
                                                        onClick={() => setWizard(w => ({ ...w, schema_type: sc.id }))}
                                                        style={{
                                                            background: wizard.schema_type === sc.id ? ACCENT : undefined,
                                                            borderColor: wizard.schema_type === sc.id ? ACCENT : undefined,
                                                        }}
                                                    >
                                                        {sc.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Step 3: Resumen */}
                        {wizardStep === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    Resumen de generación
                                </h4>
                                {[
                                    { label: 'Tipo',     value: SEO_TYPES.find(t => t.id === wizard.type)?.label },
                                    wizard.type === 'keyword' && { label: 'Keyword',   value: wizard.keyword || '(no especificada)' },
                                    wizard.type === 'keyword' && { label: 'Volumen',   value: wizard.volume || '(no especificado)' },
                                    wizard.type === 'keyword' && { label: 'Dificultad', value: wizard.difficulty || '(no especificada)' },
                                    wizard.type === 'keyword' && { label: 'Intención',  value: KEYWORD_INTENTS.find(i => i.id === wizard.intent)?.label },
                                    (wizard.type !== 'keyword') && { label: 'Página',   value: wizard.page || '(no especificada)' },
                                    wizard.type === 'structured_data' && { label: 'Schema', value: SCHEMA_TYPES.find(s => s.id === wizard.schema_type)?.label },
                                    (wizard.notes) && { label: 'Notas', value: wizard.notes },
                                ].filter(Boolean).map(({ label, value }) => (
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

                        {/* Wizard navigation */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', paddingTop: '4px' }}>
                            <button
                                className="artifact-action-btn"
                                onClick={() => wizardStep === 1 ? setShowWizard(false) : setWizardStep(s => s - 1)}
                            >
                                {wizardStep === 1 ? 'Cancelar' : 'Atrás'}
                            </button>
                            {wizardStep < 3 ? (
                                <button
                                    style={{
                                        padding: '8px 24px', borderRadius: '20px',
                                        background: ACCENT, color: '#fff', border: 'none',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                    onClick={() => setWizardStep(s => s + 1)}
                                    disabled={
                                        (wizardStep === 2 && wizard.type === 'keyword' && !wizard.keyword.trim()) ||
                                        (wizardStep === 2 && wizard.type !== 'keyword' && !wizard.page.trim())
                                    }
                                >
                                    Siguiente
                                </button>
                            ) : (
                                <button
                                    style={{
                                        padding: '8px 24px', borderRadius: '20px',
                                        background: generating ? '#94a3b8' : ACCENT,
                                        color: '#fff', border: 'none',
                                        fontWeight: 700, fontSize: '0.85rem',
                                        cursor: generating ? 'not-allowed' : 'pointer',
                                    }}
                                    onClick={handleGenerate}
                                    disabled={generating}
                                >
                                    {generating ? 'Generando...' : 'Generar'}
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
                    background: toast.type === 'error' ? '#fef2f2' : ACCENT_BG,
                    color: toast.type === 'error' ? '#991b1b' : ACCENT_DARK,
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#fde68a'}`,
                    padding: '12px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
