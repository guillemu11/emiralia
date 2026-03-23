import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import DepartmentKanban from './components/DepartmentKanban';
import StatsCard from './components/StatsCard';
import AddWidgetModal from './components/AddWidgetModal';
import { useLanguage } from './i18n/LanguageContext.jsx';
import { API_URL } from './api.js';

const STATUS_COLORS = {
  'Planning':    '#3b82f6',
  'In Progress': '#10b981',
  'Completed':   '#a855f7',
  'Paused':      '#f59e0b',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444'];

function DashboardHome({ projects, onProjectClick, onCreateProject, onViewAll, onViewKanban }) {
  const [agents, setAgents]         = useState([]);
  const [trends, setTrends]         = useState([]);
  const [skillsStats, setSkillsStats] = useState(null);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/agents`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/eod-reports/trends`).then(r => r.json()).catch(() => []),
      fetch(`${API_URL}/skills/stats`).then(r => r.json()).catch(() => null),
    ]).then(([agentsData, trendsData, statsData]) => {
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      setTrends(Array.isArray(trendsData) ? trendsData : []);
      setSkillsStats(statsData);
      setDashLoading(false);
    });
  }, []);

  // KPI computations
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;
  const activeAgents   = agents.filter(a => a.status === 'active').length || agents.length;
  const lastTrend      = trends[trends.length - 1] || {};
  const tasksToday     = lastTrend.completed_tasks ?? lastTrend.completedTasks ?? '—';
  const skillsToday    = skillsStats?.total_today ?? skillsStats?.totalToday ?? '—';

  // PieChart data from projects
  const statusMap = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Table: 5 most recent projects
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 5);

  // Area chart: normalize field names
  const chartData = trends.slice(-14).map(d => ({
    date:     (d.date || '').slice(5),          // MM-DD
    Tareas:   d.completed_tasks ?? d.completedTasks ?? 0,
    Bloqueadores: d.blockers ?? d.blockerCount ?? 0,
  }));

  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="dashboard-home">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <span className="page-date">
            Ene 1, 2026 — {today} &nbsp;·&nbsp; Últimos 30 días
          </span>
        </div>
        <div className="page-actions">
          <button className="btn-add-widget" onClick={() => setShowWidgetModal(true)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{marginRight:6}}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Widget
          </button>
          <button className="btn-export">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{marginRight:6}}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button className="btn-export" onClick={onViewKanban}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{marginRight:6}}>
              <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/>
            </svg>
            Kanban
          </button>
          <button className="back-button" style={{margin:0}} onClick={onCreateProject}>
            + Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="stats-row">
        <StatsCard
          label="Proyectos Activos"
          value={activeProjects}
          change={`${projects.length} total`}
          changeType="neutral"
          icon="projects"
          color="#3b82f6"
        />
        <StatsCard
          label="Agentes Activos"
          value={dashLoading ? '…' : activeAgents}
          change={`${agents.length} registrados`}
          changeType="neutral"
          icon="agents"
          color="#10b981"
        />
        <StatsCard
          label="Skills Hoy"
          value={dashLoading ? '…' : skillsToday}
          change="invocaciones"
          changeType="up"
          icon="skills"
          color="#a855f7"
        />
        <StatsCard
          label="Tareas Completadas"
          value={dashLoading ? '…' : tasksToday}
          change="ayer"
          changeType={tasksToday > 0 ? 'up' : 'neutral'}
          icon="tasks"
          color="#f59e0b"
        />
      </div>

      {/* Main grid */}
      <div className="dashboard-grid">
        {/* Left column */}
        <div className="dashboard-col-main">

          {/* Area chart — team activity */}
          <div className="card chart-card">
            <div className="chart-header">
              <div>
                <h2 className="chart-title">Actividad del Equipo</h2>
                <p className="chart-sub">Tareas completadas y bloqueadores — últimas 2 semanas</p>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTareas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBloq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}/>
                  <Area type="monotone" dataKey="Tareas" stroke="#3b82f6" strokeWidth={2} fill="url(#colorTareas)"/>
                  <Area type="monotone" dataKey="Bloqueadores" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#colorBloq)"/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Sin datos de actividad aún</div>
            )}
          </div>

          {/* Recent projects table */}
          <div className="card">
            <div className="chart-header" style={{ marginBottom: 16 }}>
              <h2 className="chart-title">Proyectos Recientes</h2>
              <button className="link-btn" onClick={onViewAll}>Ver todos →</button>
            </div>
            <div className="projects-table-wrap">
              <table className="projects-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Departamento</th>
                    <th>Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map(p => (
                    <tr key={p.id} onClick={() => onProjectClick(p.id)} className="table-row-clickable">
                      <td className="table-name">{p.name}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: (STATUS_COLORS[p.status] || '#3b82f6') + '18',
                            color: STATUS_COLORS[p.status] || '#3b82f6',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="table-dept">{p.department}</td>
                      <td className="table-date">
                        {new Date(p.updated_at || p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                  {recentProjects.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px' }}>Sin proyectos aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="dashboard-col-side">

          {/* Pie chart — project status */}
          <div className="card">
            <h2 className="chart-title" style={{ marginBottom: 12 }}>Distribución por Estado</h2>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((entry, i) => (
                    <div key={i} className="pie-legend-item">
                      <span className="pie-dot" style={{ background: STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="pie-label">{entry.name}</span>
                      <span className="pie-val">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="chart-empty">Sin proyectos</div>
            )}
          </div>

          {/* Most active day (bar chart from trends) */}
          <div className="card">
            <h2 className="chart-title" style={{ marginBottom: 4 }}>Actividad Diaria</h2>
            <p className="chart-sub" style={{ marginBottom: 12 }}>Tareas por día (últimos 7 días)</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData.slice(-7)} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}/>
                  <Bar dataKey="Tareas" fill="#3b82f6" radius={[4,4,0,0]}>
                    {chartData.slice(-7).map((entry, i, arr) => {
                      const maxVal = Math.max(...arr.map(d => d.Tareas));
                      return <Cell key={i} fill={entry.Tareas === maxVal ? '#3b82f6' : '#bfdbfe'}/>;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Sin datos</div>
            )}
          </div>

        </div>
      </div>

      {showWidgetModal && (
        <AddWidgetModal
          onClose={() => setShowWidgetModal(false)}
          onAdd={(id) => console.log('Widget added:', id)}
        />
      )}
    </div>
  );
}

// ─── Componentes de Bloque ───────────────────────────────────────────────────

const TextBlock = ({ content }) => (
  <div className="block-text card-sub">
    <p>{content}</p>
  </div>
);

const CalloutBlock = ({ title, content }) => (
  <div className="block-callout animate-fade-in">
    <div className="callout-title">{title}</div>
    <div className="callout-body">{content}</div>
  </div>
);

const MetricBlock = ({ items }) => (
  <div className="metric-grid">
    {items.map((m, i) => (
      <div key={i} className="metric-item">
        <span className="metric-label">{m.label}</span>
        <span className="metric-value">{m.value}</span>
      </div>
    ))}
  </div>
);

const LinkListBlock = ({ title, links }) => (
  <div className="link-list-block card-sub">
    <h3>{title}</h3>
    <div className="links-container">
      {links.map((l, i) => (
        <a key={i} href={l.url} target="_blank" rel="noreferrer" className="link-item">
          {l.label} ↗
        </a>
      ))}
    </div>
  </div>
);

const BlockRenderer = ({ blocks, editMode, onMove, onDelete, onChange }) => {
  if (!blocks || !Array.isArray(blocks)) return null;
  return blocks.map((block, i) => {
    const Component = (() => {
      switch (block.type) {
        case 'text': return <TextBlock {...block} />;
        case 'callout': return <CalloutBlock {...block} />;
        case 'metric_grid': return <MetricBlock {...block} />;
        case 'link_list': return <LinkListBlock {...block} />;
        default: return null;
      }
    })();

    if (!Component) return null;

    return (
      <div key={i} className={`block-wrapper ${editMode ? 'edit-active' : ''}`}>
        {editMode && (
          <div className="block-controls">
            <button onClick={() => onMove(i, -1)} disabled={i === 0}>↑</button>
            <button onClick={() => onMove(i, 1)} disabled={i === blocks.length - 1}>↓</button>
            <button onClick={() => onDelete(i)} className="btn-danger">×</button>
          </div>
        )}
        {editMode && block.type === 'text' ? (
          <textarea
            className="edit-input-inline"
            value={block.content}
            onChange={(e) => onChange(i, { ...block, content: e.target.value })}
          />
        ) : Component}
      </div>
    );
  });
};

function App() {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchProjects();
  }, []);

  // Re-sync projects when switching back to grid (kanban may have changed statuses)
  useEffect(() => {
    if (viewMode === 'grid') {
      fetchProjects();
    }
  }, [viewMode]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetail = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects/${id}`);
      const data = await res.json();
      setSelectedProject(data);
      setEditMode(false);
    } catch (err) {
      console.error('Error fetching project detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${t('dashboard.newProjectName')} 🏗️`, problem: t('dashboard.describeProblem'), solution: t('dashboard.describeSolution') })
      });
      const newProj = await res.json();
      setProjects([newProj, ...projects]);
      fetchProjectDetail(newProj.id);
    } catch (err) {
      alert(t('dashboard.errorCreating'));
    }
  };

  const saveProject = async () => {
    try {
      await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedProject)
      });
      setEditMode(false);
      fetchProjects();
    } catch (err) {
      alert(t('dashboard.errorSaving'));
    }
  };

  const deleteProject = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm(t('dashboard.confirmDelete'))) return;
    try {
      await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
      if (selectedProject?.id === id) setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      alert(t('dashboard.errorDeleting'));
    }
  };

  const handleBlockMove = (index, direction) => {
    const newBlocks = [...selectedProject.blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(index + direction, 0, moved);
    setSelectedProject({ ...selectedProject, blocks: newBlocks });
  };

  const handleBlockDelete = (index) => {
    const newBlocks = selectedProject.blocks.filter((_, i) => i !== index);
    setSelectedProject({ ...selectedProject, blocks: newBlocks });
  };

  const handleBlockChange = (index, newData) => {
    const newBlocks = [...selectedProject.blocks];
    newBlocks[index] = newData;
    setSelectedProject({ ...selectedProject, blocks: newBlocks });
  };

  const addBlock = (type) => {
    const newBlock = { type, content: t('dashboard.newBlock'), title: t('dashboard.blockTitle'), items: [], links: [] };
    setSelectedProject({ ...selectedProject, blocks: [...(selectedProject.blocks || []), newBlock] });
  };

  const getDeptTheme = (dept) => {
    const themes = {
      'Data': 'theme-green',
      'Dev': 'theme-cyan',
      'SEO': 'theme-amber',
      'Content': 'theme-amber',
      'Marketing': 'theme-rose',
      'Sales': 'theme-rose',
      'Product': 'theme-purple',
      'Design': 'theme-indigo',
      'Wellness': 'theme-emerald',
      'Real Estate': 'theme-emerald'
    };
    return themes[dept] || 'theme-blue';
  };

  const departments = ['General', 'Data', 'SEO', 'Dev', 'Content', 'Sales', 'Marketing', 'Design', 'Product'];

  if (selectedProject) {
    const themeClass = getDeptTheme(selectedProject.department);
    return (
      <div className={`dashboard-container animate-fade-in ${themeClass}`}>
        <button className="back-button" onClick={() => setSelectedProject(null)}>
          ← {t('dashboard.backToProjects')}
        </button>

        <header>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="status-badge">{selectedProject.status}</span>
              {editMode ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="edit-select"
                    placeholder={t('dashboard.department')}
                    value={selectedProject.department}
                    onChange={e => setSelectedProject({ ...selectedProject, department: e.target.value })}
                    style={{ borderRadius: '8px' }}
                  />
                  <input
                    className="edit-select"
                    placeholder={t('dashboard.subArea')}
                    value={selectedProject.sub_area}
                    onChange={e => setSelectedProject({ ...selectedProject, sub_area: e.target.value })}
                    style={{ borderRadius: '8px' }}
                  />
                </div>
              ) : (
                <>
                  <span className="dept-badge">{selectedProject.department}</span>
                  <span className="dept-badge" style={{ opacity: 0.7, background: '#f1f5f9', color: '#64748b' }}>
                    {selectedProject.sub_area}
                  </span>
                </>
              )}
            </div>
            {editMode ? (
              <input
                className="edit-title"
                value={selectedProject.name}
                onChange={e => setSelectedProject({ ...selectedProject, name: e.target.value })}
              />
            ) : (
              <h1>{selectedProject.name}</h1>
            )}
            {editMode ? (
              <textarea
                className="edit-subtitle-full"
                value={selectedProject.problem}
                onChange={e => setSelectedProject({ ...selectedProject, problem: e.target.value })}
              />
            ) : (
              <p className="subtitle" style={{ marginTop: '20px' }}>{selectedProject.problem}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {editMode ? (
              <button className="back-button save-btn" onClick={saveProject}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{marginRight:6,verticalAlign:'middle'}}><polyline points="20 6 9 17 4 12"/></svg>
                {t('dashboard.save')}
              </button>
            ) : (
              <button className="back-button" onClick={() => setEditMode(true)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{marginRight:6,verticalAlign:'middle'}}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                {t('dashboard.edit')}
              </button>
            )}
            <button className="back-button delete-btn" onClick={() => deleteProject(selectedProject.id)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{marginRight:6,verticalAlign:'middle'}}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              {t('dashboard.delete')}
            </button>
          </div>
        </header>

        <section className="card" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', background: 'var(--primary-soft)', border: '1px solid var(--primary-trans)' }}>
          <div className="metric-item" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            <span className="metric-label">{t('dashboard.estimatedBudget')}</span>
            {editMode ? (
              <input
                type="number"
                className="edit-input-inline"
                value={selectedProject.estimated_budget}
                onChange={e => setSelectedProject({ ...selectedProject, estimated_budget: parseFloat(e.target.value) })}
              />
            ) : (
              <span className="metric-value">{selectedProject.estimated_budget}€</span>
            )}
          </div>
          <div className="metric-item" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            <span className="metric-label">{t('dashboard.estimatedTimeline')}</span>
            {editMode ? (
              <input
                className="edit-input-inline"
                value={selectedProject.estimated_timeline}
                onChange={e => setSelectedProject({ ...selectedProject, estimated_timeline: e.target.value })}
              />
            ) : (
              <span className="metric-value">{selectedProject.estimated_timeline}</span>
            )}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          <section className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-red)', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {t('dashboard.painPoints')}
            </h3>
            {editMode ? (
              <textarea
                className="edit-textarea"
                placeholder={t('dashboard.painPointsPlaceholder')}
                value={Array.isArray(selectedProject.pain_points) ? selectedProject.pain_points.join('\n') : ''}
                onChange={e => setSelectedProject({ ...selectedProject, pain_points: e.target.value.split('\n') })}
              />
            ) : (
              <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>
                {selectedProject.pain_points?.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </section>

          <section className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              {t('dashboard.requirements')}
            </h3>
            {editMode ? (
              <textarea
                className="edit-textarea"
                placeholder={t('dashboard.requirementsPlaceholder')}
                value={Array.isArray(selectedProject.requirements) ? selectedProject.requirements.join('\n') : ''}
                onChange={e => setSelectedProject({ ...selectedProject, requirements: e.target.value.split('\n') })}
              />
            ) : (
              <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>
                {selectedProject.requirements?.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </section>

          <section className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-yellow)', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {t('dashboard.risks')}
            </h3>
            {editMode ? (
              <textarea
                className="edit-textarea"
                placeholder={t('dashboard.risksPlaceholder')}
                value={Array.isArray(selectedProject.risks) ? selectedProject.risks.join('\n') : ''}
                onChange={e => setSelectedProject({ ...selectedProject, risks: e.target.value.split('\n') })}
              />
            ) : (
              <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>
                {selectedProject.risks?.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </section>
        </div>

        <section className="card" style={{ marginBottom: '40px', borderLeft: '4px solid var(--accent-green)' }}>
          <h2 style={{ marginBottom: '16px', display:'flex', alignItems:'center', gap:8 }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
            {t('dashboard.roadmap')}
          </h2>
          <p className="subtitle" style={{ marginBottom: '20px' }}>{t('dashboard.roadmapSubtitle')}</p>
          {editMode ? (
            <textarea
              className="edit-textarea"
              placeholder={t('dashboard.roadmapPlaceholder')}
              value={Array.isArray(selectedProject.future_improvements) ? selectedProject.future_improvements.join('\n') : ''}
              onChange={e => setSelectedProject({ ...selectedProject, future_improvements: e.target.value.split('\n') })}
            />
          ) : (
            <div className="roadmap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {selectedProject.future_improvements?.map((imp, i) => (
                <div key={i} className="card" style={{ background: 'var(--primary-trans)', border: 'none', padding: '16px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--primary)', marginBottom: '4px' }}>{t('dashboard.postMvpPhase')} {i + 1}</div>
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>{imp}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedProject.status === 'Completed' && selectedProject.description && (
          <section className="card" style={{
            marginBottom: '40px', background: '#ecfdf5', borderLeft: '4px solid #10b981',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', background: '#10b981', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700,
              }}>{'\u2713'}</span>
              <h2 style={{ margin: 0 }}>{t('dashboard.closureResult')}</h2>
            </div>
            <div style={{
              whiteSpace: 'pre-wrap', fontSize: '0.88rem', lineHeight: 1.7, color: '#1e293b',
            }}>
              {selectedProject.description.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: '1rem', fontWeight: 700, margin: '20px 0 8px', color: '#0F172A' }}>{line.replace('## ', '')}</h3>;
                if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: '0.9rem', fontWeight: 600, margin: '16px 0 6px', color: '#334155' }}>{line.replace('### ', '')}</h4>;
                if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: '16px', margin: '2px 0' }}>{'\u2022'} {line.replace('- ', '')}</div>;
                if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />;
                return <p key={i} style={{ margin: '4px 0' }}>{line}</p>;
              })}
            </div>
          </section>
        )}

        <section className="card" style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '16px' }}>{t('dashboard.proposedSolution')}</h2>
          {editMode ? (
            <textarea
              className="edit-textarea"
              value={selectedProject.solution}
              onChange={e => setSelectedProject({ ...selectedProject, solution: e.target.value })}
            />
          ) : (
            <p>{selectedProject.solution}</p>
          )}
        </section>

        {/* Contenido dinámico (Notion-style Blocks) */}
        <div className="dynamic-blocks" style={{ marginBottom: '40px' }}>
          <BlockRenderer
            blocks={selectedProject.blocks}
            editMode={editMode}
            onMove={handleBlockMove}
            onDelete={handleBlockDelete}
            onChange={handleBlockChange}
          />
          {editMode && (
            <div className="add-block-controls">
              <button onClick={() => addBlock('text')}>{t('dashboard.addText')}</button>
              <button onClick={() => addBlock('callout')}>{t('dashboard.addCallout')}</button>
              <button onClick={() => addBlock('metric_grid')}>{t('dashboard.addMetrics')}</button>
              <button onClick={() => addBlock('link_list')}>{t('dashboard.addLinks')}</button>
            </div>
          )}
        </div>

        {selectedProject.phases?.map(phase => (
          <div key={phase.id} className="phase-section">
            <div className="phase-header">
              <div className="phase-number">{phase.phase_number}</div>
              <h2>{phase.name}</h2>
            </div>
            <p className="subtitle" style={{ marginBottom: '20px' }}>{phase.objective}</p>

            <div className="tasks-list">
              {phase.tasks?.map(task => (
                <div key={task.id} className="task-item" style={{ borderLeft: `4px solid ${task.type === 'Bug' ? 'var(--accent-red)' : task.type === 'Enhancement' ? 'var(--accent-green)' : 'var(--border-light)'}` }}>
                  <div className="task-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span title={task.type} style={{ color: task.type === 'Bug' ? 'var(--accent-red)' : task.type === 'Enhancement' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                        {task.type === 'Bug' ? (
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>
                        ) : task.type === 'Enhancement' ? (
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                        ) : (
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                        )}
                      </span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{task.description}</strong>
                      <span className="dept-badge" style={{
                        fontSize: '0.6rem',
                        padding: '2px 8px',
                        background: task.priority === 'Critical' ? 'var(--accent-red)' : task.priority === 'High' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-main)',
                        color: task.priority === 'Critical' ? 'white' : 'var(--text-main)',
                        fontWeight: '700'
                      }}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="task-meta">
                      <span className="task-agent">{task.agent}</span>
                      <span className="effort-pill" title={t('dashboard.effort')}>{task.effort}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'kanban') {
    return (
      <div className="dashboard-home">
        <div className="page-header">
          <div>
            <h1 className="page-title">Kanban</h1>
            <span className="page-date">Vista por departamento</span>
          </div>
          <button className="back-button" style={{margin:0}} onClick={() => setViewMode('grid')}>← Dashboard</button>
        </div>
        <DepartmentKanban departments={departments} getDeptTheme={getDeptTheme} />
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="dashboard-home">
        <div className="page-header">
          <div>
            <h1 className="page-title">Todos los Proyectos</h1>
            <span className="page-date">{projects.length} proyectos en total</span>
          </div>
          <button className="back-button" style={{margin:0}} onClick={() => setViewMode('grid')}>← Dashboard</button>
        </div>
        <div className="card">
          <div className="projects-table-wrap">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Departamento</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} onClick={() => fetchProjectDetail(p.id)} className="table-row-clickable">
                    <td className="table-name">{p.name}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: (STATUS_COLORS[p.status] || '#3b82f6') + '18',
                          color: STATUS_COLORS[p.status] || '#3b82f6',
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="table-dept">{p.department}</td>
                    <td className="table-date">
                      {new Date(p.updated_at || p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign:'center', color:'var(--text-muted)', padding:'32px' }}>Sin proyectos aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardHome
      projects={projects}
      onProjectClick={fetchProjectDetail}
      onCreateProject={createProject}
      onViewAll={() => setViewMode('list')}
      onViewKanban={() => setViewMode('kanban')}
    />
  );
}

export default App;
