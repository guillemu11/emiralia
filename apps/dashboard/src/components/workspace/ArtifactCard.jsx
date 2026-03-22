import { useState } from 'react';
import { STATUS_COLORS, TYPE_LABELS, HANDOFF_AGENTS } from './artifactConstants.js';
import PublishMenu from './PublishMenu.jsx';

export default function ArtifactCard({ artifact, onPreview, onEdit, onStatusChange, onHandoff, onPublish }) {
    const [showPublishMenu, setShowPublishMenu] = useState(false);
    const [showHandoffMenu, setShowHandoffMenu] = useState(false);
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const statusMeta = STATUS_COLORS[artifact.status] || STATUS_COLORS.draft;
    const typeLabel = TYPE_LABELS[artifact.type] || artifact.type;

    function handleApprove(e) {
        e.stopPropagation();
        onStatusChange(artifact.id, 'approved');
    }

    function handleRejectSubmit(e) {
        e.stopPropagation();
        onStatusChange(artifact.id, 'rejected', rejectReason);
        setShowRejectInput(false);
        setRejectReason('');
    }

    function handleHandoffSelect(e, agentId) {
        e.stopPropagation();
        const instruction = `Por favor, procesa este artefacto: "${artifact.title}"`;
        onHandoff(artifact, agentId, instruction);
        setShowHandoffMenu(false);
    }

    const contentPreview = artifact.content
        ? artifact.content.replace(/#+\s?/g, '').replace(/\*\*/g, '').trim()
        : '';

    return (
        <div className="card artifact-card" onClick={() => onPreview(artifact)}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px',
                        borderRadius: '20px', background: '#f1f5f9', color: '#475569',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                        {typeLabel}
                    </span>
                    <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px',
                        borderRadius: '20px', background: statusMeta.bg, color: statusMeta.color
                    }}>
                        {statusMeta.label}
                    </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(artifact.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                </span>
            </div>

            {/* Title */}
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                {artifact.title || 'Sin título'}
            </h4>

            {/* Content preview */}
            {contentPreview && (
                <p className="artifact-card-preview">{contentPreview}</p>
            )}

            {/* Keywords (metadata) */}
            {artifact.metadata?.keywords && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {String(artifact.metadata.keywords).split(',').slice(0, 3).map(kw => (
                        <span key={kw.trim()} style={{
                            fontSize: '0.68rem', padding: '2px 6px', borderRadius: '10px',
                            background: '#eff6ff', color: '#3b82f6', fontWeight: 600
                        }}>
                            {kw.trim()}
                        </span>
                    ))}
                </div>
            )}

            {/* Rejection reason */}
            {artifact.status === 'rejected' && artifact.rejection_reason && (
                <div style={{
                    fontSize: '0.75rem', color: '#991b1b', background: '#fef2f2',
                    padding: '6px 10px', borderRadius: '8px', borderLeft: '3px solid #ef4444'
                }}>
                    {artifact.rejection_reason}
                </div>
            )}

            {/* Actions */}
            <div className="artifact-actions" onClick={e => e.stopPropagation()}>
                <button className="artifact-action-btn" onClick={() => onPreview(artifact)}>Ver</button>
                <button className="artifact-action-btn" onClick={() => onEdit(artifact)}>Editar</button>

                {artifact.status === 'pending_review' && (
                    <>
                        <button className="artifact-action-btn approve" onClick={handleApprove}>Aprobar</button>
                        {showRejectInput ? (
                            <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '4px' }}>
                                <input
                                    className="edit-input-inline"
                                    style={{ flex: 1, fontSize: '0.75rem' }}
                                    placeholder="Motivo de rechazo..."
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    autoFocus
                                />
                                <button className="artifact-action-btn reject" onClick={handleRejectSubmit}>OK</button>
                                <button className="artifact-action-btn" onClick={() => setShowRejectInput(false)}>✕</button>
                            </div>
                        ) : (
                            <button className="artifact-action-btn reject" onClick={e => { e.stopPropagation(); setShowRejectInput(true); }}>
                                Rechazar
                            </button>
                        )}
                    </>
                )}

                {artifact.status === 'approved' && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button className="artifact-action-btn publish" onClick={e => { e.stopPropagation(); setShowPublishMenu(v => !v); }}>
                            Publicar
                        </button>
                        {showPublishMenu && (
                            <PublishMenu
                                artifact={artifact}
                                onPublish={(art, dest) => { onPublish(art, dest); setShowPublishMenu(false); }}
                                onClose={() => setShowPublishMenu(false)}
                            />
                        )}
                    </div>
                )}

                {/* Handoff — disponible para draft/approved */}
                {['draft', 'approved', 'pending_review'].includes(artifact.status) && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button className="artifact-action-btn" onClick={e => { e.stopPropagation(); setShowHandoffMenu(v => !v); }}>
                            Handoff
                        </button>
                        {showHandoffMenu && (
                            <div className="publish-menu">
                                {HANDOFF_AGENTS.map(ag => (
                                    <button
                                        key={ag.id}
                                        className="publish-menu-item"
                                        onClick={e => handleHandoffSelect(e, ag.id)}
                                    >
                                        {ag.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {artifact.status === 'draft' && (
                    <button
                        className="artifact-action-btn"
                        style={{ background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}
                        onClick={e => { e.stopPropagation(); onStatusChange(artifact.id, 'pending_review'); }}
                    >
                        Enviar a revisión
                    </button>
                )}
            </div>
        </div>
    );
}
