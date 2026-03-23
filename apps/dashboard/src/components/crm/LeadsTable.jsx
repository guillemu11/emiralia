import React, { useState } from 'react';
import { LEAD_STATUS, LEAD_SOURCE, fmtDate } from './crmConstants.js';
import { API_URL } from '../../api.js';

export default function LeadsTable({ leads = [], onRefresh }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);

  const filtered = leads.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (filterSource !== 'all' && l.source !== filterSource) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${l.name} ${l.email} ${l.country ?? ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function handleStatusChange(id, status) {
    setUpdating(id);
    try {
      await fetch(`${API_URL}/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onRefresh?.();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="crm-table-wrap">
      {/* Filters */}
      <div className="crm-filters">
        <input
          type="text"
          className="crm-search"
          placeholder="Buscar nombre, email, país..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="crm-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          {Object.entries(LEAD_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="crm-select" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="all">Todas las fuentes</option>
          {Object.entries(LEAD_SOURCE).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="crm-count">{filtered.length} leads</span>
      </div>

      {/* Table */}
      <table className="crm-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>País</th>
            <th>Fuente</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={8} className="crm-empty">No hay leads con estos filtros</td></tr>
          ) : filtered.map(lead => {
            const statusCfg = LEAD_STATUS[lead.status] ?? LEAD_STATUS.captured;
            return (
              <tr key={lead.id} className={updating === lead.id ? 'crm-row-updating' : ''}>
                <td className="crm-td-id">{lead.id}</td>
                <td className="crm-td-name">{lead.name}</td>
                <td className="crm-td-email">{lead.email}</td>
                <td>{lead.country ?? '—'}</td>
                <td>{LEAD_SOURCE[lead.source]?.label ?? lead.source ?? '—'}</td>
                <td>
                  <span className="crm-badge" style={{ background: statusCfg.bg, color: statusCfg.text }}>
                    {statusCfg.label}
                  </span>
                </td>
                <td className="crm-td-date">{fmtDate(lead.created_at)}</td>
                <td>
                  <select
                    className="crm-action-select"
                    value={lead.status}
                    disabled={updating === lead.id}
                    onChange={e => handleStatusChange(lead.id, e.target.value)}
                  >
                    {Object.entries(LEAD_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
