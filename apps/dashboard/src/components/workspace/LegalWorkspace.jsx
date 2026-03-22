import { useState, useEffect } from 'react';
import { API_URL } from '../../api.js';
import ArtifactCard from './ArtifactCard.jsx';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import { LEGAL_TYPES, LEGAL_CATEGORIES, LANGUAGES } from './artifactConstants.js';

const TABS = [
    { id: 'faq',     label: '⚖️ FAQ Bank' },
    { id: 'guides',  label: '📘 Guías Legales' },
    { id: 'alerts',  label: '🚨 Alertas' },
    { id: 'metrics', label: '📊 Métricas' },
];

const STATUS_OPTS = [
    { value: 'all',            label: 'Todos los estados' },
    { value: 'draft',          label: 'Borrador' },
    { value: 'pending_review', label: 'En revisión' },
    { value: 'approved',       label: 'Aprobado' },
    { value: 'rejected',       label: 'Rechazado' },
    { value: 'published',      label: 'Publicado' },
];

export default function LegalWorkspace({ agentId, agent }) {
    const [activeTab, setActiveTab]           = useState('faq');
    const [artifacts, setArtifacts]           = useState([]);
    const [stats, setStats]                   = useState(null);
    const [loading, setLoading]               = useState(true);
    const [statusFilter, setStatusFilter]     = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [previewArtifact, setPreviewArtifact] = useState(null);
    const [editArtifact, setEditArtifact]     = useState(null);
    const [editForm, setEditForm]             = useState({ title: '', content: '' });
    const [showWizard, setShowWizard]         = useState(false);
    const [wizardStep, setWizardStep]         = useState(1);
    const [wizard, setWizard]                 = useState({
        type: 'faq_entry', topic: '', category: 'RERA', lang: 'es-ES', source: '',
    });
    const [generating, setGenerating]         = useState(false);
    const [toast, setToast]                   = useState(null);

    useEffect(() => {
        fetchArtifacts();
        fetchStats();
    }, [agentId, activeTab, statusFilter, categoryFilter]);

    // Determine which artifact types to fetch based on active tab
    function tabTypes() {
        if (activeTab === 'faq')     return ['faq_entry'];
        if (activeTab === 'guides')  return ['legal_guide', 'investor_brief'];
        if (activeTab === 'alerts')  return ['regulatory_alert'];
        return null; // metrics: no fetch needed
    }

    async function fetchArtifacts() {
        if (activeTab === 'metrics') { setLoading(false); return; }
        setLoading(true);
        try {
            const types = tabTypes();
            const fetches = (types || []).map(type => {
                const params = new URLSearchParams({ agent_id: agentId, type, limit: '50' });
                if (statusFilter !== 'all') params.append('status', statusFilter);
                return fetch(`${API_URL}/artifacts?${params}`).then(r => r.json());
            });
            const results = await Promise.all(fetches);
            let all = results.flat();
            // Client-side category filter (stored in metadata.category)
            if (categoryFilter !== 'all') {
                all = all.filter(a => a.metadata?.category === categoryFilter);
            }
            // Sort by created_at desc
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
            const res = await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: wizard.type,
                    title: `[Generando] ${wizard.topic || wizard.type}`,
                    content: '',
                    metadata: {
                        category: wizard.category,
                        lang: wizard.lang,
                        source: wizard.source,
                        topic: wizard.topic,
                    },
                }),
            });
            const draft = await res.json();

            const prompt = `/generar tipo:${wizard.type} tema:"${wizard.topic}" categoria:${wizard.category} idioma:${wizard.lang} fuente:"${wizard.source}" artifact_id:${draft.id}`;
            fetch(`${API_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, userId: 'workspace-wizard' }),
            }).catch(() => {});

            setShowWizard(false);
            setWizardStep(1);
            setWizard({ type: 'faq_entry', topic: '', category: 'RERA', lang: 'es-ES', source: '' });
            showToast('Generación iniciada. El artefacto aparecerá en borrador.');
            // Switch to correct tab for the new artifact type
            if (wizard.type === 'faq_entry') setActiveTab('faq');
            else if (wizard.type === 'regulatory_alert') setActiveTab('alerts');
            else setActiveTab('guides');
            setTimeout(fetchArtifacts, 2000);
        } catch {
            showToast('Error al iniciar generación', 'error');
        } finally {
            setGenerating(false);
        }
    }

    // ─── Derived stats for Metrics tab ─────────────────────────────────────────

    const legalStats = stats ? {
        faq_entry:        stats.by_type?.faq_entry || 0,
        legal_guide:      stats.by_type?.legal_guide || 0,
        investor_brief:   stats.by_type?.investor_brief || 0,
        regulatory_alert: stats.by_type?.regulatory_alert || 0,
        total:            (stats.by_type?.faq_entry || 0) +
                          (stats.by_type?.legal_guide || 0) +
                          (stats.by_type?.investor_brief || 0) +
                          (stats.by_type?.regulatory_alert || 0),
        pending_review:   stats.by_status?.pending_review || 0,
        approved:         stats.by_status?.approved || 0,
        published:        stats.by_status?.published || 0,
    } : null;

    // ─── Render helpers ─────────────────────────────────────────────────────────

    function EmptyState({ tab }) {
        const msgs = {
            faq:    { icon: '⚖️', title: 'No hay FAQs todavía', desc: 'Genera la primera entrada FAQ sobre regulación EAU.' },
            guides: { icon: '📘', title: 'Sin guías legales', desc: 'Genera una guía legal o brief para inversores.' },
            alerts: { icon: '🚨', title: 'Sin alertas regulatorias', desc: 'Las alertas del Research Agent aparecerán aquí.' },
        };
        const m = msgs[tab] || msgs.faq;
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{m.icon}</div>
                <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1rem' }}>{m.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>{m.desc}</p>
                <button
                    style={{
                        padding: '8px 20px', borderRadius: '20px', background: '#7c3aed',
                        color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer',
                    }}
                    onClick={() => { setShowWizard(true); setWizardStep(1); }}
                >
                    + Nueva entrada
                </button>
            </div>
        );
    }

    // ─── Main render ────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Stats bar */}
            {legalStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                        { label: 'Total',       value: legalStats.total,          color: '#64748b' },
                        { label: 'En revisión', value: legalStats.pending_review, color: '#f59e0b' },
                        { label: 'Aprobados',   value: legalStats.approved,       color: '#10b981' },
                        { label: 'Publicados',  value: legalStats.published,      color: '#7c3aed' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Internal tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setCategoryFilter('all'); setStatusFilter('all'); }}
                        style={{
                            padding: '8px 16px', border: 'none', cursor: 'pointer',
                            fontSize: '0.82rem', fontWeight: 600, borderRadius: '8px 8px 0 0',
                            background: activeTab === tab.id ? '#7c3aed' : 'transparent',
                            color: activeTab === tab.id ? '#fff' : '#64748b',
                            borderBottom: activeTab === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        {tab.label}
                        {tab.id === 'alerts' && legalStats?.regulatory_alert > 0 && (
                            <span style={{
                                marginLeft: '6px', background: '#ef4444', color: '#fff',
                                borderRadius: '10px', padding: '0 5px', fontSize: '0.68rem', fontWeight: 800,
                            }}>
                                {legalStats.regulatory_alert}
                            </span>
                        )}
                    </button>
                ))}

                {/* Generate button */}
                <button
                    style={{
                        marginLeft: 'auto', padding: '6px 16px', borderRadius: '20px',
                        background: '#7c3aed', color: '#fff', border: 'none',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    }}
                    onClick={() => { setShowWizard(true); setWizardStep(1); }}
                >
                    + Nueva entrada
                </button>
            </div>

            {/* Tab: FAQ Bank */}
            {activeTab === 'faq' && (
                <>
                    {/* Category chips */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {['all', ...LEGAL_CATEGORIES].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                style={{
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem',
                                    fontWeight: 600, border: '1px solid',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    background: categoryFilter === cat ? '#7c3aed' : '#f5f3ff',
                                    color: categoryFilter === cat ? '#fff' : '#7c3aed',
                                    borderColor: categoryFilter === cat ? '#7c3aed' : '#ddd6fe',
                                }}
                            >
                                {cat === 'all' ? 'Todas' : cat}
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
                    {renderArtifactGrid('faq')}
                </>
            )}

            {/* Tab: Guías Legales */}
            {activeTab === 'guides' && (
                <>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select
                            className="edit-select"
                            style={{ minWidth: '150px' }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {renderArtifactGrid('guides')}
                </>
            )}

            {/* Tab: Alertas */}
            {activeTab === 'alerts' && (
                <>
                    {/* Alert banner */}
                    <div style={{
                        padding: '10px 16px', borderRadius: '10px',
                        background: '#fef2f2', border: '1px solid #fecaca',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.82rem', color: '#991b1b', fontWeight: 600,
                    }}>
                        🚨 Las alertas regulatorias son detectadas por el Research Agent y pueden generar borradores de FAQ automáticamente.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select
                            className="edit-select"
                            style={{ minWidth: '150px' }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {renderArtifactGrid('alerts')}
                </>
            )}

            {/* Tab: Métricas */}
            {activeTab === 'metrics' && legalStats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* By type breakdown */}
                    <div>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Artefactos por tipo
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {LEGAL_TYPES.map(t => (
                                <div key={t.id} className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ fontSize: '1.5rem' }}>{t.icon}</div>
                                    <div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed' }}>
                                            {stats?.by_type?.[t.id] || 0}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* By status breakdown */}
                    <div>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Estado del pipeline
                        </h4>
                        <div className="card" style={{ padding: '20px', display: 'flex', gap: '0', overflow: 'hidden' }}>
                            {[
                                { label: 'Borrador',    value: stats.by_status?.draft || 0,          color: '#94a3b8', bg: '#f1f5f9' },
                                { label: 'En revisión', value: stats.by_status?.pending_review || 0, color: '#f59e0b', bg: '#fffbeb' },
                                { label: 'Aprobado',    value: stats.by_status?.approved || 0,       color: '#10b981', bg: '#ecfdf5' },
                                { label: 'Rechazado',   value: stats.by_status?.rejected || 0,       color: '#ef4444', bg: '#fef2f2' },
                                { label: 'Publicado',   value: stats.by_status?.published || 0,      color: '#7c3aed', bg: '#f5f3ff' },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} style={{
                                    flex: 1, textAlign: 'center', padding: '12px 8px',
                                    background: bg, borderRight: '1px solid #f1f5f9',
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Categories info */}
                    <div>
                        <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Categorías legales cubiertas
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {LEGAL_CATEGORIES.map(cat => (
                                <span key={cat} style={{
                                    padding: '5px 14px', borderRadius: '20px', fontSize: '0.8rem',
                                    background: '#f5f3ff', color: '#7c3aed',
                                    border: '1px solid #ddd6fe', fontWeight: 600,
                                }}>
                                    {cat}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'metrics' && !legalStats && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando métricas...</div>
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
                                    Nueva entrada legal
                                </h3>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                    Paso {wizardStep} de 4
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
                            {[1, 2, 3, 4].map(n => (
                                <div key={n} style={{
                                    flex: 1, height: '4px', borderRadius: '4px',
                                    background: n <= wizardStep ? '#7c3aed' : '#e5e7eb',
                                    transition: 'background 0.2s',
                                }} />
                            ))}
                        </div>

                        {/* Step 1: Tipo */}
                        {wizardStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    ¿Qué tipo de contenido legal?
                                </h4>
                                {LEGAL_TYPES.map(lt => (
                                    <div
                                        key={lt.id}
                                        className={`wizard-step-card ${wizard.type === lt.id ? 'selected' : ''}`}
                                        onClick={() => setWizard(w => ({ ...w, type: lt.id }))}
                                        style={{ borderColor: wizard.type === lt.id ? '#7c3aed' : undefined }}
                                    >
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '1.2rem' }}>{lt.icon}</span>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{lt.label}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{lt.desc}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Step 2: Pregunta/Tema + Categoría */}
                        {wizardStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                        {wizard.type === 'faq_entry' ? 'Pregunta a responder' : 'Tema o título'}
                                    </h4>
                                    <textarea
                                        className="edit-input-inline"
                                        style={{ minHeight: '90px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
                                        placeholder={wizard.type === 'faq_entry'
                                            ? 'Ej: ¿Pueden los extranjeros no residentes comprar propiedades en Dubai?'
                                            : 'Ej: Proceso completo de compra de propiedad off-plan en Dubai para inversores españoles'
                                        }
                                        value={wizard.topic}
                                        onChange={e => setWizard(w => ({ ...w, topic: e.target.value }))}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Categoría</h4>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {LEGAL_CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                className={`wizard-option-pill ${wizard.category === cat ? 'selected' : ''}`}
                                                onClick={() => setWizard(w => ({ ...w, category: cat }))}
                                                style={{
                                                    background: wizard.category === cat ? '#7c3aed' : undefined,
                                                    borderColor: wizard.category === cat ? '#7c3aed' : undefined,
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Idioma + Fuente */}
                        {wizardStep === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Idioma</h4>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {LANGUAGES.map(l => (
                                            <button
                                                key={l.id}
                                                className={`wizard-option-pill ${wizard.lang === l.id ? 'selected' : ''}`}
                                                onClick={() => setWizard(w => ({ ...w, lang: l.id }))}
                                            >
                                                {l.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                        Fuente o referencia legal <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
                                    </h4>
                                    <input
                                        className="edit-input-inline"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        placeholder="Ej: RERA Law No. 8 of 2007, DLD Circular 2023..."
                                        value={wizard.source}
                                        onChange={e => setWizard(w => ({ ...w, source: e.target.value }))}
                                    />
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                                        Citar la fuente mejora la precisión del contenido generado.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Resumen */}
                        {wizardStep === 4 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    Resumen de generación
                                </h4>
                                {[
                                    { label: 'Tipo',       value: LEGAL_TYPES.find(t => t.id === wizard.type)?.label },
                                    { label: wizard.type === 'faq_entry' ? 'Pregunta' : 'Tema', value: wizard.topic || '(no especificado)' },
                                    { label: 'Categoría',  value: wizard.category },
                                    { label: 'Idioma',     value: wizard.lang },
                                    { label: 'Fuente',     value: wizard.source || '(no especificada)' },
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

                        {/* Wizard navigation */}
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
                                        background: '#7c3aed', color: '#fff', border: 'none',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                    onClick={() => setWizardStep(s => s + 1)}
                                    disabled={wizardStep === 2 && !wizard.topic.trim()}
                                >
                                    Siguiente
                                </button>
                            ) : (
                                <button
                                    style={{
                                        padding: '8px 24px', borderRadius: '20px',
                                        background: generating ? '#94a3b8' : '#7c3aed',
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
                    background: toast.type === 'error' ? '#fef2f2' : '#f5f3ff',
                    color: toast.type === 'error' ? '#991b1b' : '#5b21b6',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#ddd6fe'}`,
                    padding: '12px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );

    // Render artifact grid for the given tab context
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
        );
    }
}
