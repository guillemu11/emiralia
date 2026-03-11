import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { API_URL } from '../api.js';

const statusTransitions = {
    'Planning':     ['In Progress', 'Paused'],
    'In Progress':  ['Completed', 'Paused'],
    'Completed':    ['In Progress'],
    'Paused':       ['Planning', 'In Progress'],
};

function formatDuration(start, end) {
    const ms = new Date(end) - new Date(start);
    const days = Math.round(ms / (1000 * 60 * 60 * 24));
    if (days < 1) return '< 1 day';
    return `${days}d`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function CompletionModal({ summary, onClose, t }) {
    if (!summary) return null;

    const duration = formatDuration(summary.createdAt, summary.completedAt);

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, backdropFilter: 'blur(4px)',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '24px', padding: '32px',
                    maxWidth: '480px', width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                    animation: 'fadeIn 0.2s ease-out',
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px', fontSize: '1.5rem',
                    }}>
                        {'\u2713'}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                        {t('pipeline.congratulations')}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                        {summary.projectName}
                    </p>
                </div>

                {/* Metrics row */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                    marginBottom: '20px',
                }}>
                    <div style={{
                        background: '#f8fafc', borderRadius: '16px', padding: '14px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>
                            {summary.tasks?.total || 0}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            {t('pipeline.tasksClosed')}
                        </div>
                    </div>
                    <div style={{
                        background: '#f8fafc', borderRadius: '16px', padding: '14px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3b82f6' }}>
                            {duration}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            {t('pipeline.projectDuration')}
                        </div>
                    </div>
                </div>

                {/* Phases */}
                {summary.phases?.detail?.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            {t('pipeline.phasesCompleted')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {summary.phases.detail.map((phase, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    fontSize: '0.8rem', color: '#475569',
                                }}>
                                    <span style={{
                                        width: 20, height: 20, borderRadius: '50%', background: '#ecfdf5',
                                        color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                                    }}>
                                        {phase.number}
                                    </span>
                                    <span>{phase.name}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#94A3B8' }}>
                                        {phase.taskCount} tasks
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Agents */}
                {summary.agentsInvolved?.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            {t('pipeline.agentsInvolved')}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {summary.agentsInvolved.map((agent, i) => (
                                <span key={i} style={{
                                    fontSize: '0.72rem', background: '#eff6ff', color: '#3b82f6',
                                    borderRadius: '9999px', padding: '3px 10px', fontWeight: 500,
                                }}>
                                    {agent}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        width: '100%', padding: '10px', borderRadius: '9999px',
                        background: '#10b981', color: '#fff', fontWeight: 600,
                        fontSize: '0.85rem', border: 'none', cursor: 'pointer',
                    }}
                >
                    {t('pipeline.close')}
                </button>
            </div>
        </div>
    );
}

export default function PipelineBoard({ department }) {
    const { t } = useLanguage();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [completionModal, setCompletionModal] = useState(null);

    const columns = [
        { key: 'Planning',     label: t('pipeline.planning'),    color: '#a855f7', bg: '#faf5ff' },
        { key: 'In Progress',  label: t('pipeline.inProgress'),  color: '#3b82f6', bg: '#eff6ff' },
        { key: 'Completed',    label: t('pipeline.completed'),   color: '#10b981', bg: '#ecfdf5' },
        { key: 'Paused',       label: t('pipeline.paused'),      color: '#f59e0b', bg: '#fffbeb' },
    ];

    const transitionLabels = {
        'Planning':     t('pipeline.planning'),
        'In Progress':  t('pipeline.inProgress'),
        'Completed':    t('pipeline.completed'),
        'Paused':       t('pipeline.paused'),
    };

    useEffect(() => {
        fetchProjects();
    }, [department]);

    async function fetchProjects() {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/pipeline?department=${encodeURIComponent(department)}`);
            const data = await res.json();
            setProjects(Array.isArray(data) ? data : []);
        } catch {
            setProjects([]);
        }
        setLoading(false);
    }

    async function handleStatusChange(projectId, newStatus) {
        setUpdating(projectId);
        try {
            let res;
            if (newStatus === 'Completed') {
                res = await fetch(`${API_URL}/projects/${projectId}/complete`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
            } else {
                res = await fetch(`${API_URL}/projects/${projectId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });
            }
            if (res.ok) {
                if (newStatus === 'Completed') {
                    const data = await res.json();
                    if (data.summary) setCompletionModal(data.summary);
                }
                setProjects(prev => prev.map(p =>
                    p.id === projectId ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p
                ));
            }
        } catch { /* ignore */ }
        setUpdating(null);
    }

    if (loading) {
        return <p style={{ color: '#64748B', fontSize: '0.88rem' }}>{t('pipeline.loadingPipeline')}</p>;
    }

    if (projects.length === 0) {
        return (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>{'\u{1F4CB}'}</div>
                <p style={{ color: '#0F172A', fontWeight: 600 }}>{t('pipeline.noProjects')}</p>
                <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '8px' }}>
                    {t('pipeline.noProjectsHint')}
                </p>
            </div>
        );
    }

    const grouped = columns.map(col => ({
        ...col,
        items: projects.filter(p => p.status === col.key),
    }));

    return (
        <>
            <CompletionModal
                summary={completionModal}
                onClose={() => setCompletionModal(null)}
                t={t}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                {grouped.map(col => (
                    <div key={col.key}>
                        {/* Column header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            marginBottom: '14px', paddingBottom: '8px',
                            borderBottom: `2px solid ${col.color}20`,
                        }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: col.color, display: 'inline-block',
                            }} />
                            <span style={{
                                fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.05em', color: '#64748B',
                            }}>
                                {col.label}
                            </span>
                            <span style={{
                                fontSize: '0.72rem', background: col.bg, color: col.color,
                                borderRadius: '9999px', padding: '1px 8px', fontWeight: 600,
                            }}>
                                {col.items.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '60px' }}>
                            {col.items.length === 0 ? (
                                <div style={{
                                    padding: '20px 16px', color: '#CBD5E1', fontSize: '0.8rem',
                                    textAlign: 'center', border: '1px dashed #E5E7EB', borderRadius: '16px',
                                }}>
                                    {t('pipeline.noProjectsInColumn')}
                                </div>
                            ) : (
                                col.items.map(proj => {
                                    const totalTasks = parseInt(proj.total_tasks) || 0;
                                    const doneTasks = parseInt(proj.done_tasks) || 0;
                                    const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                                    const transitions = statusTransitions[proj.status] || [];
                                    const isUpdating = updating === proj.id;
                                    const isCompleted = proj.status === 'Completed';

                                    return (
                                        <div key={proj.id} className="card" style={{
                                            padding: '16px',
                                            borderLeft: isCompleted ? '3px solid #10b981' : undefined,
                                            background: isCompleted ? '#fafffe' : undefined,
                                        }}>
                                            {/* Name + completed badge */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                {isCompleted && (
                                                    <span style={{
                                                        width: 18, height: 18, borderRadius: '50%',
                                                        background: '#10b981', color: '#fff',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                                                    }}>
                                                        {'\u2713'}
                                                    </span>
                                                )}
                                                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                                                    {proj.name}
                                                </h4>
                                            </div>

                                            {/* Completed date (only for completed) */}
                                            {isCompleted && proj.updated_at && (
                                                <p style={{ fontSize: '0.7rem', color: '#10b981', margin: '0 0 8px 0', fontWeight: 500 }}>
                                                    {t('pipeline.completedOn')} {formatDate(proj.updated_at)}
                                                </p>
                                            )}

                                            {/* Problem description */}
                                            {proj.problem && !isCompleted && (
                                                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                                                    {proj.problem.length > 120 ? proj.problem.substring(0, 120) + '...' : proj.problem}
                                                </p>
                                            )}

                                            {/* Badges: timeline + budget */}
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: (!isCompleted && totalTasks > 0) ? '10px' : '0' }}>
                                                {proj.estimated_timeline && proj.estimated_timeline !== 'TBD' && (
                                                    <span style={{
                                                        fontSize: '0.7rem', background: '#F1F5F9', borderRadius: 999,
                                                        padding: '2px 10px', color: '#475569',
                                                    }}>
                                                        {proj.estimated_timeline}
                                                    </span>
                                                )}
                                                {proj.estimated_budget > 0 && (
                                                    <span style={{
                                                        fontSize: '0.7rem', background: '#F1F5F9', borderRadius: 999,
                                                        padding: '2px 10px', color: '#475569',
                                                    }}>
                                                        ${Number(proj.estimated_budget).toLocaleString()}
                                                    </span>
                                                )}
                                                {isCompleted && totalTasks > 0 && (
                                                    <span style={{
                                                        fontSize: '0.7rem', background: '#ecfdf5', borderRadius: 999,
                                                        padding: '2px 10px', color: '#10b981', fontWeight: 600,
                                                    }}>
                                                        {totalTasks} tasks
                                                    </span>
                                                )}
                                            </div>

                                            {/* Task progress bar (only for non-completed) */}
                                            {!isCompleted && totalTasks > 0 && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{t('pipeline.tasks')}</span>
                                                        <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                                                            {doneTasks}/{totalTasks}
                                                        </span>
                                                    </div>
                                                    <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${taskPct}%`, height: '100%', borderRadius: '9999px',
                                                            background: taskPct === 100 ? '#10b981' : '#3b82f6',
                                                            transition: 'width 0.3s ease',
                                                        }} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Status change buttons */}
                                            {transitions.length > 0 && (
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: isCompleted ? '10px' : '0' }}>
                                                    {transitions.map(target => {
                                                        const targetCol = columns.find(c => c.key === target);
                                                        return (
                                                            <button
                                                                key={target}
                                                                onClick={() => handleStatusChange(proj.id, target)}
                                                                disabled={isUpdating}
                                                                style={{
                                                                    fontSize: '0.7rem', fontWeight: 600,
                                                                    padding: '3px 12px', borderRadius: '9999px',
                                                                    border: `1px solid ${targetCol?.color || '#94a3b8'}`,
                                                                    background: 'transparent',
                                                                    color: targetCol?.color || '#64748B',
                                                                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                                                                    opacity: isUpdating ? 0.5 : 1,
                                                                    transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                {'\u2192'} {transitionLabels[target] || target}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
