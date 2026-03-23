import React, { useState, useEffect } from 'react';
import { API_URL } from '../api.js';
import CrmMetricsBar from '../components/crm/CrmMetricsBar.jsx';
import LeadsTable from '../components/crm/LeadsTable.jsx';
import DeveloperGrid from '../components/crm/DeveloperGrid.jsx';
import PipelineKanban from '../components/crm/PipelineKanban.jsx';
import RevenueView from '../components/crm/RevenueView.jsx';
import CommTimeline from '../components/crm/CommTimeline.jsx';

const TABS = [
  { id: 'leads',         label: 'Leads' },
  { id: 'developers',   label: 'Developers' },
  { id: 'pipeline',     label: 'Pipeline' },
  { id: 'revenue',      label: 'Revenue' },
  { id: 'communications', label: 'Comunicaciones' },
];

export default function CRM() {
  const [activeTab, setActiveTab] = useState('leads');
  const [metrics, setMetrics]     = useState(null);
  const [leads, setLeads]         = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [deals, setDeals]         = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [mRes, lRes, dRes, deRes, sRes, cRes] = await Promise.all([
        fetch(`${API_URL}/crm/metrics`),
        fetch(`${API_URL}/leads`),
        fetch(`${API_URL}/crm/developers`),
        fetch(`${API_URL}/crm/deals`),
        fetch(`${API_URL}/crm/subscriptions`),
        fetch(`${API_URL}/crm/communications`),
      ]);

      const [m, l, d, de, s, c] = await Promise.all([
        mRes.json(), lRes.json(), dRes.json(), deRes.json(), sRes.json(), cRes.json(),
      ]);

      setMetrics(m);
      setLeads(Array.isArray(l) ? l : []);
      setDevelopers(Array.isArray(d) ? d : []);
      setDeals(Array.isArray(de) ? de : []);
      setSubscriptions(Array.isArray(s) ? s : []);
      setCommunications(Array.isArray(c) ? c : []);
    } catch (err) {
      console.error('CRM fetchAll error:', err);
    } finally {
      setLoading(false);
    }
  }

  function renderTab() {
    if (loading) return <div className="crm-loading">Cargando datos...</div>;

    switch (activeTab) {
      case 'leads':
        return <LeadsTable leads={leads} onRefresh={fetchAll} />;
      case 'developers':
        return <DeveloperGrid developers={developers} onRefresh={fetchAll} />;
      case 'pipeline':
        return <PipelineKanban deals={deals} onRefresh={fetchAll} />;
      case 'revenue':
        return <RevenueView metrics={metrics} subscriptions={subscriptions} />;
      case 'communications':
        return <CommTimeline communications={communications} onRefresh={fetchAll} />;
      default:
        return null;
    }
  }

  return (
    <div className="crm-page animate-fade-in">
      {/* Header */}
      <div className="crm-header">
        <div className="crm-header-left">
          <h1 className="crm-title">CRM Emiralia</h1>
          <p className="crm-subtitle">Pipeline B2B · Leads de inversores · Revenue tracking</p>
        </div>
        <div className="crm-header-right">
          <button className="crm-btn-ghost" onClick={fetchAll}>↻ Refresh</button>
        </div>
      </div>

      {/* Metrics bar */}
      <CrmMetricsBar metrics={metrics} />

      {/* Tabs */}
      <div className="crm-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`crm-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === 'leads' && leads.length > 0 && (
              <span className="crm-tab-count">{leads.length}</span>
            )}
            {t.id === 'pipeline' && deals.length > 0 && (
              <span className="crm-tab-count">{deals.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="crm-content">
        {renderTab()}
      </div>
    </div>
  );
}
