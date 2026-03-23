import React from 'react';
import { fmtCurrency, fmtDate } from './crmConstants.js';

export default function DealCard({ deal, onMoveStage }) {
  return (
    <div className="crm-deal-card">
      <div className="crm-deal-title">{deal.title}</div>

      {deal.developer_name && (
        <div className="crm-deal-developer">{deal.developer_company || deal.developer_name}</div>
      )}

      <div className="crm-deal-value">{fmtCurrency(deal.value)}</div>

      {/* Probability bar */}
      <div className="crm-deal-prob-wrap">
        <div className="crm-deal-prob-bar">
          <div
            className="crm-deal-prob-fill"
            style={{ width: `${deal.probability ?? 0}%` }}
          />
        </div>
        <span className="crm-deal-prob-label">{deal.probability ?? 0}%</span>
      </div>

      {deal.assigned_to && (
        <div className="crm-deal-assigned">{deal.assigned_to}</div>
      )}

      <div className="crm-deal-date">{fmtDate(deal.created_at)}</div>
    </div>
  );
}
