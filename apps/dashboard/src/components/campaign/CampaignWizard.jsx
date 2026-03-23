import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../api.js';
import {
  CHANNEL_OPTIONS,
  CHANNEL_DEFAULTS,
  CONTENT_TYPE_BY_CHANNEL,
} from './campaignConstants.js';
import WsIcon from '../workspace/WsIcon.jsx';

// ─── Constantes ───────────────────────────────────────────────────────────────

const AVAILABLE_AGENTS = [
  { id: 'content-agent',      label: 'Content Agent' },
  { id: 'social-media-agent', label: 'Social Media Agent' },
  { id: 'paid-media-agent',   label: 'Paid Media Agent' },
  { id: 'seo-agent',          label: 'SEO Agent' },
  { id: 'marketing-agent',    label: 'Marketing Agent' },
];

const CURRENCIES = ['USD', 'AED', 'EUR'];

const GOALS = [
  'Awareness de marca',
  'Generación de leads',
  'Conversiones / ventas',
  'Engagement',
  'Lanzamiento de producto',
  'Retención de clientes',
];

// ─── Indicador de pasos ───────────────────────────────────────────────────────

function StepIndicator({ current }) {
  const steps = ['Detalles', 'Canales', 'Piezas'];
  return (
    <div className="cm-step-indicator">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isDone   = stepNum < current;
        const isActive = stepNum === current;
        return (
          <React.Fragment key={stepNum}>
            {idx > 0 && (
              <div className={`cm-step-line${isDone ? ' done' : ''}`} />
            )}
            <div
              className={`cm-step-dot${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
              title={label}
            >
              {isDone
                ? <WsIcon name="check" size={12} color="white" />
                : stepNum
              }
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Paso 1: Detalles ─────────────────────────────────────────────────────────

function Step1({ data, onChange }) {
  return (
    <div>
      <div className="cm-field">
        <label>Nombre de la Campaña *</label>
        <input
          type="text"
          value={data.title}
          onChange={e => onChange('title', e.target.value)}
          placeholder="Ej: Campaña Q2 — Lanzamiento Dubai Marina"
        />
      </div>
      <div className="cm-field">
        <label>Descripcion</label>
        <textarea
          rows={3}
          value={data.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Describe el objetivo y contexto de la campaña..."
        />
      </div>
      <div className="cm-field">
        <label>Objetivo principal</label>
        <select
          value={data.goal}
          onChange={e => onChange('goal', e.target.value)}
        >
          <option value="">Seleccionar objetivo...</option>
          {GOALS.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <div className="cm-field">
        <label>Audiencia objetivo</label>
        <input
          type="text"
          value={data.target_audience}
          onChange={e => onChange('target_audience', e.target.value)}
          placeholder="Ej: Inversores hispanohablantes 35-55, interesados en Dubai"
        />
      </div>
      <div className="cm-field-row">
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Fecha de inicio</label>
          <input
            type="date"
            value={data.start_date}
            onChange={e => onChange('start_date', e.target.value)}
          />
        </div>
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Fecha de fin</label>
          <input
            type="date"
            value={data.end_date}
            onChange={e => onChange('end_date', e.target.value)}
          />
        </div>
      </div>
      <div className="cm-field-row">
        <div className="cm-field" style={{ flex: 2 }}>
          <label>Presupuesto total</label>
          <input
            type="number"
            min="0"
            value={data.budget_total}
            onChange={e => onChange('budget_total', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Moneda</label>
          <select
            value={data.currency}
            onChange={e => onChange('currency', e.target.value)}
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Paso 2: Canales ──────────────────────────────────────────────────────────

function Step2({ selected, onToggle }) {
  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
        Selecciona los canales donde se publicara esta campaña. Debes elegir al menos uno.
      </p>
      <div className="cm-channel-grid">
        {CHANNEL_OPTIONS.map(ch => {
          const isSelected = selected.includes(ch.id);
          return (
            <button
              key={ch.id}
              type="button"
              className={`cm-channel-toggle${isSelected ? ' selected' : ''}`}
              onClick={() => onToggle(ch.id)}
            >
              <span style={{ color: isSelected ? 'var(--primary)' : ch.color, marginBottom: '8px' }}>
                <WsIcon name={ch.icon} size={22} color={isSelected ? 'var(--primary)' : ch.color} />
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                {ch.label}
              </span>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ marginTop: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {selected.length} {selected.length === 1 ? 'canal seleccionado' : 'canales seleccionados'}
        </p>
      )}
    </div>
  );
}

// ─── Paso 3: Piezas derivadas ─────────────────────────────────────────────────

function Step3({ items, onUpdateItem, onAddItem, onRemoveItem, channels }) {
  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
        Estas piezas se generaran automaticamente al crear la campaña. Puedes editarlas o añadir mas.
      </p>
      <div className="cm-derived-items">
        {items.map((item, idx) => {
          const chMeta = CHANNEL_OPTIONS.find(c => c.id === item.channel);
          return (
            <div key={idx} className="cm-derived-item">
              <div className="cm-derived-item-channel">
                {chMeta && (
                  <WsIcon name={chMeta.icon} size={14} color={chMeta.color} />
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {chMeta?.label ?? item.channel}
                </span>
              </div>
              <span className="cm-content-type-badge">{item.content_type}</span>
              <input
                type="text"
                className="cm-derived-item-title"
                value={item.title}
                onChange={e => onUpdateItem(idx, 'title', e.target.value)}
                placeholder="Titulo de la pieza..."
              />
              <select
                className="cm-derived-item-agent"
                value={item.assigned_agent}
                onChange={e => onUpdateItem(idx, 'assigned_agent', e.target.value)}
              >
                {AVAILABLE_AGENTS.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="cm-btn-danger"
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                onClick={() => onRemoveItem(idx)}
                title="Eliminar pieza"
              >
                <WsIcon name="trash-2" size={13} />
              </button>
            </div>
          );
        })}
      </div>
      {/* Botón para añadir pieza manual */}
      <div style={{ marginTop: '12px' }}>
        <select
          className="cm-select"
          style={{ width: 'auto', marginRight: '8px' }}
          defaultValue=""
          onChange={e => {
            if (!e.target.value) return;
            onAddItem(e.target.value);
            e.target.value = '';
          }}
        >
          <option value="">+ Añadir pieza para canal...</option>
          {channels.map(chId => {
            const ch = CHANNEL_OPTIONS.find(c => c.id === chId);
            return (
              <option key={chId} value={chId}>{ch?.label ?? chId}</option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

// ─── Wizard principal ─────────────────────────────────────────────────────────

const EMPTY_DETAILS = {
  title: '',
  description: '',
  goal: '',
  target_audience: '',
  start_date: '',
  end_date: '',
  budget_total: '',
  currency: 'USD',
};

function buildDefaultItems(channels) {
  return channels.map(chId => {
    const def = CHANNEL_DEFAULTS[chId] ?? {};
    const chMeta = CHANNEL_OPTIONS.find(c => c.id === chId);
    return {
      channel: chId,
      content_type: def.content_type ?? CONTENT_TYPE_BY_CHANNEL[chId] ?? 'content',
      assigned_agent: def.assigned_agent ?? 'content-agent',
      title: `${chMeta?.label ?? chId} — pieza`,
    };
  });
}

export default function CampaignWizard({ isOpen, onClose, onCreated }) {
  const navigate  = useNavigate();
  const [step, setStep]         = useState(1);
  const [details, setDetails]   = useState({ ...EMPTY_DETAILS });
  const [channels, setChannels] = useState([]);
  const [items, setItems]       = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  if (!isOpen) return null;

  // ── Handlers ──

  function handleDetailsChange(key, value) {
    setDetails(prev => ({ ...prev, [key]: value }));
  }

  function toggleChannel(chId) {
    setChannels(prev => {
      const next = prev.includes(chId)
        ? prev.filter(c => c !== chId)
        : [...prev, chId];
      return next;
    });
  }

  function handleNext() {
    setError('');
    if (step === 1) {
      if (!details.title.trim()) {
        setError('El nombre de la campaña es obligatorio.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (channels.length === 0) {
        setError('Debes seleccionar al menos un canal.');
        return;
      }
      // Generar items por defecto al pasar al paso 3
      const defaultItems = buildDefaultItems(channels);
      setItems(defaultItems);
      setStep(3);
    }
  }

  function handleBack() {
    setError('');
    setStep(s => s - 1);
  }

  function handleUpdateItem(idx, key, value) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  }

  function handleAddItem(chId) {
    const def = CHANNEL_DEFAULTS[chId] ?? {};
    const chMeta = CHANNEL_OPTIONS.find(c => c.id === chId);
    setItems(prev => [...prev, {
      channel: chId,
      content_type: def.content_type ?? CONTENT_TYPE_BY_CHANNEL[chId] ?? 'content',
      assigned_agent: def.assigned_agent ?? 'content-agent',
      title: `${chMeta?.label ?? chId} — pieza`,
    }]);
  }

  function handleRemoveItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      // 1. Crear campaña
      const campaignRes = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: details.title.trim(),
          description: details.description.trim() || undefined,
          goal: details.goal || undefined,
          target_audience: details.target_audience.trim() || undefined,
          channels,
          budget_total: details.budget_total ? Number(details.budget_total) : undefined,
          currency: details.currency,
          start_date: details.start_date || undefined,
          end_date: details.end_date || undefined,
          status: 'planning',
        }),
      });

      if (!campaignRes.ok) {
        const err = await campaignRes.json().catch(() => ({}));
        throw new Error(err.error ?? `Error al crear la campaña (${campaignRes.status})`);
      }

      const campaign = await campaignRes.json();
      const campaignId = campaign.id;

      // 2. Crear items en bulk si hay piezas
      if (items.length > 0) {
        const itemsRes = await fetch(`${API_URL}/campaigns/${campaignId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(items.map(it => ({
            channel: it.channel,
            content_type: it.content_type,
            assigned_agent: it.assigned_agent,
            title: it.title.trim() || `${it.channel} — pieza`,
            status: 'pending',
          }))),
        });

        if (!itemsRes.ok) {
          // Campaña creada, pero items fallaron — navegamos igualmente
          console.warn('Items creation failed, continuing to campaign detail');
        }
      }

      // 3. Resetear y navegar
      resetForm();
      onCreated?.();
      navigate(`/campaign-manager/${campaignId}`);

    } catch (err) {
      setError(err.message ?? 'Error desconocido al crear la campaña.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setStep(1);
    setDetails({ ...EMPTY_DETAILS });
    setChannels([]);
    setItems([]);
    setError('');
    onClose();
  }

  // ── Render ──

  const stepLabels = { 1: 'Detalles', 2: 'Canales', 3: 'Piezas derivadas' };

  return (
    <div className="cm-wizard-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
      <div className="cm-wizard-box">

        {/* Header */}
        <div className="cm-wizard-header">
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
              Paso {step} de 3 — {stepLabels[step]}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Nueva Campaña
            </h2>
          </div>
          <button
            type="button"
            className="cm-btn-ghost"
            onClick={resetForm}
            style={{ padding: '6px' }}
            aria-label="Cerrar"
          >
            <WsIcon name="x-circle" size={18} />
          </button>
        </div>

        {/* Indicador de pasos */}
        <div style={{ padding: '16px 28px 0' }}>
          <StepIndicator current={step} />
        </div>

        {/* Body */}
        <div className="cm-wizard-body">
          {step === 1 && (
            <Step1 data={details} onChange={handleDetailsChange} />
          )}
          {step === 2 && (
            <Step2 selected={channels} onToggle={toggleChannel} />
          )}
          {step === 3 && (
            <Step3
              items={items}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              channels={channels}
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
          <div>
            {step > 1 && (
              <button type="button" className="cm-btn-ghost" onClick={handleBack} disabled={submitting}>
                Atras
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="cm-btn-ghost" onClick={resetForm} disabled={submitting}>
              Cancelar
            </button>
            {step < 3 ? (
              <button type="button" className="cm-btn-primary" onClick={handleNext}>
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                className="cm-btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Creando...' : 'Crear Campaña'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
