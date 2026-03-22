import { useState, useEffect } from 'react';
import { API_URL } from '../../api.js';
import ArtifactCard from './ArtifactCard.jsx';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import { CONTENT_TYPES, TONES, LANGUAGES } from './artifactConstants.js';

export default function ContentWorkspace({ agentId, agent }) {
    const [artifacts, setArtifacts]           = useState([]);
    const [stats, setStats]                   = useState(null);
    const [loading, setLoading]               = useState(true);
    const [filter, setFilter]                 = useState({ type: 'all', status: 'all' });
    const [previewArtifact, setPreviewArtifact] = useState(null);
    const [editArtifact, setEditArtifact]     = useState(null);
    const [showWizard, setShowWizard]         = useState(false);
    const [wizardStep, setWizardStep]         = useState(1);
    const [wizard, setWizard]                 = useState({
        type: 'blog_post', topic: '', tone: 'informativo', lang: 'es-ES', keywords: ''
    });
    const [generating, setGenerating]         = useState(false);
    const [toast, setToast]                   = useState(null);
    const [editForm, setEditForm]             = useState({ title: '', content: '' });

    useEffect(() => {
        fetchArtifacts();
        fetchStats();
    }, [agentId, filter]);

    async function fetchArtifacts() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ agent_id: agentId, limit: '50' });
            if (filter.type !== 'all')   params.append('type', filter.type);
            if (filter.status !== 'all') params.append('status', filter.status);
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

    // Edit artifact (opens a simple modal)
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

    // Generation wizard
    async function handleGenerate() {
        setGenerating(true);
        try {
            // 1. Crear draft inmediatamente
            const res = await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: wizard.type,
                    title: `[Generando] ${wizard.topic || wizard.type}`,
                    content: '',
                    metadata: {
                        tone: wizard.tone, lang: wizard.lang,
                        keywords: wizard.keywords, topic: wizard.topic
                    },
                }),
            });
            const draft = await res.json();

            // 2. Disparar generación via chat del agente (fire-and-forget)
            const prompt = `/generar tipo:${wizard.type} tema:"${wizard.topic}" tono:${wizard.tone} idioma:${wizard.lang} keywords:"${wizard.keywords}" artifact_id:${draft.id}`;
            fetch(`${API_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, userId: 'workspace-wizard' }),
            }).catch(() => {}); // ignorar error de stream

            setShowWizard(false);
            setWizardStep(1);
            setWizard({ type: 'blog_post', topic: '', tone: 'informativo', lang: 'es-ES', keywords: '' });
            showToast('Generación iniciada. El artefacto aparecerá en borrador.');
            setTimeout(fetchArtifacts, 2000); // pequeño delay para que el draft aparezca
        } catch {
            showToast('Error al iniciar generación', 'error');
        } finally {
            setGenerating(false);
        }
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    const statItems = stats ? [
        { label: 'Total', value: stats.total, color: '#64748b' },
        { label: 'En revisión', value: stats.by_status?.pending_review || 0, color: '#f59e0b' },
        { label: 'Aprobados', value: stats.by_status?.approved || 0, color: '#10b981' },
        { label: 'Publicados', value: stats.by_status?.published || 0, color: '#3b82f6' },
    ] : [];

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

            {/* Filters + generate button */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                    className="edit-select"
                    style={{ minWidth: '150px' }}
                    value={filter.type}
                    onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
                >
                    <option value="all">Todos los tipos</option>
                    <option value="blog_post">Blog Post</option>
                    <option value="property_listing">Ficha Propiedad</option>
                    <option value="email_template">Email Template</option>
                </select>

                <select
                    className="edit-select"
                    style={{ minWidth: '150px' }}
                    value={filter.status}
                    onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
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
                    onClick={() => { setShowWizard(true); setWizardStep(1); }}
                >
                    + Generar Contenido
                </button>
            </div>

            {/* Cards grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando artefactos...</div>
            ) : artifacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.3 }}>—</div>
                    <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1rem' }}>No hay artefactos</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                        Genera el primer contenido con el wizard.
                    </p>
                    <button
                        style={{
                            padding: '8px 20px', borderRadius: '20px', background: 'var(--primary)',
                            color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer',
                        }}
                        onClick={() => { setShowWizard(true); setWizardStep(1); }}
                    >
                        Generar Contenido
                    </button>
                </div>
            ) : (
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
                                    Generar Contenido
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
                                    background: n <= wizardStep ? 'var(--primary)' : '#e5e7eb',
                                    transition: 'background 0.2s',
                                }} />
                            ))}
                        </div>

                        {/* Step 1: Tipo */}
                        {wizardStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    ¿Qué tipo de contenido?
                                </h4>
                                {CONTENT_TYPES.map(ct => (
                                    <div
                                        key={ct.id}
                                        className={`wizard-step-card ${wizard.type === ct.id ? 'selected' : ''}`}
                                        onClick={() => setWizard(w => ({ ...w, type: ct.id }))}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{ct.label}</div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{ct.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Step 2: Tema */}
                        {wizardStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    ¿Sobre qué tema?
                                </h4>
                                <textarea
                                    className="edit-input-inline"
                                    style={{ minHeight: '100px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
                                    placeholder="Ej: Guía para invertir en Dubai desde España, cómo funciona el proceso de compra off-plan..."
                                    value={wizard.topic}
                                    onChange={e => setWizard(w => ({ ...w, topic: e.target.value }))}
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Step 3: Tono + Idioma + Keywords */}
                        {wizardStep === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Tono</h4>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {TONES.map(t => (
                                            <button
                                                key={t.id}
                                                className={`wizard-option-pill ${wizard.tone === t.id ? 'selected' : ''}`}
                                                onClick={() => setWizard(w => ({ ...w, tone: t.id }))}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
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
                                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Keywords objetivo</h4>
                                    <input
                                        className="edit-input-inline"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        placeholder="inversión dubai, off-plan dubai, propiedades emiratos..."
                                        value={wizard.keywords}
                                        onChange={e => setWizard(w => ({ ...w, keywords: e.target.value }))}
                                    />
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                                        Separadas por coma
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Resumen + generar */}
                        {wizardStep === 4 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>
                                    Resumen de generación
                                </h4>
                                {[
                                    { label: 'Tipo',     value: CONTENT_TYPES.find(c => c.id === wizard.type)?.label },
                                    { label: 'Tema',     value: wizard.topic || '(no especificado)' },
                                    { label: 'Tono',     value: wizard.tone },
                                    { label: 'Idioma',   value: wizard.lang },
                                    { label: 'Keywords', value: wizard.keywords || '(no especificado)' },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{
                                        display: 'flex', gap: '10px',
                                        padding: '8px 12px', background: '#f8fafc', borderRadius: '8px',
                                    }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', minWidth: '70px' }}>{label}</span>
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
                                        background: 'var(--primary)', color: '#fff', border: 'none',
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
                                        background: generating ? '#94a3b8' : 'var(--primary)',
                                        color: '#fff', border: 'none',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: generating ? 'not-allowed' : 'pointer',
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
                    background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
                    color: toast.type === 'error' ? '#991b1b' : '#065f46',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
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
