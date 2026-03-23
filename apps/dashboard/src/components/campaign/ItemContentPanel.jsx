/**
 * ItemContentPanel — Slide-over panel para ver el contenido de una pieza
 *
 * Muestra:
 * - Metadatos del item (canal, tipo, estado, agente, fecha programada)
 * - Si hay artifact_id: fetchea y muestra el contenido del artefacto
 * - Si hay ad_brief: muestra el brief estructurado del anuncio
 * - Si no hay contenido: botón para crear contenido
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { API_URL } from '../../api.js';
import { CHANNEL_MAP, ITEM_STATUS_COLORS } from './campaignConstants.js';
import WsIcon from '../workspace/WsIcon.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const AD_OBJECTIVE_LABELS = {
  BRAND_AWARENESS: 'Brand Awareness',
  TRAFFIC: 'Tráfico',
  CONVERSIONS: 'Conversiones',
  LEAD_GENERATION: 'Generación de leads',
  APP_INSTALL: 'Instalación de app',
  VIDEO_VIEWS: 'Reproducciones de video',
  REACH: 'Alcance',
  ENGAGEMENT: 'Engagement',
};

// ─── Sección: contenido del artefacto ─────────────────────────────────────────

function ArtifactContent({ artifactId }) {
  const [artifact, setArtifact] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/artifacts/${artifactId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`Error ${r.status}`)))
      .then(data => { setArtifact(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [artifactId]);

  if (loading) return (
    <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
      Cargando contenido...
    </div>
  );

  if (error) return (
    <div style={{ padding: '10px 12px', background: '#fff1f2', borderRadius: '8px', color: '#f43f5e', fontSize: '0.82rem' }}>
      No se pudo cargar el artefacto: {error}
    </div>
  );

  if (!artifact) return null;

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px' }}>
        CONTENIDO DEL ARTEFACTO
      </div>

      {/* Título del artefacto */}
      {artifact.title && (
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px' }}>
          {artifact.title}
        </div>
      )}

      {/* Contenido del artefacto */}
      {artifact.content && (
        <div style={{
          background: 'var(--bg-page)',
          border: '1px solid var(--border-light)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          maxHeight: '320px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {artifact.content}
        </div>
      )}

      {/* Status badge */}
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Estado del artefacto:</span>
        <span className="cm-badge" style={{ fontSize: '0.7rem' }}>{artifact.status}</span>
      </div>
    </div>
  );
}

// ─── Sección: Ad Brief ────────────────────────────────────────────────────────

function AdBriefSection({ adBrief, adPlatform, adBudget }) {
  if (!adBrief || Object.keys(adBrief).length === 0) return null;

  const rows = [
    adPlatform                && { label: 'Plataforma',    value: adPlatform },
    adBrief.objective         && { label: 'Objetivo',      value: AD_OBJECTIVE_LABELS[adBrief.objective] ?? adBrief.objective },
    adBrief.format            && { label: 'Formato',       value: adBrief.format },
    adBrief.bid_strategy      && { label: 'Puja',          value: adBrief.bid_strategy },
    adBrief.budget_daily      && { label: 'Presup. diario', value: `$${adBrief.budget_daily}` },
    (adBudget ?? adBrief.budget_total) && { label: 'Presup. total', value: `$${adBudget ?? adBrief.budget_total}` },
  ].filter(Boolean);

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px' }}>
        BRIEF DEL ANUNCIO
      </div>

      <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '12px 14px' }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '3px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
            <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{row.value}</span>
          </div>
        ))}
      </div>

      {adBrief.headline && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TITULAR</div>
          <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
            "{adBrief.headline}"
          </div>
        </div>
      )}

      {adBrief.audience_notes && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>AUDIENCIA</div>
          <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {adBrief.audience_notes}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel principal ───────────────────────────────────────────────────────────

export default function ItemContentPanel({ item, onClose }) {
  const chMeta    = CHANNEL_MAP[item.channel];
  const statusCfg = ITEM_STATUS_COLORS[item.status] ?? { bg: '#f1f5f9', text: '#64748b', label: item.status };

  const hasAd = item.ad_platform || (item.ad_brief && Object.keys(item.ad_brief ?? {}).length > 0);

  // Usar createPortal para montar el panel en document.body y evitar que
  // cualquier ancestro con transform/will-change/filter rompa el stacking context
  // de position:fixed, causando que el panel no se vea cuando el usuario scrollea.
  const panelContent = (
    <>
      {/* Overlay semitransparente */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.25)',
          zIndex: 1200,
        }}
      />

      {/* Panel lateral */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 'min(440px, 92vw)',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-light)',
        boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
        zIndex: 1201,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.2s ease-out',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0,
        }}>
          {chMeta && (
            <div style={{
              width: 32, height: 32,
              background: (chMeta.color ?? '#94a3b8') + '20',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <WsIcon name={chMeta.icon} size={15} color={chMeta.color} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {chMeta?.label ?? item.channel}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.title ?? '(Sin título)'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)', borderRadius: '6px' }}
          >
            <WsIcon name="x" size={16} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Badges: status + agent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span className="cm-badge" style={{ background: statusCfg.bg, color: statusCfg.text, fontWeight: 600, fontSize: '0.72rem' }}>
              {statusCfg.label}
            </span>
            <span className="cm-content-type-badge">{item.content_type}</span>
            {item.assigned_agent && (
              <span className="cm-agent-badge">{item.assigned_agent}</span>
            )}
          </div>

          {/* Fecha programada */}
          {item.scheduled_at && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', background: 'var(--bg-page)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <WsIcon name="calendar" size={13} />
              Programado para: <strong>{formatDateTime(item.scheduled_at)}</strong>
            </div>
          )}

          {/* Notas */}
          {item.notes && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '6px' }}>
                NOTAS
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'var(--bg-page)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                {item.notes}
              </div>
            </div>
          )}

          {/* Motivo de rechazo */}
          {item.status === 'rejected' && item.rejection_reason && (
            <div style={{ marginBottom: '14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', color: '#f43f5e' }}>
              <strong>Rechazado:</strong> {item.rejection_reason}
            </div>
          )}

          {/* Ad Brief (si aplica) */}
          {hasAd && (
            <AdBriefSection
              adBrief={item.ad_brief}
              adPlatform={item.ad_platform}
              adBudget={item.ad_budget}
            />
          )}

          {/* Artefacto vinculado */}
          {item.artifact_id ? (
            <ArtifactContent artifactId={item.artifact_id} />
          ) : (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-page)', border: '1px dashed var(--border-light)', borderRadius: '10px', textAlign: 'center' }}>
              <WsIcon name="file-plus" size={28} color="var(--text-muted)" />
              <p style={{ margin: '8px 0 4px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Sin contenido vinculado
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Este item no tiene un artefacto asociado todavía.
                {item.assigned_agent && ` El agente ${item.assigned_agent} puede generarlo.`}
              </p>
            </div>
          )}
        </div>
      </div>

    </>
  );

  return ReactDOM.createPortal(panelContent, document.body);
}
