import React, { useState } from 'react';
import { API_URL } from '../../api.js';
import { ITEM_STATUS_COLORS, CHANNEL_MAP } from './campaignConstants.js';
import WsIcon from '../workspace/WsIcon.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = ITEM_STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#64748b', label: status };
  return (
    <span
      className="cm-badge"
      style={{ background: cfg.bg, color: cfg.text, fontWeight: 600, fontSize: '0.72rem' }}
    >
      {cfg.label}
    </span>
  );
}

function formatDateTime(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Modal de rechazo ─────────────────────────────────────────────────────────

function RejectModal({ isOpen, onClose, onConfirm }) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  function handleSubmit() {
    onConfirm(reason.trim() || 'Sin razon especificada');
    setReason('');
  }

  return (
    <div
      className="cm-wizard-overlay"
      style={{ zIndex: 2000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cm-wizard-box" style={{ maxWidth: '400px' }}>
        <div className="cm-wizard-header">
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Rechazar pieza
          </h2>
          <button type="button" className="cm-btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <WsIcon name="x-circle" size={16} />
          </button>
        </div>
        <div className="cm-wizard-body" style={{ minHeight: 'unset', paddingTop: '20px' }}>
          <div className="cm-field">
            <label>Motivo de rechazo</label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explica por que se rechaza esta pieza..."
              autoFocus
            />
          </div>
        </div>
        <div className="cm-wizard-footer">
          <div />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="cm-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="cm-btn-reject" onClick={handleSubmit}>
              Confirmar rechazo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Thumbnail de asset creativo ──────────────────────────────────────────────
// Muestra thumbnail si P043 está activo; fallback graceful a icono si 404.

function CreativeThumbnail({ assetId }) {
  const [failed, setFailed] = React.useState(false);
  const src = `${API_URL.replace('/api', '')}/api/creative-studio/assets/${assetId}/thumbnail`;

  if (failed) {
    return (
      <div
        className="cm-item-channel-icon"
        style={{ background: '#f1f5f9' }}
        title="Creative asset vinculado"
      >
        <WsIcon name="image" size={13} color="#94a3b8" />
      </div>
    );
  }

  return (
    <div
      className="cm-item-channel-icon"
      style={{ background: '#f1f5f9', padding: 0, overflow: 'hidden', borderRadius: '6px' }}
      title="Preview del asset creativo"
    >
      <img
        src={src}
        alt="creative"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ─── CampaignItemRow ──────────────────────────────────────────────────────────

export default function CampaignItemRow({ item, onRefresh, onViewContent }) {
  const [loading, setLoading]         = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const chMeta = CHANNEL_MAP[item.channel];

  async function doAction(url, body) {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? `Error (${res.status})`);
        return;
      }
      await onRefresh();
    } catch (e) {
      alert('Error de red: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview() {
    await doAction(`${API_URL}/campaigns/items/${item.id}/submit-review`);
  }

  async function handleApprove() {
    await doAction(`${API_URL}/campaigns/items/${item.id}/approve`);
  }

  async function handleReject(reason) {
    setShowRejectModal(false);
    await doAction(`${API_URL}/campaigns/items/${item.id}/reject`, { reason });
  }

  async function handleDelete() {
    if (!window.confirm(`Eliminar la pieza "${item.title}"? Esta accion no se puede deshacer.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/campaigns/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? `Error (${res.status})`);
        return;
      }
      await onRefresh();
    } catch (e) {
      alert('Error de red: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleProduce() {
    await doAction(`${API_URL}/campaigns/items/${item.id}/produce`);
  }

  const isPendingOrBriefing = item.status === 'pending' || item.status === 'briefing';
  const isPendingReview     = item.status === 'pending_review';
  const isApproved          = item.status === 'approved';
  const isProducing         = item.status === 'producing';
  const isDone              = item.status === 'published' || item.status === 'scheduled';

  return (
    <>
      <div className={`cm-item-row${loading ? ' cm-item-row--loading' : ''}`}>

        {/* Thumbnail si hay creative_asset_id */}
        {item.creative_asset_id ? (
          <CreativeThumbnail assetId={item.creative_asset_id} />
        ) : (
          <div className="cm-item-channel-icon" style={{ background: (chMeta?.color ?? '#94a3b8') + '20' }}>
            {chMeta
              ? <WsIcon name={chMeta.icon} size={13} color={chMeta.color} />
              : <span style={{ fontSize: '0.7rem' }}>{item.channel}</span>
            }
          </div>
        )}

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="cm-content-type-badge">{item.content_type}</span>
            <StatusBadge status={item.status} />
            {item.assigned_agent && (
              <span className="cm-agent-badge">{item.assigned_agent}</span>
            )}
          </div>
          <div style={{ marginTop: '4px', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
            {item.title}
          </div>
          {item.notes && (
            <div style={{ marginTop: '2px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {item.notes}
            </div>
          )}
          {item.scheduled_at && (
            <div style={{ marginTop: '2px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <WsIcon name="clock" size={11} />
              {formatDateTime(item.scheduled_at)}
            </div>
          )}
          {item.status === 'rejected' && item.rejection_reason && (
            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--theme-rose)', background: 'var(--theme-rose-soft)', padding: '4px 8px', borderRadius: '6px' }}>
              Rechazado: {item.rejection_reason}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="cm-item-actions">
          {onViewContent && (
            <button
              type="button"
              className="cm-btn-ghost"
              onClick={() => onViewContent(item)}
              disabled={loading}
              title="Ver contenido"
              style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <WsIcon name="eye" size={12} />
              Ver
            </button>
          )}
          {isPendingOrBriefing && (
            <button
              type="button"
              className="cm-btn-submit"
              onClick={handleSubmitReview}
              disabled={loading}
              title="Enviar a revision"
            >
              Enviar a revision
            </button>
          )}
          {isPendingReview && (
            <>
              <button
                type="button"
                className="cm-btn-approve"
                onClick={handleApprove}
                disabled={loading}
                title="Aprobar"
              >
                <WsIcon name="check" size={12} />
                Aprobar
              </button>
              <button
                type="button"
                className="cm-btn-reject"
                onClick={() => setShowRejectModal(true)}
                disabled={loading}
                title="Rechazar"
              >
                Rechazar
              </button>
            </>
          )}
          {isApproved && (
            <button
              type="button"
              className="cm-btn-submit"
              onClick={handleProduce}
              disabled={loading}
              title="Generar contenido final"
              style={{ background: 'var(--theme-indigo)', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <WsIcon name="play" size={11} color="#fff" />
              Producir
            </button>
          )}
          {isProducing && (
            <span
              className="cm-badge"
              style={{ background: 'var(--theme-indigo-soft)', color: 'var(--theme-indigo)', fontSize: '0.72rem' }}
            >
              Produciendo...
            </span>
          )}
          {isDone && (
            <span
              className="cm-badge"
              style={{ background: 'var(--theme-green-soft)', color: 'var(--theme-green)', fontSize: '0.72rem' }}
            >
              <WsIcon name="check" size={11} />
            </span>
          )}
          <button
            type="button"
            className="cm-btn-ghost"
            onClick={handleDelete}
            disabled={loading}
            title="Eliminar pieza"
            style={{ padding: '4px 6px', color: 'var(--text-muted)' }}
          >
            <WsIcon name="trash-2" size={13} />
          </button>
        </div>
      </div>

      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleReject}
      />
    </>
  );
}
