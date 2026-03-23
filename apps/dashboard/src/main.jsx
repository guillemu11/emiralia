import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import Layout from './components/Layout.jsx'
import App from './App.jsx'
import WorkspaceOverview from './pages/WorkspaceOverview.jsx'
import DepartmentDetail from './pages/DepartmentDetail.jsx'
import AgentDetail from './pages/AgentDetail.jsx'
import WeeklyBoard from './pages/WeeklyBoard.jsx'
import DailyStandup from './pages/DailyStandup.jsx'

import AuditLog from './pages/AuditLog.jsx'
import IntelligenceHub from './pages/IntelligenceHub.jsx'
import PmReports from './pages/PmReports.jsx'
import Inbox from './pages/Inbox.jsx'
import WorkflowsHub from './pages/WorkflowsHub.jsx'
import SkillUsageTracker from './pages/SkillUsageTracker.jsx'
import CreativeStudio from './pages/CreativeStudio.jsx'
import CampaignManager from './pages/CampaignManager.jsx'
import CampaignDetail from './pages/CampaignDetail.jsx'
import CRM from './pages/CRM.jsx'

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          <h2 style={{ color: '#0f172a' }}>Algo salio mal</h2>
          <pre style={{ color: '#ef4444', fontSize: '0.85rem' }}>{this.state.error?.message}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 24px', borderRadius: '9999px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<App />} />
            <Route path="/workspace" element={<WorkspaceOverview />} />
            <Route path="/workspace/:deptId" element={<DepartmentDetail />} />
            <Route path="/workspace/:deptId/weekly" element={<WeeklyBoard />} />
            <Route path="/workspace/:deptId/daily" element={<DailyStandup />} />

            <Route path="/workflows" element={<WorkflowsHub />} />
            <Route path="/skills" element={<SkillUsageTracker />} />
            <Route path="/workspace/audit" element={<AuditLog />} />
            <Route path="/workspace/intelligence" element={<IntelligenceHub />} />
            <Route path="/workspace/agent/:agentId" element={<AgentDetail />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/pm-reports" element={<PmReports />} />
            <Route path="/creative-studio" element={<CreativeStudio />} />
            <Route path="/campaign-manager" element={<CampaignManager />} />
            <Route path="/campaign-manager/:id" element={<CampaignDetail />} />
            <Route path="/crm" element={<CRM />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
)
