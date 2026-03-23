import React, { useState } from 'react';
import { COMM_CHANNEL, fmtDate } from './crmConstants.js';
import { API_URL } from '../../api.js';

export default function CommTimeline({ communications = [], onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ entity_type: 'developer', entity_id: '', channel: 'note', summary: '' });
  const [saving, setSaving] = useState(false);

  // Group by date
  const byDate = {};
  communications.forEach(c => {
    const day = c.created_at ? c.created_at.split('T')[0] : 'unknown';
    if (!byDate[day]) byDate[day] = [];
    byDate[day].push(c);
  });
  const days = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.entity_id || !form.summary.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/crm/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ entity_type: 'developer', entity_id: '', channel: 'note', summary: '' });
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="crm-comm-view">
      <div className="crm-filters">
        <span className="crm-count">{communications.length} registros</span>
        <button className="crm-btn-primary" onClick={() => setShowForm(s => !s)}>
          + Registrar Interacción
        </button>
      </div>

      {showForm && (
        <form className="crm-inline-form" onSubmit={handleCreate}>
          <select className="crm-select" value={form.entity_type} onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}>
            <option value="developer">Developer</option>
            <option value="lead">Lead</option>
          </select>
          <input
            className="crm-input"
            placeholder={`ID del ${form.entity_type}`}
            value={form.entity_id}
            onChange={e => setForm(f => ({ ...f, entity_id: e.target.value }))}
            required
          />
          <select className="crm-select" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
            {Object.entries(COMM_CHANNEL).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          <input
            className="crm-input"
            placeholder="Resumen de la interacción"
            value={form.summary}
            onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            required
          />
          <button className="crm-btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          <button className="crm-btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
        </form>
      )}

      {communications.length === 0 ? (
        <div className="crm-empty">No hay comunicaciones registradas</div>
      ) : (
        <div className="crm-comm-timeline">
          {days.map(day => (
            <div key={day} className="crm-comm-day-group">
              <div className="crm-comm-day-label">{fmtDate(day)}</div>
              {byDate[day].map(c => {
                const ch = COMM_CHANNEL[c.channel] ?? { icon: '•', label: c.channel };
                return (
                  <div key={c.id} className="crm-comm-entry">
                    <span className="crm-comm-icon">{ch.icon}</span>
                    <div className="crm-comm-content">
                      <div className="crm-comm-meta">
                        <span className="crm-comm-channel">{ch.label}</span>
                        <span className="crm-comm-entity">{c.entity_type} #{c.entity_id.toString().slice(0, 8)}</span>
                        <span className="crm-comm-by">{c.created_by}</span>
                      </div>
                      <div className="crm-comm-summary">{c.summary}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
