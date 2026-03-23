import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CAMPAIGN_STATUS_COLORS, CHANNEL_MAP } from './campaignConstants.js';
import WsIcon from '../workspace/WsIcon.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = CAMPAIGN_STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#64748b', label: status };
  return (
    <span className="cm-badge" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

function ChannelPills({ channels = [] }) {
  const visible = channels.slice(0, 3);
  const rest = channels.length - 3;
  return (
    <div className="cm-channel-pills">
      {visible.map(ch => {
        const meta = CHANNEL_MAP[ch];
        return (
          <span key={ch} className="cm-channel-pill" title={meta?.label ?? ch}>
            {meta?.icon ? <WsIcon name={meta.icon} size={11} /> : ch}
          </span>
        );
      })}
      {rest > 0 && <span className="cm-channel-pill cm-channel-pill-more">+{rest}</span>}
    </div>
  );
}

function BudgetBar({ total, spent }) {
  if (!total) return <span className="cm-muted">—</span>;
  const pct = Math.min(100, Math.round((spent / total) * 100));
  return (
    <div className="cm-budget-wrap">
      <div className="cm-budget-bar">
        <div className="cm-budget-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="cm-budget-label">
        ${Number(spent ?? 0).toLocaleString()} / ${Number(total).toLocaleString()}
      </span>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const ALL_STATUSES = ['planning', 'briefing', 'producing', 'reviewing', 'active', 'paused', 'completed'];

export default function CampaignList({ campaigns = [], loading, onNew }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = campaigns.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="cm-loading">
        <div className="cm-loading-spinner" />
        <span>Cargando campañas...</span>
      </div>
    );
  }

  return (
    <div className="cm-list-wrap">

      {/* ── Filters ── */}
      <div className="cm-filters">
        <div className="cm-search-wrap">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="cm-search"
            placeholder="Buscar campaña..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="cm-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{CAMPAIGN_STATUS_COLORS[s]?.label ?? s}</option>
          ))}
        </select>
        <div className="cm-filter-count">
          {filtered.length} {filtered.length === 1 ? 'campaña' : 'campañas'}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="cm-empty">
          <div className="cm-empty-icon"><WsIcon name="clipboard-list" size={40} /></div>
          <h3 className="cm-empty-title">
            {campaigns.length === 0 ? 'Sin campañas aún' : 'Sin resultados'}
          </h3>
          <p className="cm-empty-desc">
            {campaigns.length === 0
              ? 'Crea tu primera campaña multi-canal para coordinar todo tu contenido en un solo lugar.'
              : 'Prueba con otro término de búsqueda o cambia el filtro de estado.'}
          </p>
          {campaigns.length === 0 && (
            <button className="cm-btn-primary" onClick={onNew}>
              + Nueva Campaña
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {filtered.length > 0 && (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Estado</th>
                <th>Canales</th>
                <th>Piezas</th>
                <th>Presupuesto</th>
                <th>Fechas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className="cm-row"
                  onClick={() => navigate(`/campaign-manager/${c.id}`)}
                >
                  <td>
                    <div className="cm-campaign-title">{c.title}</div>
                    {c.goal && <div className="cm-campaign-goal">{c.goal}</div>}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td><ChannelPills channels={c.channels ?? []} /></td>
                  <td>
                    <span className="cm-items-count">
                      {c.items_count ?? '—'}
                    </span>
                  </td>
                  <td>
                    <BudgetBar total={c.budget_total} spent={c.budget_spent} />
                  </td>
                  <td>
                    <div className="cm-dates">
                      <span>{formatDate(c.start_date)}</span>
                      {c.end_date && <span className="cm-muted"> → {formatDate(c.end_date)}</span>}
                    </div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="cm-btn-ghost"
                      onClick={() => navigate(`/campaign-manager/${c.id}`)}
                    >
                      Ver →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
