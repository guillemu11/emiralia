import React, { useState, useEffect, useCallback } from 'react';
import { CREATIVE_TYPES, CREATIVE_STATUS, isVideoType } from '../creativeConstants.js';
import WsIcon from '../WsIcon.jsx';

// Campos del brief que queremos mostrar como detalles legibles
const BRIEF_LABEL_MAP = {
    prompt:             'Prompt',
    style:              'Estilo',
    script:             'Guión',
    avatar:             'Avatar',
    topic:              'Tema',
    hosts:              'Hosts',
    motion_description: 'Movimiento',
    infographic_type:   'Tipo de infografía',
    source_image_url:   'Imagen fuente',
    property_id:        'ID Propiedad',
};

function formatBriefValue(value) {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

export default function CreativePreviewModal({ asset, onClose, onStatusChange, onSendToCalendar }) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const typeData  = CREATIVE_TYPES.find(t => t.id === asset.type);
    const statusCfg = CREATIVE_STATUS[asset.status] || { label: asset.status, color: '#94a3b8', bg: '#f1f5f9' };
    const isVideo   = isVideoType(asset.type);

    const displayTitle = asset.title || `${typeData?.label || asset.type} · ${new Date(asset.created_at).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
    })}`;

    // Filtrar campos del brief con valor real y etiqueta conocida
    const briefEntries = asset.brief
        ? Object.entries(asset.brief)
              .filter(([k]) => BRIEF_LABEL_MAP[k] && asset.brief[k] !== undefined && asset.brief[k] !== '')
        : [];

    // Cerrar con Escape
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') onClose?.();
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    function handleApprove() {
        onStatusChange?.(asset.id, 'approved');
        onClose?.();
    }

    function handleRejectConfirm() {
        onStatusChange?.(asset.id, 'rejected', rejectReason.trim() || null);
        setShowRejectForm(false);
        onClose?.();
    }

    function handleSendToCalendar() {
        onSendToCalendar?.(asset);
        onClose?.();
    }

    return (
        // Backdrop — click fuera cierra
        <div
            className="cs-modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Vista previa: ${displayTitle}`}
        >
            {/* Panel principal — stopPropagation evita cerrar al hacer clic dentro */}
            <div className="cs-modal" onClick={e => e.stopPropagation()}>

                {/* Botón cerrar */}
                <button
                    className="cs-modal-close"
                    onClick={onClose}
                    aria-label="Cerrar modal"
                >
                    &#x2715;
                </button>

                {/* ── Lado izquierdo: media ── */}
                <div className="cs-modal-left">
                    {isVideo ? (
                        asset.generated_url ? (
                            <video
                                className="cs-modal-video"
                                src={asset.generated_url}
                                controls
                                autoPlay={false}
                            />
                        ) : (
                            <div className="cs-modal-media-placeholder">
                                <span style={{ opacity: 0.2 }}><WsIcon name="video" size={40} /></span>
                                <p>Video no disponible aún</p>
                            </div>
                        )
                    ) : (
                        asset.generated_url || asset.thumbnail_url ? (
                            <img
                                className="cs-modal-img"
                                src={asset.generated_url || asset.thumbnail_url}
                                alt={displayTitle}
                            />
                        ) : (
                            <div className="cs-modal-media-placeholder">
                                <span style={{ opacity: 0.2 }}><WsIcon name="image" size={48} /></span>
                                <p>Imagen no generada todavía</p>
                            </div>
                        )
                    )}
                </div>

                {/* ── Lado derecho: metadatos y acciones ── */}
                <div className="cs-modal-right">

                    {/* Header: tipo + estado */}
                    <div className="cs-modal-header">
                        <span className="cs-modal-type-badge">
                            {typeData?.label || asset.type}
                        </span>
                        <span
                            className="cs-modal-status-badge"
                            style={{
                                color:      statusCfg.color,
                                background: statusCfg.bg,
                                border:     `1px solid ${statusCfg.color}35`,
                            }}
                        >
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* Título */}
                    <h2 className="cs-modal-title">{displayTitle}</h2>

                    {/* Detalles del brief */}
                    {briefEntries.length > 0 && (
                        <section className="cs-modal-brief-details">
                            <h3 className="cs-modal-section-label">Brief</h3>
                            <dl className="cs-modal-dl">
                                {briefEntries.map(([key, value]) => (
                                    <div key={key} className="cs-modal-dl-row">
                                        <dt>{BRIEF_LABEL_MAP[key]}</dt>
                                        <dd>{formatBriefValue(value)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}

                    {/* Output config */}
                    {asset.output_config && Object.keys(asset.output_config).length > 0 && (
                        <section className="cs-modal-meta">
                            <h3 className="cs-modal-section-label">Output</h3>
                            <dl className="cs-modal-dl">
                                {asset.output_config.format && (
                                    <div className="cs-modal-dl-row">
                                        <dt>Formato</dt>
                                        <dd>{asset.output_config.format}</dd>
                                    </div>
                                )}
                                {asset.output_config.quality && (
                                    <div className="cs-modal-dl-row">
                                        <dt>Calidad</dt>
                                        <dd>{asset.output_config.quality}</dd>
                                    </div>
                                )}
                                {asset.output_config.platform && (
                                    <div className="cs-modal-dl-row">
                                        <dt>Plataforma</dt>
                                        <dd>{asset.output_config.platform}</dd>
                                    </div>
                                )}
                                {asset.output_config.duration && (
                                    <div className="cs-modal-dl-row">
                                        <dt>Duración</dt>
                                        <dd>{asset.output_config.duration}</dd>
                                    </div>
                                )}
                            </dl>
                        </section>
                    )}

                    {/* Fecha de creación */}
                    <p className="cs-modal-date">
                        Creado el{' '}
                        {new Date(asset.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'long', year: 'numeric',
                        })}
                    </p>

                    {/* ── Acciones por estado ── */}
                    <div className="cs-modal-actions">

                        {asset.status === 'pending_review' && !showRejectForm && (
                            <>
                                <button
                                    className="cs-modal-btn cs-modal-btn-approve"
                                    onClick={handleApprove}
                                >
                                    Aprobar
                                </button>
                                <button
                                    className="cs-modal-btn cs-modal-btn-reject"
                                    onClick={() => setShowRejectForm(true)}
                                >
                                    Rechazar
                                </button>
                            </>
                        )}

                        {asset.status === 'pending_review' && showRejectForm && (
                            <div className="cs-modal-reject-form">
                                <label className="cs-modal-reject-label">
                                    Motivo de rechazo
                                </label>
                                <textarea
                                    className="cs-modal-reject-textarea"
                                    rows={3}
                                    placeholder="Describe el motivo del rechazo..."
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    autoFocus
                                />
                                <div className="cs-modal-reject-actions">
                                    <button
                                        className="cs-modal-btn cs-modal-btn-reject"
                                        onClick={handleRejectConfirm}
                                    >
                                        Confirmar rechazo
                                    </button>
                                    <button
                                        className="cs-modal-btn cs-modal-btn-ghost"
                                        onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        {asset.status === 'approved' && (
                            <button
                                className="cs-modal-btn cs-modal-btn-calendar"
                                onClick={handleSendToCalendar}
                            >
                                Enviar a Calendario
                            </button>
                        )}

                        {asset.status === 'rejected' && asset.rejection_reason && (
                            <div className="cs-modal-rejection-reason">
                                <span className="cs-modal-rejection-label">Motivo de rechazo</span>
                                <p className="cs-modal-rejection-text">{asset.rejection_reason}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
