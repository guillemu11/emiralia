import React from 'react';
import { ITEM_STATUS_COLORS } from './campaignConstants.js';

// ─── KPI Bar: 6 pills de estado de items ─────────────────────────────────────

const PILLS = [
  {
    key: 'total',
    label: 'Total',
    style: { bg: 'var(--bg-card)', text: 'var(--text-main)' },
    count: items => items.length,
  },
  {
    key: 'pending',
    label: 'Pendiente',
    style: ITEM_STATUS_COLORS.pending,
    count: items => items.filter(i => i.status === 'pending').length,
  },
  {
    key: 'producing',
    label: 'Produciendo',
    style: ITEM_STATUS_COLORS.producing,
    count: items => items.filter(i => i.status === 'producing' || i.status === 'briefing').length,
  },
  {
    key: 'pending_review',
    label: 'En Revision',
    style: ITEM_STATUS_COLORS.pending_review,
    count: items => items.filter(i => i.status === 'pending_review').length,
  },
  {
    key: 'approved_scheduled',
    label: 'Aprobado / Prog.',
    style: ITEM_STATUS_COLORS.approved,
    count: items => items.filter(i => i.status === 'approved' || i.status === 'scheduled').length,
  },
  {
    key: 'published',
    label: 'Publicado',
    style: ITEM_STATUS_COLORS.published,
    count: items => items.filter(i => i.status === 'published').length,
  },
];

export default function CampaignKPIBar({ items = [] }) {
  return (
    <div className="cm-kpi-bar">
      {PILLS.map(pill => {
        const count = pill.count(items);
        const bg   = pill.style?.bg   ?? 'var(--bg-card)';
        const text = pill.style?.text ?? 'var(--text-main)';
        return (
          <div
            key={pill.key}
            className="cm-kpi-pill"
            style={{ borderColor: text + '33' }}
          >
            <span className="cm-kpi-value" style={{ color: count > 0 ? text : 'var(--text-muted)' }}>
              {count}
            </span>
            <span className="cm-kpi-label">{pill.label}</span>
          </div>
        );
      })}
    </div>
  );
}
