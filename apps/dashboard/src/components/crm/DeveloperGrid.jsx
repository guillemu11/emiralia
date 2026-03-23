import React, { useState } from 'react';
import DeveloperCard from './DeveloperCard.jsx';
import { DEVELOPER_TIER } from './crmConstants.js';
import { API_URL } from '../../api.js';

export default function DeveloperGrid({ developers = [], onRefresh }) {
  const [filterTier, setFilterTier] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', tier: 'prospect' });
  const [saving, setSaving] = useState(false);

  const filtered = developers.filter(d => {
    if (filterTier !== 'all' && d.tier !== filterTier) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${d.name} ${d.company ?? ''} ${d.email ?? ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`${API_URL}/crm/developers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ name: '', email: '', company: '', tier: 'prospect' });
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="crm-filters">
        <input
          type="text"
          className="crm-search"
          placeholder="Buscar developer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="crm-select" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
          <option value="all">Todos los tiers</option>
          {Object.entries(DEVELOPER_TIER).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="crm-count">{filtered.length} developers</span>
        <button className="crm-btn-primary" onClick={() => setShowForm(s => !s)}>
          + Nuevo Developer
        </button>
      </div>

      {showForm && (
        <form className="crm-inline-form" onSubmit={handleCreate}>
          <input
            className="crm-input"
            placeholder="Nombre *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="crm-input"
            placeholder="Empresa"
            value={form.company}
            onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
          />
          <input
            className="crm-input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <select className="crm-select" value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
            {Object.entries(DEVELOPER_TIER).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="crm-btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear'}
          </button>
          <button className="crm-btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
        </form>
      )}

      <div className="crm-dev-grid">
        {filtered.length === 0 ? (
          <div className="crm-empty-full">No hay developers con estos filtros</div>
        ) : filtered.map(d => <DeveloperCard key={d.id} developer={d} />)}
      </div>
    </div>
  );
}
