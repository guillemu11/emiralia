import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { API_URL } from '../api.js';
import WsIcon from '../components/workspace/WsIcon.jsx';

const WORKFLOWS = [
    {
        id: 'pm-review',
        name: 'PM Review',
        description: 'Validacion de ideas y desglose en proyectos, fases y tareas',
        icon: 'clipboard-list',
        agents: ['pm-agent'],
        category: 'execution',
        automatable: false,
        steps: [
            { agent: 'pm-agent', action: 'Escucha y resumen de la idea' },
            { agent: 'pm-agent', action: 'Cuestionamiento estrategico (5 rondas)' },
            { agent: 'pm-agent', action: 'Propuesta de enfoque' },
            { agent: 'pm-agent', action: 'Breakdown maestro tras aprobacion' },
        ],
    },
    {
        id: 'scrape-propertyfinder',
        name: 'Scrape PropertyFinder',
        description: 'Extraccion de propiedades off-plan de PropertyFinder.ae via Apify',
        icon: '🤖',
        agents: ['data-agent'],
        category: 'data',
        automatable: true,
        triggerCommand: 'node tools/apify_propertyfinder.js --monitoring --incremental',
        steps: [
            { agent: 'data-agent', action: 'Configurar URL y lanzar Apify actor' },
            { agent: 'data-agent', action: 'Esperar y recuperar dataset del run' },
            { agent: 'data-agent', action: 'Guardar propiedades en PostgreSQL (upsert)' },
            { agent: 'data-agent', action: 'Verificar conteo en DB' },
        ],
    },
    {
        id: 'screenshot-design-loop',
        name: 'Screenshot Design Loop',
        description: 'Iteracion de UI de alta fidelidad basada en capturas y comparacion visual',
        icon: 'pen-tool',
        agents: ['frontend-agent'],
        category: 'design',
        automatable: false,
        steps: [
            { agent: 'frontend-agent', action: 'Deploy y captura de screenshot' },
            { agent: 'frontend-agent', action: 'Comparacion visual con referencia' },
            { agent: 'frontend-agent', action: 'Analisis de discrepancias' },
            { agent: 'frontend-agent', action: 'Implementar correcciones y re-capturar' },
        ],
    },
    {
        id: 'data-intelligence',
        name: 'Data Intelligence',
        description: 'Pipeline de inteligencia de datos: analisis, dedup y enriquecimiento de propiedades',
        icon: 'bar-chart-2',
        agents: ['data-agent', 'pm-agent'],
        category: 'data',
        automatable: false,
        steps: [
            { agent: 'data-agent', action: 'Extraccion y normalizacion de datos' },
            { agent: 'data-agent', action: 'Deduplicacion cross-broker' },
            { agent: 'data-agent', action: 'Enriquecimiento y scoring' },
            { agent: 'pm-agent', action: 'Validacion y reporte' },
        ],
    },
    {
        id: 'gtm-planning',
        name: 'GTM Planning',
        description: 'Planificacion de Go-to-Market: canales, roadmap y presupuesto',
        icon: 'rocket',
        agents: ['pm-agent', 'marketing-agent'],
        category: 'strategy',
        automatable: false,
        steps: [
            { agent: 'pm-agent', action: 'Analisis de mercado y segmentos' },
            { agent: 'marketing-agent', action: 'Definicion de canales' },
            { agent: 'pm-agent', action: 'Roadmap y presupuesto' },
        ],
    },
    {
        id: 'marketing-planning',
        name: 'Marketing Planning',
        description: 'Planificacion de campanas de marketing y estrategia de contenido',
        icon: '📢',
        agents: ['marketing-agent', 'content-agent'],
        category: 'strategy',
        automatable: false,
        steps: [
            { agent: 'marketing-agent', action: 'Definicion de objetivos y KPIs' },
            { agent: 'content-agent', action: 'Plan de contenido' },
            { agent: 'marketing-agent', action: 'Calendario y ejecucion' },
        ],
    },
    {
        id: 'sprint-planning',
        name: 'Sprint Planning',
        description: 'Planificacion semanal de sprint para equipo de agentes IA',
        icon: '⚡',
        agents: ['pm-agent', 'dev-agent'],
        category: 'execution',
        automatable: false,
        steps: [
            { agent: 'pm-agent', action: 'Review de backlog y prioridades' },
            { agent: 'pm-agent', action: 'Asignacion de tareas a agentes' },
            { agent: 'dev-agent', action: 'Estimacion y compromisos' },
            { agent: 'pm-agent', action: 'Publicar plan de sprint' },
        ],
    },
];

function timeAgo(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

function formatDuration(ms) {
    if (!ms) return '-';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}min`;
}

export default function WorkflowsHub() {
    const { t } = useLanguage();
    const [view, setView] = useState('catalog');
    const [stats, setStats] = useState({ total_runs: 0, completed: 0, failed: 0, active: 0, last_run_at: null });
    const [runs, setRuns] = useState([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [triggeringId, setTriggeringId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, runsRes] = await Promise.all([
                fetch(`${API_URL}/workflows/stats`),
                fetch(`${API_URL}/workflows/runs?limit=100`),
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (runsRes.ok) setRuns(await runsRes.json());
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Polling for active runs
    useEffect(() => {
        const hasActive = runs.some(r => r.status === 'running');
        if (!hasActive) return;
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [runs, fetchData]);

    const getLastRun = (workflowId) => {
        return runs.find(r => r.workflow_id === workflowId);
    };

    const getWorkflowRuns = (workflowId) => {
        return runs.filter(r => r.workflow_id === workflowId);
    };

    const handleTrigger = async (wf) => {
        if (wf.automatable) {
            setConfirmId(wf.id);
        } else {
            await doTrigger(wf.id);
        }
    };

    const doTrigger = async (workflowId) => {
        setConfirmId(null);
        setTriggeringId(workflowId);
        try {
            await fetch(`${API_URL}/workflows/runs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflow_id: workflowId }),
            });
            await fetchData();
        } catch { /* ignore */ }
        setTriggeringId(null);
    };

    const handleUpdateRun = async (runId, status) => {
        try {
            await fetch(`${API_URL}/workflows/runs/${runId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            await fetchData();
        } catch { /* ignore */ }
    };

    const statusIconName = (status) => {
        switch (status) {
            case 'completed': return 'check-square';
            case 'failed': return 'x-circle';
            case 'running': return 'zap';
            case 'pending': return 'clock';
            default: return 'bar-chart';
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '16px', color: '#94a3b8' }}><WsIcon name="zap" size={32} /></div>
                    <p className="subtitle">{t('workflows.loading')}</p>
                </div>
            </div>
        );
    }

    // Detail view
    if (selectedWorkflow) {
        const wf = WORKFLOWS.find(w => w.id === selectedWorkflow);
        if (!wf) return null;
        const wfRuns = getWorkflowRuns(wf.id);
        const latestPending = wfRuns.find(r => r.status === 'pending');

        return (
            <div className="dashboard-container animate-fade-in">
                <div className="workflow-detail-back">
                    <button className="back-button" onClick={() => setSelectedWorkflow(null)}>
                        ← {t('workflows.backToCatalog')}
                    </button>
                </div>

                <div className="card" style={{ marginBottom: '32px' }}>
                    <div className="workflow-detail-header">
                        <span className="workflow-detail-icon"><WsIcon name={wf.icon} size={24} /></span>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{wf.name}</h2>
                                <span className="workflow-category-tag">{t(`workflows.${wf.category}`)}</span>
                                <span className="workflow-category-tag">{wf.automatable ? t('workflows.automatable') : t('workflows.manual')}</span>
                            </div>
                            <p className="subtitle">{wf.description}</p>
                        </div>
                        <button
                            className={`workflow-trigger-btn ${triggeringId === wf.id ? 'running' : ''}`}
                            onClick={() => handleTrigger(wf)}
                            disabled={triggeringId === wf.id}
                        >
                            {triggeringId === wf.id ? t('workflows.running') : t('workflows.run')}
                        </button>
                    </div>

                    {/* Pipeline steps */}
                    <div className="workflow-steps">
                        {wf.steps.map((step, i) => (
                            <div key={i} className="workflow-step">
                                <div className="workflow-step-dot"></div>
                                {i < wf.steps.length - 1 && <div className="workflow-step-line"></div>}
                                <div className="workflow-step-content">
                                    <span className="workflow-step-agent">{step.agent}</span>
                                    <span className="workflow-step-action">{step.action}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Manual pending run: action buttons */}
                    {latestPending && !wf.automatable && (
                        <div style={{ marginTop: '20px', padding: '16px', background: '#FFFBEB', borderRadius: '12px', border: '1px solid #FDE68A' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px' }}>{t('workflows.stepsChecklist')}</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="workflow-trigger-btn" onClick={() => handleUpdateRun(latestPending.id, 'completed')}>
                                    {t('workflows.markCompleted')}
                                </button>
                                <button className="workflow-cancel-btn" onClick={() => handleUpdateRun(latestPending.id, 'failed')}>
                                    {t('workflows.markFailed')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Run history for this workflow */}
                <h3 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', color: 'var(--text-muted)' }}>
                    {t('workflows.runHistory')}
                </h3>

                {wfRuns.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <p>{t('workflows.noRuns')}</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>{t('workflows.noRunsHint')}</p>
                    </div>
                ) : (
                    <div className="audit-timeline">
                        {wfRuns.map((run) => (
                            <div key={run.id} className="audit-event">
                                <div className="audit-event-time">
                                    <span className="audit-time">{timeAgo(run.started_at)}</span>
                                </div>
                                <div className="audit-event-icon-wrapper">
                                    <div className="audit-event-icon"><WsIcon name={statusIconName(run.status)} size={16} /></div>
                                    <div className="audit-timeline-line"></div>
                                </div>
                                <div className="card audit-event-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{wf.name}</span>
                                        <span className={`workflow-run-status ${run.status}`}>{run.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        <span>{t('workflows.duration')}: {formatDuration(run.duration_ms)}</span>
                                        <span>{t('workflows.triggeredBy')}: {run.triggered_by}</span>
                                    </div>
                                    {run.output_summary && (
                                        <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                            {run.output_summary.slice(0, 200)}
                                        </p>
                                    )}
                                    {run.error && (
                                        <p style={{ fontSize: '0.8rem', marginTop: '8px', color: '#EF4444' }}>
                                            {run.error.slice(0, 200)}
                                        </p>
                                    )}
                                    {run.status === 'pending' && !wf.automatable && (
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <button className="workflow-trigger-btn" style={{ fontSize: '0.75rem', padding: '6px 14px' }} onClick={() => handleUpdateRun(run.id, 'completed')}>
                                                {t('workflows.markCompleted')}
                                            </button>
                                            <button className="workflow-cancel-btn" style={{ fontSize: '0.75rem', padding: '6px 14px' }} onClick={() => handleUpdateRun(run.id, 'failed')}>
                                                {t('workflows.markFailed')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Main view
    return (
        <div className="dashboard-container animate-fade-in">
            {/* Header */}
            <header>
                <div>
                    <h1>{t('workflows.title')}</h1>
                    <p className="subtitle">{t('workflows.subtitle')}</p>
                </div>
            </header>

            {/* Stats bar */}
            <section className="workspace-stats-bar">
                <div className="stat-chip">
                    <span className="stat-chip-value">{WORKFLOWS.length}</span>
                    <span className="stat-chip-label">{t('workflows.totalWorkflows')}</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-chip-value">{stats.total_runs}</span>
                    <span className="stat-chip-label">{t('workflows.totalRuns')}</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-chip-value">{stats.completed}</span>
                    <span className="stat-chip-label">{t('workflows.completed')}</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-chip-value">{stats.failed}</span>
                    <span className="stat-chip-label">{t('workflows.failed')}</span>
                </div>
                <div className="stat-chip stat-chip-active">
                    <span className="stat-chip-value">{stats.active}</span>
                    <span className="stat-chip-label">{t('workflows.activeRuns')}</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-chip-value">{stats.last_run_at ? timeAgo(stats.last_run_at) : '-'}</span>
                    <span className="stat-chip-label">{t('workflows.lastRun')}</span>
                </div>
            </section>

            {/* Tab toggle */}
            <div className="weekly-view-toggle" style={{ marginBottom: '32px' }}>
                <button className={`weekly-toggle-btn ${view === 'catalog' ? 'active' : ''}`} onClick={() => setView('catalog')}>
                    {t('workflows.catalog')}
                </button>
                <button className={`weekly-toggle-btn ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
                    {t('workflows.history')}
                </button>
            </div>

            {/* Catalog view */}
            {view === 'catalog' && (
                <div className="workflows-hub-grid">
                    {WORKFLOWS.map((wf) => {
                        const lastRun = getLastRun(wf.id);
                        const isRunning = triggeringId === wf.id || (lastRun && lastRun.status === 'running');

                        return (
                            <div
                                key={wf.id}
                                className="card workflow-card animate-fade-in"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedWorkflow(wf.id)}
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <WsIcon name={wf.icon} size={20} />
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{wf.name}</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <span className="workflow-category-tag">{t(`workflows.${wf.category}`)}</span>
                                        {lastRun && <span className={`workflow-run-status ${lastRun.status}`}>{lastRun.status}</span>}
                                    </div>
                                </div>

                                <p className="subtitle" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>{wf.description}</p>

                                {/* Agent badges */}
                                <div className="workflow-agents">
                                    {wf.agents.map((a) => (
                                        <span key={a} className="workflow-agent-badge">{a}</span>
                                    ))}
                                </div>

                                {/* Pipeline steps */}
                                <div className="workflow-steps">
                                    {wf.steps.map((step, i) => (
                                        <div key={i} className="workflow-step">
                                            <div className="workflow-step-dot"></div>
                                            {i < wf.steps.length - 1 && <div className="workflow-step-line"></div>}
                                            <div className="workflow-step-content">
                                                <span className="workflow-step-agent">{step.agent}</span>
                                                <span className="workflow-step-action">{step.action}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="workflow-card-footer">
                                    <span className="workflow-last-run">
                                        {lastRun
                                            ? `${t('workflows.lastRun')}: ${timeAgo(lastRun.started_at)}`
                                            : t('workflows.never')
                                        }
                                    </span>
                                    <button
                                        className={`workflow-trigger-btn ${isRunning ? 'running' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); handleTrigger(wf); }}
                                        disabled={isRunning}
                                    >
                                        {isRunning ? t('workflows.running') : wf.automatable ? t('workflows.run') : t('workflows.run')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* History view */}
            {view === 'history' && (
                <div>
                    {runs.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{t('workflows.noRuns')}</p>
                            <p style={{ fontSize: '0.85rem' }}>{t('workflows.noRunsHint')}</p>
                        </div>
                    ) : (
                        <div className="audit-timeline">
                            {runs.map((run) => {
                                const wf = WORKFLOWS.find(w => w.id === run.workflow_id);
                                return (
                                    <div key={run.id} className="audit-event">
                                        <div className="audit-event-time">
                                            <span className="audit-time">{timeAgo(run.started_at)}</span>
                                        </div>
                                        <div className="audit-event-icon-wrapper">
                                            <div className="audit-event-icon"><WsIcon name={wf?.icon || 'zap'} size={16} /></div>
                                            <div className="audit-timeline-line"></div>
                                        </div>
                                        <div className="card audit-event-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{wf?.name || run.workflow_id}</span>
                                                <span className={`workflow-run-status ${run.status}`}>{run.status}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                <span>{t('workflows.duration')}: {formatDuration(run.duration_ms)}</span>
                                                <span>{t('workflows.triggeredBy')}: {run.triggered_by}</span>
                                            </div>
                                            {run.output_summary && (
                                                <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)' }}>
                                                    {run.output_summary.slice(0, 200)}
                                                </p>
                                            )}
                                            {run.error && (
                                                <p style={{ fontSize: '0.8rem', marginTop: '8px', color: '#EF4444' }}>
                                                    {run.error.slice(0, 200)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation modal */}
            {confirmId && (
                <div className="workflow-confirm-overlay" onClick={() => setConfirmId(null)}>
                    <div className="workflow-confirm-card" onClick={(e) => e.stopPropagation()}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{t('workflows.triggerWorkflow')}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {t('workflows.confirmTrigger')} <strong>{WORKFLOWS.find(w => w.id === confirmId)?.name}</strong>?
                        </p>
                        <div className="workflow-confirm-actions">
                            <button className="workflow-cancel-btn" onClick={() => setConfirmId(null)}>
                                {t('workflows.cancel')}
                            </button>
                            <button className="workflow-trigger-btn" onClick={() => doTrigger(confirmId)}>
                                {t('workflows.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
