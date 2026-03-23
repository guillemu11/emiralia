import React, { useState, useEffect } from 'react';
import { API_URL } from '../api.js';
import CampaignList from '../components/campaign/CampaignList.jsx';
import CampaignWizard from '../components/campaign/CampaignWizard.jsx';
import CampaignCalendarView from '../components/campaign/CampaignCalendarView.jsx';
import WsIcon from '../components/workspace/WsIcon.jsx';

const TABS = [
  { id: 'campaigns', label: 'Campañas' },
  { id: 'calendar',  label: 'Calendario' },
];

// ─── Stats Pills ──────────────────────────────────────────────────────────────

function StatsPills({ stats }) {
  if (!stats) return null;
  const { campaigns: c = {}, items: it = {}, budget: b = {} } = stats;
  return (
    <div className="cm-stats-pills">
      <div className="cm-stat-pill">
        <span className="cm-stat-value">{c.total ?? 0}</span>
        <span className="cm-stat-label">Campañas</span>
      </div>
      <div className="cm-stat-pill">
        <span className="cm-stat-value" style={{ color: 'var(--theme-green)' }}>{c.by_status?.active ?? 0}</span>
        <span className="cm-stat-label">Activas</span>
      </div>
      <div className="cm-stat-pill">
        <span className="cm-stat-value">{it.total ?? 0}</span>
        <span className="cm-stat-label">Piezas</span>
      </div>
      <div className="cm-stat-pill">
        <span className="cm-stat-value" style={{ color: 'var(--theme-purple)' }}>{it.by_status?.pending_review ?? 0}</span>
        <span className="cm-stat-label">En revisión</span>
      </div>
      <div className="cm-stat-pill">
        <span className="cm-stat-value">${Number(b.total_allocated ?? 0).toLocaleString()}</span>
        <span className="cm-stat-label">Budget total</span>
      </div>
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampaignManager() {
  const [activeTab, setActiveTab]     = useState('campaigns');
  const [campaigns, setCampaigns]     = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showWizard, setShowWizard]   = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`${API_URL}/campaigns`),
        fetch(`${API_URL}/campaigns/stats`),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      setCampaigns(Array.isArray(cData) ? cData : []);
      setStats(sData);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setShowWizard(true);
  }

  return (
    <div className="cm-page animate-fade-in">

      {/* ── Header ── */}
      <div className="cm-header">
        <div className="cm-header-left">
          <h1 className="cm-title">
            <span className="cm-title-icon"><WsIcon name="target" size={20} /></span>
            Campaign Manager
          </h1>
          <p className="subtitle">Hub de orquestación multi-agente — blog · social · paid · email</p>
        </div>
        <div className="cm-header-right">
          <StatsPills stats={stats} />
          <button className="cm-btn-primary" onClick={handleNew}>
            + Nueva Campaña
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="cm-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`cm-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {activeTab === 'campaigns' && (
        <CampaignList
          campaigns={campaigns}
          loading={loading}
          onNew={handleNew}
        />
      )}
      {activeTab === 'calendar' && <CampaignCalendarView />}

      {/* ── Campaign Wizard ── */}
      <CampaignWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={fetchData}
      />
    </div>
  );
}
