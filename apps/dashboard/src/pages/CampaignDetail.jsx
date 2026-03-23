import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../api.js';
import { CAMPAIGN_STATUS_COLORS, CHANNEL_MAP, CHANNEL_OPTIONS, ITEM_STATUS_COLORS } from '../components/campaign/campaignConstants.js';
import CampaignKPIBar from '../components/campaign/CampaignKPIBar.jsx';
import CampaignItemRow from '../components/campaign/CampaignItemRow.jsx';
import CampaignItemModal from '../components/campaign/CampaignItemModal.jsx';
import CampaignCalendarView from '../components/campaign/CampaignCalendarView.jsx';
import ItemContentPanel from '../components/campaign/ItemContentPanel.jsx';
import WsIcon from '../components/workspace/WsIcon.jsx';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  'planning', 'briefing', 'producing', 'reviewing', 'active', 'paused', 'completed',
];

const ITEM_STATUS_OPTIONS = [
  { value: 'all',            label: 'Todos los estados' },
  { value: 'pending',        label: 'Pendiente' },
  { value: 'briefing',       label: 'Briefing' },
  { value: 'producing',      label: 'Produciendo' },
  { value: 'pending_review', label: 'En Revisión' },
  { value: 'approved',       label: 'Aprobado' },
  { value: 'scheduled',      label: 'Programado' },
  { value: 'published',      label: 'Publicado' },
  { value: 'rejected',       label: 'Rechazado' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = CAMPAIGN_STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#64748b', label: status };
  return (
    <span className="cm-badge" style={{ background: cfg.bg, color: cfg.text, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Budget Gauge ─────────────────────────────────────────────────────────────

function BudgetGauge({ total, spent, currency = 'USD' }) {
  if (!total) return <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin presupuesto definido</span>;
  const pct = Math.min(100, Math.round(((spent ?? 0) / total) * 100));
  return (
    <div className="cm-detail-budget-gauge">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
        <span>Presupuesto</span>
        <span>{pct}% utilizado</span>
      </div>
      <div style={{ background: 'var(--border-light)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: pct > 80 ? 'var(--theme-rose)' : 'var(--primary)',
          borderRadius: '999px',
          transition: 'width 0.3s',
        }} />
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
        {currency} {Number(spent ?? 0).toLocaleString()} / {currency} {Number(total).toLocaleString()}
      </div>
    </div>
  );
}

// ─── Channel Pills (header) ────────────────────────────────────────────────────

function ChannelPills({ channels = [] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {channels.map(chId => {
        const ch = CHANNEL_MAP[chId];
        return (
          <span
            key={chId}
            className="cm-channel-pill"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}
            title={ch?.label ?? chId}
          >
            {ch && <WsIcon name={ch.icon} size={11} color={ch.color} />}
            <span style={{ fontSize: '0.75rem' }}>{ch?.label ?? chId}</span>
          </span>
        );
      })}
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ items, channelFilter, setChannelFilter, statusFilter, setStatusFilter, search, setSearch }) {
  // Dynamic channel pills from actual items
  const channelsPresent = [...new Set(items.map(it => it.channel).filter(Boolean))];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center',
      padding: '10px 14px',
      background: 'var(--bg-page)',
      borderRadius: '12px',
      border: '1px solid var(--border-light)',
      marginBottom: '12px',
    }}>
      {/* Channel pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          className={`cm-cal-ch-filter${channelFilter === 'all' ? ' active' : ''}`}
          onClick={() => setChannelFilter('all')}
        >
          Todos
        </button>
        {channelsPresent.map(ch => {
          const meta = CHANNEL_MAP[ch];
          return (
            <button
              key={ch}
              className={`cm-cal-ch-filter${channelFilter === ch ? ' active' : ''}`}
              style={{ '--ch-color': meta?.color ?? '#94a3b8' }}
              onClick={() => setChannelFilter(ch)}
            >
              {meta && <WsIcon name={meta.icon} size={11} color={channelFilter === ch ? '#fff' : (meta.color ?? '#666')} />}
              {meta?.label ?? ch}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status dropdown */}
      <select
        className="cm-select cm-detail-filter-select"
        style={{ fontSize: '0.78rem', padding: '4px 8px' }}
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
      >
        {ITEM_STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar pieza..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="cm-search-input"
        style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
      />
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="cm-page animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: 80, height: 32, background: 'var(--border-light)', borderRadius: '8px' }} />
        <div style={{ width: 240, height: 28, background: 'var(--border-light)', borderRadius: '8px' }} />
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ height: 60, background: 'var(--border-light)', borderRadius: '10px', marginBottom: '8px' }} />
      ))}
    </div>
  );
}

// ─── Empty state de items ─────────────────────────────────────────────────────

function EmptyItems({ onAdd, isFiltered }) {
  if (isFiltered) {
    return (
      <div className="cm-empty" style={{ marginTop: '16px' }}>
        <div className="cm-empty-icon">
          <WsIcon name="filter" size={40} color="var(--text-muted)" />
        </div>
        <h3 className="cm-empty-title">Sin resultados</h3>
        <p className="cm-empty-desc">No hay piezas que coincidan con los filtros activos.</p>
      </div>
    );
  }
  return (
    <div className="cm-empty" style={{ marginTop: '16px' }}>
      <div className="cm-empty-icon">
        <WsIcon name="clipboard-list" size={40} color="var(--text-muted)" />
      </div>
      <h3 className="cm-empty-title">Sin piezas de contenido</h3>
      <p className="cm-empty-desc">
        Esta campaña no tiene piezas todavia. Añade la primera pieza para comenzar la produccion.
      </p>
      <button className="cm-btn-primary" onClick={onAdd}>
        + Añadir primera pieza
      </button>
    </div>
  );
}

// ─── Pagina principal ─────────────────────────────────────────────────────────

export default function CampaignDetail() {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign]         = useState(null);
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState('piezas'); // 'piezas' | 'calendario'

  // Filter state (Piezas tab)
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [search, setSearch]               = useState('');

  // Content panel (slide-over)
  const [contentItem, setContentItem] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/campaigns/${campaignId}`);
      if (!res.ok) throw new Error('No se pudo cargar la campaña');
      const data = await res.json();
      setCampaign(data);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(newStatus) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Error al actualizar estado');
      const updated = await res.json();
      setCampaign(prev => ({ ...prev, status: updated.status ?? newStatus }));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Filtered items
  const filteredItems = items.filter(it => {
    if (channelFilter !== 'all' && it.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && it.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(it.title ?? '').toLowerCase().includes(q) && !(it.notes ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isFiltered = channelFilter !== 'all' || statusFilter !== 'all' || search.trim() !== '';

  if (loading) return <LoadingSkeleton />;
  if (!campaign) {
    return (
      <div className="cm-page">
        <div className="cm-empty">
          <h3 className="cm-empty-title">Campaña no encontrada</h3>
          <button className="cm-btn-ghost" onClick={() => navigate('/campaign-manager')}>
            Volver a campañas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-page animate-fade-in">

      {/* ── Header ── */}
      <div className="cm-detail-header">
        <div>

          {/* Back link */}
          <button
            className="cm-detail-back"
            onClick={() => navigate('/campaign-manager')}
          >
            <WsIcon name="trending-up" size={12} style={{ transform: 'rotate(180deg)' }} />
            Campañas
          </button>

          {/* Titulo + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {campaign.title}
            </h1>
            <StatusBadge status={campaign.status} />
          </div>

          {/* Descripción */}
          {campaign.description && (
            <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {campaign.description}
            </p>
          )}

          {/* Meta row */}
          <div className="cm-detail-meta">
            {campaign.goal && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <WsIcon name="target" size={13} />
                {campaign.goal}
              </span>
            )}
            {campaign.start_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <WsIcon name="calendar" size={13} />
                {formatDate(campaign.start_date)}
                {campaign.end_date && ` → ${formatDate(campaign.end_date)}`}
              </span>
            )}
            {campaign.target_audience && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <WsIcon name="users" size={13} />
                {campaign.target_audience}
              </span>
            )}
          </div>

          {/* Canales */}
          {campaign.channels?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <ChannelPills channels={campaign.channels} />
            </div>
          )}
        </div>

        {/* Panel derecho: status editor + budget */}
        <div className="cm-detail-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Cambiar estado */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
              ESTADO DE LA CAMPAÑA
            </div>
            <select
              className="cm-select"
              style={{ width: '100%' }}
              value={campaign.status}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>
                  {CAMPAIGN_STATUS_COLORS[s]?.label ?? s}
                </option>
              ))}
            </select>
          </div>

          {/* Budget gauge */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
              PRESUPUESTO
            </div>
            <BudgetGauge
              total={campaign.budget_total}
              spent={campaign.budget_spent}
              currency={campaign.currency ?? 'USD'}
            />
          </div>
        </div>
      </div>

      {/* ── KPI Bar ── */}
      <CampaignKPIBar items={items} />

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '0' }}>
        {[
          { id: 'piezas',     label: 'Piezas',     icon: 'clipboard-list' },
          { id: 'calendario', label: 'Calendario',  icon: 'calendar' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              marginBottom: '-1px',
              transition: 'all 0.15s',
            }}
          >
            <WsIcon name={tab.icon} size={13} color={activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)'} />
            {tab.label}
            {tab.id === 'piezas' && (
              <span style={{
                background: activeTab === 'piezas' ? 'var(--primary)' : 'var(--border-light)',
                color: activeTab === 'piezas' ? '#fff' : 'var(--text-muted)',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 6px',
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {items.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Piezas ── */}
      {activeTab === 'piezas' && (
        <>
          {/* Items header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isFiltered
                ? `${filteredItems.length} de ${items.length} piezas`
                : `${items.length} piezas en total`}
            </div>
            <button className="cm-btn-primary" onClick={() => setShowItemModal(true)}>
              + Añadir pieza
            </button>
          </div>

          {/* Filter bar (only show if there are items) */}
          {items.length > 0 && (
            <FilterBar
              items={items}
              channelFilter={channelFilter}
              setChannelFilter={setChannelFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              search={search}
              setSearch={setSearch}
            />
          )}

          {/* Items list */}
          {filteredItems.length === 0 ? (
            <EmptyItems onAdd={() => setShowItemModal(true)} isFiltered={isFiltered} />
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '0 16px' }}>
              {filteredItems.map(item => (
                <CampaignItemRow
                  key={item.id}
                  item={item}
                  onRefresh={fetchData}
                  onViewContent={() => setContentItem(item)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Calendario ── */}
      {activeTab === 'calendario' && (
        <CampaignCalendarView
          externalItems={items.map(it => ({ ...it, campaign_title: campaign.title, campaign_id: campaignId }))}
          campaignDateRange={{ start: campaign.start_date, end: campaign.end_date }}
        />
      )}

      {/* ── Modal añadir pieza ── */}
      <CampaignItemModal
        campaignId={campaignId}
        item={null}
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSaved={fetchData}
      />

      {/* ── Slide-over: contenido de pieza ── */}
      {contentItem && (
        <ItemContentPanel
          item={contentItem}
          onClose={() => setContentItem(null)}
        />
      )}

    </div>
  );
}
