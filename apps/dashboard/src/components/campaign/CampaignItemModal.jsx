import React, { useState, useEffect } from 'react';
import { API_URL } from '../../api.js';
import {
  CHANNEL_OPTIONS,
  CONTENT_TYPE_BY_CHANNEL,
} from './campaignConstants.js';
import WsIcon from '../workspace/WsIcon.jsx';
import PaidAdBriefPanel from './PaidAdBriefPanel.jsx';

// ─── Constantes ───────────────────────────────────────────────────────────────

const AVAILABLE_AGENTS = [
  { id: 'content-agent',      label: 'Content Agent' },
  { id: 'social-media-agent', label: 'Social Media Agent' },
  { id: 'paid-media-agent',   label: 'Paid Media Agent' },
  { id: 'seo-agent',          label: 'SEO Agent' },
  { id: 'marketing-agent',    label: 'Marketing Agent' },
];

const PAID_CHANNELS = ['meta_ads', 'google_ads', 'tiktok_ads'];

function emptyForm(item) {
  if (item) {
    return {
      channel:          item.channel ?? '',
      content_type:     item.content_type ?? '',
      title:            item.title ?? '',
      assigned_agent:   item.assigned_agent ?? 'content-agent',
      notes:            item.notes ?? '',
      scheduled_at:     item.scheduled_at ? item.scheduled_at.slice(0, 16) : '',
      ad_platform:      item.ad_platform ?? item.channel ?? '',
      ad_objective:     item.ad_brief?.objective ?? '',
      ad_format:        item.ad_brief?.format ?? '',
      ad_bid_strategy:  item.ad_brief?.bid_strategy ?? '',
      ad_budget:        item.ad_budget ?? '',
      ad_budget_daily:  item.ad_brief?.budget_daily ?? '',
      audience_notes:   item.ad_brief?.audience_notes ?? '',
      ad_headline:      item.ad_brief?.headline ?? '',
    };
  }
  return {
    channel:          '',
    content_type:     '',
    title:            '',
    assigned_agent:   'content-agent',
    notes:            '',
    scheduled_at:     '',
    ad_platform:      '',
    ad_objective:     '',
    ad_format:        '',
    ad_bid_strategy:  '',
    ad_budget:        '',
    ad_budget_daily:  '',
    audience_notes:   '',
    ad_headline:      '',
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function CampaignItemModal({ campaignId, item, isOpen, onClose, onSaved }) {
  const isEditing = !!item;
  const [form, setForm]         = useState(emptyForm(item));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  // Resetear form cuando el modal se abre/cierra o cambia el item
  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm(item));
      setError('');
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  function handleChange(key, value) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-set content_type al cambiar canal
      if (key === 'channel' && CONTENT_TYPE_BY_CHANNEL[value]) {
        next.content_type = CONTENT_TYPE_BY_CHANNEL[value];
      }
      return next;
    });
  }

  const isPaid = PAID_CHANNELS.includes(form.channel);

  async function handleSubmit() {
    setError('');
    if (!form.channel) {
      setError('Debes seleccionar un canal.');
      return;
    }
    if (!form.title.trim()) {
      setError('El titulo es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        channel:        form.channel,
        content_type:   form.content_type || CONTENT_TYPE_BY_CHANNEL[form.channel] || 'content',
        title:          form.title.trim(),
        assigned_agent: form.assigned_agent || undefined,
        notes:          form.notes.trim() || undefined,
        scheduled_at:   form.scheduled_at || undefined,
        ad_platform:    isPaid ? (form.ad_platform || form.channel) : undefined,
        ad_budget:      form.ad_budget ? Number(form.ad_budget) : undefined,
        ad_brief:       isPaid ? {
          objective:      form.ad_objective || undefined,
          format:         form.ad_format || undefined,
          bid_strategy:   form.ad_bid_strategy || undefined,
          budget_daily:   form.ad_budget_daily ? Number(form.ad_budget_daily) : undefined,
          audience_notes: form.audience_notes.trim() || undefined,
          headline:       form.ad_headline.trim() || undefined,
        } : undefined,
      };

      let res;
      if (isEditing) {
        res = await fetch(`${API_URL}/campaigns/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/campaigns/${campaignId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error (${res.status})`);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message ?? 'Error desconocido.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="cm-wizard-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cm-wizard-box">

        {/* Header */}
        <div className="cm-wizard-header">
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {isEditing ? 'Editar pieza' : 'Añadir pieza'}
          </h2>
          <button type="button" className="cm-btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <WsIcon name="x-circle" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="cm-wizard-body">

          <div className="cm-field-row">
            <div className="cm-field" style={{ flex: 1 }}>
              <label>Canal *</label>
              <select
                value={form.channel}
                onChange={e => handleChange('channel', e.target.value)}
              >
                <option value="">Seleccionar canal...</option>
                {CHANNEL_OPTIONS.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.label}</option>
                ))}
              </select>
            </div>
            <div className="cm-field" style={{ flex: 1 }}>
              <label>Tipo de contenido</label>
              <input
                type="text"
                value={form.content_type}
                onChange={e => handleChange('content_type', e.target.value)}
                placeholder="Auto desde canal"
              />
            </div>
          </div>

          <div className="cm-field">
            <label>Titulo *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="Nombre de la pieza de contenido"
            />
          </div>

          <div className="cm-field">
            <label>Agente asignado</label>
            <select
              value={form.assigned_agent}
              onChange={e => handleChange('assigned_agent', e.target.value)}
            >
              <option value="">Sin asignar</option>
              {AVAILABLE_AGENTS.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="cm-field">
            <label>Notas</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Instrucciones, contexto o detalles para el agente..."
            />
          </div>

          <div className="cm-field">
            <label>Programado para</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={e => handleChange('scheduled_at', e.target.value)}
            />
          </div>

          {/* Seccion Paid Media — solo para canales de pago */}
          {isPaid && (
            <PaidAdBriefPanel
              form={form}
              channel={form.channel}
              onChange={handleChange}
            />
          )}

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'var(--theme-rose-soft)',
              color: 'var(--theme-rose)',
              borderRadius: '8px',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="cm-wizard-footer">
          <div />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="cm-btn-ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="button" className="cm-btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Añadir pieza')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
