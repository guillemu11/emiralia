import React from 'react';
import { fmtCurrency, fmtDate, SUB_PLAN, DEVELOPER_TIER } from './crmConstants.js';

export default function RevenueView({ metrics, subscriptions = [], assignments = [] }) {
  const mrr = parseFloat(metrics?.mrr ?? 0);
  const arr = parseFloat(metrics?.arr ?? 0);
  const pipeline = parseFloat(metrics?.pipeline_value ?? 0);

  // Commission totals from assignments (passed as prop if available)
  const pendingComm = assignments.filter(a => a.status === 'pending').reduce((s, a) => s + parseFloat(a.commission_amount ?? 0), 0);

  return (
    <div className="crm-revenue-view">
      {/* KPI cards */}
      <div className="crm-revenue-kpis">
        <div className="crm-revenue-kpi">
          <span className="crm-revenue-kpi-value crm-kpi-green">{fmtCurrency(mrr)}</span>
          <span className="crm-revenue-kpi-label">MRR</span>
        </div>
        <div className="crm-revenue-kpi">
          <span className="crm-revenue-kpi-value crm-kpi-blue">{fmtCurrency(arr)}</span>
          <span className="crm-revenue-kpi-label">ARR</span>
        </div>
        <div className="crm-revenue-kpi">
          <span className="crm-revenue-kpi-value crm-kpi-purple">{fmtCurrency(pipeline)}</span>
          <span className="crm-revenue-kpi-label">Pipeline Value</span>
        </div>
        <div className="crm-revenue-kpi">
          <span className="crm-revenue-kpi-value crm-kpi-amber">{fmtCurrency(pendingComm)}</span>
          <span className="crm-revenue-kpi-label">Comisiones Pend.</span>
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="crm-section-title">Subscripciones Activas</div>
      {subscriptions.length === 0 ? (
        <div className="crm-empty">No hay subscripciones activas todavía</div>
      ) : (
        <table className="crm-table">
          <thead>
            <tr>
              <th>Developer</th>
              <th>Plan</th>
              <th>MRR</th>
              <th>Estado</th>
              <th>Inicio</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(s => {
              const plan = SUB_PLAN[s.plan] ?? { label: s.plan, color: '#64748b' };
              return (
                <tr key={s.id}>
                  <td>{s.developer_name ?? '—'}</td>
                  <td><span style={{ color: plan.color, fontWeight: 600 }}>{plan.label}</span></td>
                  <td className="crm-td-value">{fmtCurrency(s.mrr, s.currency)}</td>
                  <td>
                    <span className={`crm-badge crm-badge-sub-${s.status}`}>{s.status}</span>
                  </td>
                  <td className="crm-td-date">{fmtDate(s.start_date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
