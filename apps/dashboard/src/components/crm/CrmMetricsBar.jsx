import React from 'react';
import { fmtCurrency } from './crmConstants.js';

export default function CrmMetricsBar({ metrics }) {
  if (!metrics) return <div className="crm-metrics-bar crm-metrics-loading">Cargando métricas...</div>;

  const pills = [
    { label: 'MRR',            value: fmtCurrency(metrics.mrr),           color: 'green' },
    { label: 'ARR',            value: fmtCurrency(metrics.arr),           color: 'blue' },
    { label: 'Pipeline',       value: fmtCurrency(metrics.pipeline_value), color: 'purple' },
    { label: 'Leads esta sem', value: metrics.leads_this_week ?? 0,        color: 'amber' },
  ];

  return (
    <div className="crm-metrics-bar">
      {pills.map(p => (
        <div key={p.label} className={`crm-metric-pill crm-metric-pill--${p.color}`}>
          <span className="crm-metric-value">{p.value}</span>
          <span className="crm-metric-label">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
