import { useState } from 'react';
import { STATUS_COLORS, TYPE_LABELS } from './artifactConstants.js';

export default function ArtifactPreviewModal({ artifact, onClose, onEdit, onStatusChange }) {
    const [activeTab, setActiveTab] = useState('contenido');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    if (!artifact) return null;

    const statusMeta = STATUS_COLORS[artifact.status] || STATUS_COLORS.draft;
    const typeLabel = TYPE_LABELS[artifact.type] || artifact.type;
    const meta = artifact.metadata || {};

    function handleApprove() {
        onStatusChange(artifact.id, 'approved');
        onClose();
    }

    function handleRejectSubmit() {
        onStatusChange(artifact.id, 'rejected', rejectReason);
        setShowRejectInput(false);
        setRejectReason('');
        onClose();
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div
                className="card"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '680px', width: '90vw', maxHeight: '88vh',
                    overflowY: 'auto', margin: 'auto', marginTop: '5vh',
                    display: 'flex', flexDirection: 'column', gap: '16px',
                    borderTop: '4px solid var(--primary)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px',
                                borderRadius: '20px', background: '#f1f5f9', color: '#475569',
                                textTransform: 'uppercase'
                            }}>
                                {typeLabel}
                            </span>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px',
                                borderRadius: '20px', background: statusMeta.bg, color: statusMeta.color
                            }}>
                                {statusMeta.label}
                            </span>
                            {meta.lang && (
                                <span style={{
                                    fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px',
                                    borderRadius: '20px', background: '#f0fdf4', color: '#166534'
                                }}>
                                    {meta.lang}
                                </span>
                            )}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                            {artifact.title || 'Sin título'}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                            {new Date(artifact.created_at).toLocaleDateString('es-ES', {
                                day: '2-digit', month: 'long', year: 'numeric'
                            })}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', fontSize: '1.4rem',
                            cursor: 'pointer', color: '#94a3b8', flexShrink: 0, lineHeight: 1,
                            padding: '2px 6px', borderRadius: '8px',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '1px' }}>
                    {['contenido', 'seo'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '6px 14px', border: 'none', borderRadius: '8px 8px 0 0',
                                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab ? '#fff' : '#64748b',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab === 'contenido' ? 'Contenido' : 'SEO / Metadata'}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {activeTab === 'contenido' && (
                    <div style={{
                        whiteSpace: 'pre-wrap', lineHeight: 1.75, color: '#334155',
                        fontSize: '0.88rem', fontFamily: 'inherit',
                        minHeight: '200px',
                    }}>
                        {artifact.content || (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin contenido todavía.</span>
                        )}
                    </div>
                )}

                {activeTab === 'seo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { label: 'Slug',        value: meta.slug },
                            { label: 'Keywords',    value: meta.keywords },
                            { label: 'Descripción SEO', value: meta.seo_description },
                            { label: 'Idioma',      value: meta.lang },
                            { label: 'Tono',        value: meta.tone },
                            { label: 'Palabras',    value: meta.word_count },
                        ].map(({ label, value }) => (
                            <div key={label} style={{
                                display: 'flex', gap: '12px', alignItems: 'flex-start',
                                padding: '10px 14px', background: '#f8fafc', borderRadius: '10px',
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', minWidth: '110px' }}>
                                    {label}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#0f172a', flex: 1, wordBreak: 'break-word' }}>
                                    {value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Rejection reason (if exists) */}
                {artifact.status === 'rejected' && artifact.rejection_reason && (
                    <div style={{
                        fontSize: '0.8rem', color: '#991b1b', background: '#fef2f2',
                        padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #ef4444'
                    }}>
                        <strong>Motivo de rechazo:</strong> {artifact.rejection_reason}
                    </div>
                )}

                {/* Footer actions */}
                <div style={{
                    display: 'flex', gap: '8px', flexWrap: 'wrap',
                    paddingTop: '16px', borderTop: '1px solid #e5e7eb',
                }}>
                    <button className="artifact-action-btn" onClick={() => { onEdit(artifact); onClose(); }}>
                        Editar
                    </button>

                    {artifact.status === 'pending_review' && (
                        <>
                            <button className="artifact-action-btn approve" onClick={handleApprove}>
                                Aprobar
                            </button>
                            {showRejectInput ? (
                                <div style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '240px' }}>
                                    <input
                                        className="edit-input-inline"
                                        style={{ flex: 1, fontSize: '0.8rem' }}
                                        placeholder="Motivo de rechazo..."
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        autoFocus
                                    />
                                    <button className="artifact-action-btn reject" onClick={handleRejectSubmit}>
                                        Confirmar
                                    </button>
                                    <button className="artifact-action-btn" onClick={() => setShowRejectInput(false)}>
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <button className="artifact-action-btn reject" onClick={() => setShowRejectInput(true)}>
                                    Rechazar
                                </button>
                            )}
                        </>
                    )}

                    {artifact.status === 'draft' && (
                        <button
                            className="artifact-action-btn"
                            style={{ background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}
                            onClick={() => { onStatusChange(artifact.id, 'pending_review'); onClose(); }}
                        >
                            Enviar a revisión
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
