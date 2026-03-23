import React, { useState } from 'react';
import DealCard from './DealCard.jsx';
import { DEAL_STAGES, DEAL_STAGE_COLORS, fmtCurrency } from './crmConstants.js';
import { API_URL } from '../../api.js';

export default function PipelineKanban({ deals = [], onRefresh }) {
  const [showNewDeal, setShowNewDeal] = useState(null); // stage id
  const [form, setForm] = useState({ title: '', value: '' });
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(null);

  // Group deals by stage
  const byStage = {};
  DEAL_STAGES.forEach(s => { byStage[s.id] = []; });
  deals.forEach(d => {
    if (byStage[d.stage]) byStage[d.stage].push(d);
  });

  // Stage totals
  function stageTotal(stageId) {
    return byStage[stageId].reduce((s, d) => s + parseFloat(d.value || 0), 0);
  }

  async function handleCreateDeal(stageId) {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/crm/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, stage: stageId, value: parseFloat(form.value) || 0 }),
      });
      setShowNewDeal(null);
      setForm({ title: '', value: '' });
      onRefresh?.();
    } finally {
      setSaving(false);
    }
  }

  async function moveNext(deal) {
    const stageOrder = DEAL_STAGES.map(s => s.id);
    const currentIdx = stageOrder.indexOf(deal.stage);
    if (currentIdx < 0) return;

    // Find valid next stages (not won/lost for simple next)
    const nextStages = {
      prospecting:    'contacted',
      contacted:      'demo_scheduled',
      demo_scheduled: 'proposal_sent',
      proposal_sent:  'negotiation',
      negotiation:    'closed_won',
    };
    const next = nextStages[deal.stage];
    if (!next) return;

    setMoving(deal.id);
    try {
      await fetch(`${API_URL}/crm/deals/${deal.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: next }),
      });
      onRefresh?.();
    } finally {
      setMoving(null);
    }
  }

  return (
    <div className="crm-kanban-board">
      {DEAL_STAGES.map(stage => {
        const cfg = DEAL_STAGE_COLORS[stage.id];
        const stageDeals = byStage[stage.id] ?? [];

        return (
          <div key={stage.id} className="crm-kanban-column">
            {/* Column header */}
            <div className="crm-kanban-col-header">
              <span className="crm-kanban-col-label" style={{ color: cfg.text }}>{stage.label}</span>
              <span className="crm-kanban-col-count">{stageDeals.length}</span>
            </div>
            <div className="crm-kanban-col-total">{fmtCurrency(stageTotal(stage.id))}</div>

            {/* Deal cards */}
            <div className="crm-kanban-cards">
              {stageDeals.map(deal => (
                <div
                  key={deal.id}
                  className={`crm-deal-card-wrap ${moving === deal.id ? 'crm-deal-moving' : ''}`}
                >
                  <DealCard deal={deal} />
                  {!['closed_won', 'closed_lost'].includes(deal.stage) && (
                    <button
                      className="crm-deal-advance-btn"
                      onClick={() => moveNext(deal)}
                      disabled={moving === deal.id}
                      title="Avanzar al siguiente stage"
                    >
                      →
                    </button>
                  )}
                </div>
              ))}

              {/* Add deal button */}
              {showNewDeal === stage.id ? (
                <div className="crm-deal-new-form">
                  <input
                    className="crm-input crm-input-sm"
                    placeholder="Nombre del deal"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    autoFocus
                  />
                  <input
                    className="crm-input crm-input-sm"
                    type="number"
                    placeholder="Valor USD"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  />
                  <div className="crm-deal-new-actions">
                    <button
                      className="crm-btn-primary crm-btn-sm"
                      onClick={() => handleCreateDeal(stage.id)}
                      disabled={saving}
                    >
                      {saving ? '...' : 'Crear'}
                    </button>
                    <button
                      className="crm-btn-ghost crm-btn-sm"
                      onClick={() => { setShowNewDeal(null); setForm({ title: '', value: '' }); }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="crm-kanban-add-btn"
                  onClick={() => setShowNewDeal(stage.id)}
                >
                  + Deal
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
