import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../api.js';
import { CHANNEL_MAP, ITEM_STATUS_COLORS } from './campaignConstants.js';
import WsIcon from '../workspace/WsIcon.jsx';

// ─── Constantes ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_LABELS_FULL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const CHANNEL_COLORS = {
  blog:       '#6366f1',
  instagram:  '#ec4899',
  tiktok:     '#000000',
  linkedin:   '#0a66c2',
  meta_ads:   '#1877f2',
  google_ads: '#ea4335',
  tiktok_ads: '#69c9d0',
  email:      '#f59e0b',
  default:    '#94a3b8',
};

// ─── Helpers de fecha ──────────────────────────────────────────────────────────

function isoToDate(str) {
  if (!str) return null;
  return new Date(str);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Primer día de la semana (Lun=0 … Dom=6)
function firstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

// Obtiene el lunes de la semana que contiene `date`
function getMondayOfWeek(date) {
  const d   = new Date(date);
  const day = d.getDay(); // 0=Dom … 6=Sáb
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDayLabel(date) {
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// ─── Badge de item (compartido entre vistas) ───────────────────────────────────

function CalendarItemBadge({ item, onClick }) {
  const ch    = item.channel ?? 'default';
  const color = CHANNEL_COLORS[ch] ?? CHANNEL_COLORS.default;
  const chMeta = CHANNEL_MAP[ch];

  return (
    <button
      className="cm-cal-item-badge"
      style={{ borderLeftColor: color }}
      onClick={() => onClick(item)}
      title={`${item.title ?? ch} — ${item.campaign_title ?? ''}`}
    >
      <span className="cm-cal-item-icon">
        <WsIcon name={chMeta?.icon ?? 'file'} size={10} color={color} />
      </span>
      <span className="cm-cal-item-title">
        {item.title ?? chMeta?.label ?? ch}
      </span>
    </button>
  );
}

// ─── Panel de detalle de item (sidebar del calendario) ─────────────────────────

function ItemDetailPanel({ item, onClose }) {
  const navigate = useNavigate();
  if (!item) return null;

  const ch        = item.channel ?? 'default';
  const color     = CHANNEL_COLORS[ch] ?? CHANNEL_COLORS.default;
  const chMeta    = CHANNEL_MAP[ch];
  const statusCfg = ITEM_STATUS_COLORS[item.status] ?? { bg: '#f1f5f9', text: '#64748b', label: item.status };

  return (
    <div className="cm-cal-detail-panel">
      <div className="cm-cal-detail-header">
        <span className="cm-cal-detail-channel" style={{ color }}>
          <WsIcon name={chMeta?.icon ?? 'file'} size={14} color={color} />
          {chMeta?.label ?? ch}
        </span>
        <button className="cm-cal-detail-close" onClick={onClose}>
          <WsIcon name="x" size={14} />
        </button>
      </div>

      <h4 className="cm-cal-detail-title">{item.title ?? '(Sin título)'}</h4>

      {item.campaign_title && (
        <p className="cm-cal-detail-campaign">{item.campaign_title}</p>
      )}

      <div className="cm-cal-detail-meta">
        <span className="cm-badge" style={{ background: statusCfg.bg, color: statusCfg.text, fontWeight: 600, fontSize: '0.72rem' }}>
          {statusCfg.label}
        </span>
        {item.assigned_agent && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.assigned_agent}</span>
        )}
      </div>

      {item.scheduled_at && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          <WsIcon name="clock" size={11} style={{ marginRight: 4 }} />
          {new Date(item.scheduled_at).toLocaleString('es-ES', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}

      {item.notes && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
          {item.notes}
        </p>
      )}

      <button
        className="cm-btn-secondary"
        style={{ marginTop: '12px', width: '100%', fontSize: '0.78rem' }}
        onClick={() => navigate(`/campaign-manager/${item.campaign_id}`)}
      >
        Ver campaña
      </button>
    </div>
  );
}

// ─── Vista Mes ─────────────────────────────────────────────────────────────────

function MonthView({ year, month, visibleItems, today, selected, setSelected }) {
  const firstDay  = firstDayOfMonth(year, month);
  const totalDays = daysInMonth(year, month);
  const cells     = Array.from({ length: firstDay + totalDays }, (_, i) => {
    if (i < firstDay) return null;
    return i - firstDay + 1;
  });
  while (cells.length % 7 !== 0) cells.push(null);

  // Máximo de items visibles antes de mostrar "+X más"
  // La celda tiene scroll, pero también ofrecemos un indicador visual
  const MAX_VISIBLE = 5;

  return (
    <div className={`cm-cal-grid-wrap${selected ? ' has-panel' : ''}`}>
      {/* Cabeceras de días */}
      <div className="cm-cal-day-headers">
        {DAY_LABELS_SHORT.map(d => (
          <div key={d} className="cm-cal-day-header">{d}</div>
        ))}
      </div>

      {/* Celdas */}
      <div className="cm-cal-cells">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="cm-cal-cell empty" />;
          }
          const cellDate = new Date(year, month, day);
          const isToday  = sameDay(cellDate, today);
          const dayItems = visibleItems.filter(it => {
            const d = isoToDate(it.scheduled_at);
            return d && sameDay(d, cellDate);
          });

          return (
            <div
              key={day}
              className={`cm-cal-cell${isToday ? ' today' : ''}${dayItems.length > 0 ? ' has-items' : ''}`}
            >
              <span className={`cm-cal-day-num${isToday ? ' today' : ''}`}>{day}</span>
              <div className="cm-cal-cell-items">
                {dayItems.slice(0, MAX_VISIBLE).map(item => (
                  <CalendarItemBadge
                    key={item.id}
                    item={item}
                    onClick={setSelected}
                  />
                ))}
                {dayItems.length > MAX_VISIBLE && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', paddingLeft: '6px', flexShrink: 0 }}>
                    +{dayItems.length - MAX_VISIBLE} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista Semana ───────────────────────────────────────────────────────────────

function WeekView({ weekStart, visibleItems, today, setSelected }) {
  const cols = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="cm-cal-grid-wrap">
      <div className="cm-cal-week-grid">
        {cols.map((colDate, i) => {
          const isToday  = sameDay(colDate, today);
          const dayItems = visibleItems.filter(it => {
            const d = isoToDate(it.scheduled_at);
            return d && sameDay(d, colDate);
          });

          return (
            <div key={i} className="cm-cal-week-col">
              <div className={`cm-cal-week-col-header${isToday ? ' today' : ''}`}>
                <div className="cm-cal-week-day-name">{DAY_LABELS_SHORT[i]}</div>
                <div className={`cm-cal-week-day-num${isToday ? ' today' : ''}`}>
                  {colDate.getDate()}
                </div>
              </div>
              <div className="cm-cal-week-col-items">
                {dayItems.length === 0 ? (
                  <div className="cm-cal-week-empty">—</div>
                ) : (
                  dayItems.map(item => (
                    <CalendarItemBadge
                      key={item.id}
                      item={item}
                      onClick={setSelected}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista Día ──────────────────────────────────────────────────────────────────

function DayView({ dayDate, visibleItems, today, setSelected }) {
  const isToday  = sameDay(dayDate, today);
  const dayItems = visibleItems.filter(it => {
    const d = isoToDate(it.scheduled_at);
    return d && sameDay(d, dayDate);
  });

  const dayName = DAY_LABELS_FULL[
    dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1
  ];
  const dateLabel = dayDate.toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="cm-cal-day-view">
      <div className="cm-cal-day-view-header">
        <div className={`cm-cal-day-view-label${isToday ? ' today' : ''}`}>
          {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
        </div>
        {isToday && (
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', background: 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
            Hoy
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {dayItems.length} {dayItems.length === 1 ? 'pieza' : 'piezas'}
        </span>
      </div>

      {dayItems.length === 0 ? (
        <div className="cm-cal-day-empty">
          <WsIcon name="calendar" size={28} color="var(--text-muted)" />
          <p style={{ marginTop: '8px' }}>No hay piezas programadas para este día.</p>
        </div>
      ) : (
        <div className="cm-cal-day-view-items">
          {dayItems.map(item => {
            const ch     = item.channel ?? 'default';
            const color  = CHANNEL_COLORS[ch] ?? CHANNEL_COLORS.default;
            const chMeta = CHANNEL_MAP[ch];
            const statusCfg = ITEM_STATUS_COLORS[item.status] ?? { bg: '#f1f5f9', text: '#64748b', label: item.status };

            return (
              <div
                key={item.id}
                className="cm-cal-day-item-row"
                onClick={() => setSelected(item)}
              >
                {/* Icono de canal */}
                <div style={{
                  width: 32, height: 32, flexShrink: 0,
                  background: color + '18',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <WsIcon name={chMeta?.icon ?? 'file'} size={14} color={color} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title ?? '(Sin título)'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span className="cm-badge" style={{ background: statusCfg.bg, color: statusCfg.text, fontSize: '0.68rem', fontWeight: 600 }}>
                      {statusCfg.label}
                    </span>
                    {item.assigned_agent && (
                      <span className="cm-agent-badge" style={{ fontSize: '0.68rem' }}>{item.assigned_agent}</span>
                    )}
                    {item.scheduled_at && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <WsIcon name="clock" size={10} />
                        {new Date(item.scheduled_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Flecha */}
                <WsIcon name="chevron-right" size={14} color="var(--text-muted)" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

/**
 * CampaignCalendarView
 *
 * Modo global (sin props): fetches items desde la API para el mes visible.
 * Modo embedded (con externalItems): usa los items pasados como prop (sin fetch).
 *   - externalItems: array de campaign_items con campaign_title y campaign_id
 *   - campaignDateRange: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } para acotar la navegación
 */
export default function CampaignCalendarView({ externalItems = null, campaignDateRange = null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Si hay campaignDateRange, iniciar en el mes de start_date de la campaña
  const initialDate = campaignDateRange?.start ? new Date(campaignDateRange.start) : today;

  // Estado de navegación compartido
  const [cursorDate, setCursorDate] = useState(() => {
    const d = new Date(initialDate);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Vista activa: 'month' | 'week' | 'day'
  const [calView, setCalView] = useState('month');

  const [items, setItems]     = useState(externalItems ?? []);
  const [loading, setLoading] = useState(externalItems === null);
  const [selected, setSelected] = useState(null);
  const [filterChannel, setFilterChannel] = useState('all');

  // Derivados de cursorDate
  const year  = cursorDate.getFullYear();
  const month = cursorDate.getMonth();

  // Cuando externalItems cambia (e.g., nuevo item añadido), actualizar
  useEffect(() => {
    if (externalItems !== null) {
      setItems(externalItems);
      setLoading(false);
    }
  }, [externalItems]);

  useEffect(() => {
    if (externalItems === null) loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function loadItems() {
    setLoading(true);
    try {
      const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
      const endDate   = new Date(year, month + 1, 0).toISOString().slice(0, 10);

      const campaignsRes = await fetch(`${API_URL}/campaigns?limit=200`);
      const campaigns    = await campaignsRes.json().catch(() => []);
      const campaignMap  = Object.fromEntries(
        (Array.isArray(campaigns) ? campaigns : []).map(c => [c.id, c.title])
      );

      const itemsRes = await fetch(
        `${API_URL}/campaigns/calendar?start=${startDate}&end=${endDate}`
      );

      if (itemsRes.ok) {
        const data = await itemsRes.json().catch(() => []);
        setItems((Array.isArray(data) ? data : []).map(it => ({
          ...it,
          campaign_title: campaignMap[it.campaign_id] ?? '',
        })));
      } else {
        const allItems = [];
        for (const c of (Array.isArray(campaigns) ? campaigns.slice(0, 20) : [])) {
          const r = await fetch(`${API_URL}/campaigns/${c.id}/items`);
          if (r.ok) {
            const its = await r.json().catch(() => []);
            allItems.push(...(Array.isArray(its) ? its : []).map(it => ({
              ...it,
              campaign_id:    c.id,
              campaign_title: c.title,
            })));
          }
        }
        setItems(allItems.filter(it => {
          if (!it.scheduled_at) return false;
          const d = new Date(it.scheduled_at);
          return d.getFullYear() === year && d.getMonth() === month;
        }));
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Navegación (adaptada a la vista activa) ────────────────────────────────

  function goToday() {
    const d = new Date(today);
    setCursorDate(d);
    setSelected(null);
  }

  function goPrev() {
    setCursorDate(prev => {
      const d = new Date(prev);
      if (calView === 'month') {
        d.setDate(1);
        d.setMonth(d.getMonth() - 1);
      } else if (calView === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
    setSelected(null);
  }

  function goNext() {
    setCursorDate(prev => {
      const d = new Date(prev);
      if (calView === 'month') {
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
      } else if (calView === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
    setSelected(null);
  }

  // ─── Filtrado de items ──────────────────────────────────────────────────────

  const scheduledItems = externalItems !== null
    ? items.filter(it => !!it.scheduled_at)
    : items;

  const visibleItems = filterChannel === 'all'
    ? scheduledItems
    : scheduledItems.filter(it => it.channel === filterChannel);

  // Items sin programar (solo modo embedded)
  const unscheduledItems = externalItems !== null
    ? items.filter(it => !it.scheduled_at && (filterChannel === 'all' || it.channel === filterChannel))
    : [];

  // Items del mes visible (para empty state en embedded)
  const scheduledThisMonth = visibleItems.filter(it => {
    const d = isoToDate(it.scheduled_at);
    return d && d.getFullYear() === year && d.getMonth() === month;
  });

  // Canales presentes
  const channelsPresent = [...new Set(items.map(it => it.channel).filter(Boolean))];

  // ─── Label del periodo en toolbar ──────────────────────────────────────────

  function getPeriodLabel() {
    if (calView === 'month') {
      return `${MONTH_NAMES[month]} ${year}`;
    }
    if (calView === 'week') {
      const monday = getMondayOfWeek(cursorDate);
      const sunday = addDays(monday, 6);
      return `${formatDayLabel(monday)} – ${formatDayLabel(sunday)} ${sunday.getFullYear()}`;
    }
    // day
    return cursorDate.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="cm-calendar-wrap">

      {/* ── Toolbar ── */}
      <div className="cm-cal-toolbar">

        {/* Navegación + periodo */}
        <div className="cm-cal-nav">
          <button className="cm-cal-nav-btn" onClick={goPrev}>
            <WsIcon name="chevron-left" size={16} />
          </button>
          <span className="cm-cal-month-label">{getPeriodLabel()}</span>
          <button className="cm-cal-nav-btn" onClick={goNext}>
            <WsIcon name="chevron-right" size={16} />
          </button>
          <button className="cm-cal-today-btn" onClick={goToday}>
            Hoy
          </button>
        </div>

        {/* Toggle de vista — pill-style */}
        <div className="cm-cal-view-toggle">
          {[
            { id: 'month', label: 'Mes' },
            { id: 'week',  label: 'Semana' },
            { id: 'day',   label: 'Día' },
          ].map(v => (
            <button
              key={v.id}
              className={`cm-cal-view-btn${calView === v.id ? ' active' : ''}`}
              onClick={() => { setCalView(v.id); setSelected(null); }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Filtros por canal */}
        {channelsPresent.length > 0 && (
          <div className="cm-cal-channel-filters">
            <button
              className={`cm-cal-ch-filter ${filterChannel === 'all' ? 'active' : ''}`}
              onClick={() => setFilterChannel('all')}
            >
              Todos
            </button>
            {channelsPresent.map(ch => (
              <button
                key={ch}
                className={`cm-cal-ch-filter ${filterChannel === ch ? 'active' : ''}`}
                style={{ '--ch-color': CHANNEL_COLORS[ch] ?? CHANNEL_COLORS.default }}
                onClick={() => setFilterChannel(ch)}
              >
                <WsIcon name={CHANNEL_MAP[ch]?.icon ?? 'file'} size={11} color={filterChannel === ch ? '#fff' : (CHANNEL_COLORS[ch] ?? '#666')} />
                {CHANNEL_MAP[ch]?.label ?? ch}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Contenido principal ── */}
      {loading ? (
        <div className="cm-loading" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando calendario...
        </div>
      ) : (
        <div className="cm-cal-main">

          {/* Vistas */}
          {calView === 'month' && (
            <MonthView
              year={year}
              month={month}
              visibleItems={visibleItems}
              today={today}
              selected={selected}
              setSelected={setSelected}
            />
          )}

          {calView === 'week' && (
            <WeekView
              weekStart={getMondayOfWeek(cursorDate)}
              visibleItems={visibleItems}
              today={today}
              setSelected={setSelected}
            />
          )}

          {calView === 'day' && (
            <DayView
              dayDate={cursorDate}
              visibleItems={visibleItems}
              today={today}
              setSelected={setSelected}
            />
          )}

          {/* Panel de detalle (sidebar) */}
          {selected && (
            <ItemDetailPanel
              item={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      )}

      {/* ── Empty states ── */}
      {!loading && externalItems === null && items.length === 0 && (
        <div className="cm-empty" style={{ marginTop: '32px' }}>
          <div className="cm-empty-icon">
            <WsIcon name="calendar" size={40} color="var(--text-muted)" />
          </div>
          <h3 className="cm-empty-title">Sin piezas programadas</h3>
          <p className="cm-empty-desc">
            No hay piezas con fecha programada en {MONTH_NAMES[month]} {year}.<br />
            Asigna fechas a las piezas desde el detalle de cada campaña.
          </p>
        </div>
      )}

      {!loading && externalItems !== null && calView === 'month' && scheduledThisMonth.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No hay piezas programadas en {MONTH_NAMES[month]} {year}.
        </div>
      )}

      {/* ── Sin programar (embedded mode only) ── */}
      {externalItems !== null && unscheduledItems.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <WsIcon name="clock" size={12} color="var(--text-muted)" />
            SIN FECHA PROGRAMADA ({unscheduledItems.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {unscheduledItems.map(it => {
              const ch     = it.channel ?? 'default';
              const chMeta = CHANNEL_MAP[ch];
              const color  = CHANNEL_COLORS[ch] ?? CHANNEL_COLORS.default;
              const statusCfg = ITEM_STATUS_COLORS[it.status] ?? { bg: '#f1f5f9', text: '#64748b', label: it.status };
              return (
                <div
                  key={it.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderLeft: `3px solid ${color}`,
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                  }}
                >
                  <WsIcon name={chMeta?.icon ?? 'file'} size={13} color={color} />
                  <span style={{ flex: 1, color: 'var(--text-main)', fontWeight: 500 }}>{it.title ?? '(Sin título)'}</span>
                  <span className="cm-badge" style={{ background: statusCfg.bg, color: statusCfg.text, fontSize: '0.7rem' }}>
                    {statusCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
