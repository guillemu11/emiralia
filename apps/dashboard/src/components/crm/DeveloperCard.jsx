import React from 'react';
import { DEVELOPER_TIER, SUB_PLAN, fmtCurrency } from './crmConstants.js';

export default function DeveloperCard({ developer }) {
  const tier = DEVELOPER_TIER[developer.tier] ?? DEVELOPER_TIER.prospect;
  const plan = developer.subscription_plan ? SUB_PLAN[developer.subscription_plan] : null;

  const initials = (developer.company || developer.name || '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <div className="crm-dev-card">
      <div className="crm-dev-card-header">
        <div className="crm-dev-avatar">{initials}</div>
        <div>
          <div className="crm-dev-name">{developer.name}</div>
          <div className="crm-dev-company">{developer.company ?? '—'}</div>
        </div>
        <span className="crm-badge crm-tier-badge" style={{ background: tier.bg, color: tier.text }}>
          {tier.label}
        </span>
      </div>

      <div className="crm-dev-stats">
        <div className="crm-dev-stat">
          <span className="crm-dev-stat-label">MRR</span>
          <span className="crm-dev-stat-value">
            {developer.subscription_mrr ? fmtCurrency(developer.subscription_mrr) : '—'}
          </span>
        </div>
        <div className="crm-dev-stat">
          <span className="crm-dev-stat-label">Leads</span>
          <span className="crm-dev-stat-value">{developer.leads_assigned ?? 0}</span>
        </div>
        <div className="crm-dev-stat">
          <span className="crm-dev-stat-label">Plan</span>
          <span className="crm-dev-stat-value" style={plan ? { color: plan.color } : {}}>
            {plan?.label ?? '—'}
          </span>
        </div>
      </div>

      {developer.email && (
        <div className="crm-dev-email">{developer.email}</div>
      )}
    </div>
  );
}
