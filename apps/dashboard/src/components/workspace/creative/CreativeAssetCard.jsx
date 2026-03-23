import React from 'react';
import { CREATIVE_TYPES, CREATIVE_STATUS } from '../creativeConstants.js';
import WsIcon from '../WsIcon.jsx';

// Icono placeholder por estado cuando no hay thumbnail
const STATUS_PLACEHOLDER = {
    draft:          'file-text',
    generating:     'clock',
    pending_review: 'search',
    approved:       'check-square',
    rejected:       'x-circle',
    scheduled:      'calendar',
    published:      'globe',
};

export default function CreativeAssetCard({ asset, onStatusChange, onPreview, onSendToCalendar }) {
    const typeData  = CREATIVE_TYPES.find(t => t.id === asset.type);
    const statusCfg = CREATIVE_STATUS[asset.status] || { label: asset.status, color: '#94a3b8', bg: '#f1f5f9' };

    const hasThumbnail = !!(asset.thumbnail_url || asset.generated_url);
    const displayTitle = asset.title || new Date(asset.created_at).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
        <div className="cs-card" onClick={() => onPreview?.(asset)}>

            {/* ── Thumbnail ── */}
            <div className="cs-card-thumb">
                {hasThumbnail ? (
                    <img
                        src={asset.thumbnail_url || asset.generated_url}
                        alt={displayTitle}
                        loading="lazy"
                    />
                ) : (
                    <div className="cs-card-thumb-empty">
                        <span style={{ opacity: 0.25 }}>
                            <WsIcon name={STATUS_PLACEHOLDER[asset.status] || 'image'} size={36} />
                        </span>
                    </div>
                )}

                {/* Overlays */}
                <div className="cs-card-overlay-top">
                    {/* Tipo — izquierda */}
                    <span className="cs-card-type-badge">
                        {typeData?.label || asset.type}
                    </span>

                    {/* Estado — derecha */}
                    <span
                        className="cs-card-status-badge"
                        style={{
                            color:      statusCfg.color,
                            background: statusCfg.bg,
                            border:     `1px solid ${statusCfg.color}35`,
                        }}
                    >
                        {statusCfg.label}
                    </span>
                </div>
            </div>

            {/* ── Info ── */}
            <div className="cs-card-info">
                <div className="cs-card-title">{displayTitle}</div>

                {/* ── Acciones por estado ── */}
                <div
                    className="cs-card-actions"
                    onClick={e => e.stopPropagation()} // evitar abrir preview al pulsar botones
                >
                    {asset.status === 'draft' && (
                        <>
                            <button
                                className="cs-card-btn cs-card-btn-primary"
                                onClick={() => onStatusChange?.(asset.id, 'generating')}
                            >
                                Generar
                            </button>
                            <button
                                className="cs-card-btn cs-card-btn-ghost"
                                onClick={() => onPreview?.(asset)}
                            >
                                Ver
                            </button>
                        </>
                    )}

                    {asset.status === 'generating' && (
                        <span className="cs-card-generating">
                            <span className="cs-spinner" />
                            Generando...
                        </span>
                    )}

                    {asset.status === 'pending_review' && (
                        <>
                            <button
                                className="cs-card-btn cs-card-btn-primary"
                                onClick={() => onStatusChange?.(asset.id, 'approved')}
                                title="Aprobar asset"
                            >
                                Aprobar
                            </button>
                            <button
                                className="cs-card-btn cs-card-btn-danger"
                                onClick={() => onStatusChange?.(asset.id, 'rejected')}
                                title="Rechazar asset"
                            >
                                Rechazar
                            </button>
                            <button
                                className="cs-card-btn cs-card-btn-ghost"
                                onClick={() => onPreview?.(asset)}
                            >
                                Vista previa
                            </button>
                        </>
                    )}

                    {asset.status === 'approved' && (
                        <>
                            <button
                                className="cs-card-btn cs-card-btn-ghost"
                                onClick={() => onPreview?.(asset)}
                            >
                                Vista previa
                            </button>
                            <button
                                className="cs-card-btn cs-card-btn-primary"
                                onClick={() => onSendToCalendar?.(asset)}
                            >
                                Enviar a Calendario
                            </button>
                        </>
                    )}

                    {asset.status === 'rejected' && (
                        <>
                            <button
                                className="cs-card-btn cs-card-btn-ghost"
                                onClick={() => onPreview?.(asset)}
                            >
                                Ver motivo
                            </button>
                            {asset.rejection_reason && (
                                <span className="cs-card-rejection-hint" title={asset.rejection_reason}>
                                    {asset.rejection_reason.length > 40
                                        ? asset.rejection_reason.slice(0, 40) + '…'
                                        : asset.rejection_reason}
                                </span>
                            )}
                        </>
                    )}

                    {(asset.status === 'scheduled' || asset.status === 'published') && (
                        <button
                            className="cs-card-btn cs-card-btn-ghost"
                            onClick={() => onPreview?.(asset)}
                        >
                            Ver
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
