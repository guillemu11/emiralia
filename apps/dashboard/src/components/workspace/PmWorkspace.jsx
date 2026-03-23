import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../api.js';
import ArtifactCard from './ArtifactCard.jsx';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import WsIcon from './WsIcon.jsx';
import { PM_TYPE_LABELS, PM_TYPE_ICONS, PM_PUBLISH_DESTINATIONS } from './artifactConstants.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function quarterLabel(dateStr) {
    if (!dateStr) return 'Sin fecha';
    const d = new Date(dateStr);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear()}`;
}

function truncate(str, len = 60) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
}

const PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const EFFORT_ORDER   = ['L', 'M', 'S'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const map = {
        'Planning':    { bg: '#ede9fe', color: '#7c3aed' },
        'In Progress': { bg: '#dbeafe', color: '#2563eb' },
        'Completed':   { bg: '#dcfce7', color: '#16a34a' },
        'Paused':      { bg: '#fef9c3', color: '#b45309' },
        'Todo':        { bg: '#f1f5f9', color: '#475569' },
        'Done':        { bg: '#dcfce7', color: '#16a34a' },
    };
    const cfg = map[status] || { bg: '#f1f5f9', color: '#64748b' };
    return (
        <span style={{
            padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: cfg.bg, color: cfg.color,
        }}>
            {status}
        </span>
    );
}

function PriorityBadge({ priority }) {
    const map = {
        'Critical': { bg: '#fef2f2', color: '#ef4444' },
        'High':     { bg: '#fff7ed', color: '#f97316' },
        'Medium':   { bg: '#fefce8', color: '#ca8a04' },
        'Low':      { bg: '#f0fdf4', color: '#22c55e' },
    };
    const cfg = map[priority] || { bg: '#f1f5f9', color: '#64748b' };
    return (
        <span style={{
            padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: cfg.bg, color: cfg.color,
        }}>
            {priority || '—'}
        </span>
    );
}

function EffortBadge({ effort }) {
    const map = {
        'S': { bg: '#dcfce7', color: '#16a34a' },
        'M': { bg: '#fef9c3', color: '#b45309' },
        'L': { bg: '#fef2f2', color: '#ef4444' },
    };
    const cfg = map[effort] || { bg: '#f1f5f9', color: '#64748b' };
    return (
        <span style={{
            padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: cfg.bg, color: cfg.color,
        }}>
            {effort || '?'}
        </span>
    );
}

function Toast({ toast }) {
    if (!toast) return null;
    const bg    = toast.type === 'error' ? '#fef2f2' : '#ecfdf5';
    const color = toast.type === 'error' ? '#ef4444' : '#10b981';
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: bg, color, border: `1px solid ${color}30`,
            padding: '12px 20px', borderRadius: 12, fontWeight: 600,
            fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
            {toast.msg}
        </div>
    );
}

function ProgressBar({ pct, color = '#a855f7' }) {
    return (
        <div style={{ height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden', marginTop: 6 }}>
            <div style={{
                height: '100%', width: `${Math.min(100, pct)}%`,
                background: color, borderRadius: 999, transition: 'width 0.6s ease',
            }} />
        </div>
    );
}

// ─── Section: Sprint Activo ───────────────────────────────────────────────────

function SprintSection({ projectDetails, detailsLoading, onTaskStatus }) {
    const activeProjects = projectDetails.filter(p => p.status === 'In Progress');

    if (detailsLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
                Cargando tareas del sprint…
            </div>
        );
    }

    if (activeProjects.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>No hay proyectos en curso</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Los proyectos "In Progress" aparecerán aquí con sus tareas.</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {activeProjects.map(project => {
                const allTasks = (project.phases || []).flatMap(ph => ph.tasks || []);
                const todoTasks  = allTasks.filter(t => t.status === 'Todo');
                const wipTasks   = allTasks.filter(t => t.status === 'In Progress');
                const doneTasks  = allTasks.filter(t => t.status === 'Done');
                const pct = allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0;

                const columns = [
                    { id: 'Todo',        label: 'Por Hacer',   tasks: todoTasks,  color: '#64748b' },
                    { id: 'In Progress', label: 'En Curso',    tasks: wipTasks,   color: '#2563eb' },
                    { id: 'Done',        label: 'Completado',  tasks: doneTasks,  color: '#16a34a' },
                ];

                return (
                    <div key={project.id} style={{
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: 16, padding: 22,
                    }}>
                        {/* Project header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{project.name}</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    {allTasks.length} tareas · {pct}% completado
                                </div>
                            </div>
                            <StatusBadge status={project.status} />
                        </div>

                        {/* Burndown bar */}
                        <ProgressBar pct={pct} />

                        {/* Mini Kanban */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 12, marginTop: 18,
                        }}>
                            {columns.map(col => (
                                <div key={col.id} style={{
                                    background: '#f8fafc', borderRadius: 10, padding: '12px 14px',
                                }}>
                                    <div style={{
                                        fontSize: 11, fontWeight: 700, color: col.color,
                                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
                                        display: 'flex', justifyContent: 'space-between',
                                    }}>
                                        <span>{col.label}</span>
                                        <span style={{
                                            background: col.color + '20', color: col.color,
                                            borderRadius: 999, padding: '0 7px', fontWeight: 700,
                                        }}>
                                            {col.tasks.length}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {col.tasks.length === 0 && (
                                            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                                                Vacío
                                            </div>
                                        )}
                                        {col.tasks.slice(0, 8).map(task => (
                                            <TaskChip
                                                key={task.id}
                                                task={task}
                                                currentStatus={col.id}
                                                onStatusChange={onTaskStatus}
                                            />
                                        ))}
                                        {col.tasks.length > 8 && (
                                            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                                                +{col.tasks.length - 8} más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TaskChip({ task, currentStatus, onStatusChange }) {
    const nextStatus = currentStatus === 'Todo' ? 'In Progress' : currentStatus === 'In Progress' ? 'Done' : null;

    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '8px 10px', fontSize: 12,
        }}>
            <div style={{ color: '#0f172a', marginBottom: 5, lineHeight: 1.4 }}>
                {truncate(task.description, 55)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <EffortBadge effort={task.effort} />
                    {task.agent && (
                        <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                            {truncate(task.agent, 15)}
                        </span>
                    )}
                </div>
                {nextStatus && (
                    <button
                        onClick={() => onStatusChange(task.id, nextStatus)}
                        style={{
                            padding: '2px 8px', borderRadius: 6, border: 'none',
                            background: '#ede9fe', color: '#7c3aed',
                            fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        → {nextStatus === 'In Progress' ? 'Iniciar' : 'Terminar'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Section: Roadmap ─────────────────────────────────────────────────────────

function RoadmapSection({ projects }) {
    if (projects.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ marginBottom: 12, color: '#cbd5e1' }}><WsIcon name="map" size={40} /></div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>No hay proyectos aún</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Los proyectos aparecerán agrupados por estado y trimestre.</div>
            </div>
        );
    }

    // Group by quarter
    const byQuarter = {};
    projects.forEach(p => {
        const q = quarterLabel(p.created_at);
        if (!byQuarter[q]) byQuarter[q] = [];
        byQuarter[q].push(p);
    });

    const STATUS_COLORS_MAP = {
        'Planning':    { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
        'In Progress': { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
        'Completed':   { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
        'Paused':      { bg: '#fef9c3', color: '#b45309', border: '#fef08a' },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {Object.entries(byQuarter).map(([quarter, qProjects]) => (
                <div key={quarter}>
                    <div style={{
                        fontSize: 12, fontWeight: 700, color: '#94a3b8',
                        textTransform: 'uppercase', letterSpacing: 1,
                        marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <span>{quarter}</span>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span>{qProjects.length} proyecto{qProjects.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 14,
                    }}>
                        {qProjects.map(p => {
                            const cfg = STATUS_COLORS_MAP[p.status] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
                            return (
                                <div key={p.id} style={{
                                    background: '#fff', border: `1px solid ${cfg.border}`,
                                    borderRadius: 14, padding: '16px 18px',
                                    borderTop: `3px solid ${cfg.color}`,
                                }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>
                                        {p.name}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                        <StatusBadge status={p.status} />
                                        {p.department && (
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 999, fontSize: 11,
                                                background: '#f1f5f9', color: '#475569', fontWeight: 500,
                                            }}>
                                                {p.department}
                                            </span>
                                        )}
                                    </div>
                                    {p.estimated_timeline && (
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                            ⏱ {p.estimated_timeline}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                                        Creado {formatDate(p.created_at)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Section: Backlog ─────────────────────────────────────────────────────────

function BacklogSection({ projectDetails, detailsLoading, sort, onSortChange, onTaskStatus }) {
    // Collect all Todo tasks with their project context
    const allTodoTasks = projectDetails.flatMap(p =>
        (p.phases || []).flatMap(ph =>
            (ph.tasks || [])
                .filter(t => t.status === 'Todo')
                .map(t => ({ ...t, projectName: p.name, projectId: p.id }))
        )
    );

    const sorted = [...allTodoTasks].sort((a, b) => {
        if (sort === 'priority') {
            return PRIORITY_ORDER.indexOf(a.priority || 'Low') - PRIORITY_ORDER.indexOf(b.priority || 'Low');
        }
        if (sort === 'effort') {
            return EFFORT_ORDER.indexOf(a.effort || 'S') - EFFORT_ORDER.indexOf(b.effort || 'S');
        }
        // By project
        return (a.projectName || '').localeCompare(b.projectName || '');
    });

    if (detailsLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
                Cargando backlog…
            </div>
        );
    }

    return (
        <div>
            {/* Sort controls */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Ordenar por:</span>
                {[
                    { id: 'priority', label: 'Prioridad' },
                    { id: 'effort',   label: 'Esfuerzo' },
                    { id: 'project',  label: 'Proyecto' },
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => onSortChange(opt.id)}
                        style={{
                            padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            border: '1px solid',
                            borderColor: sort === opt.id ? '#a855f7' : '#e2e8f0',
                            background: sort === opt.id ? '#ede9fe' : '#fff',
                            color: sort === opt.id ? '#7c3aed' : '#64748b',
                            cursor: 'pointer',
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
                    {sorted.length} tarea{sorted.length !== 1 ? 's' : ''}
                </span>
            </div>

            {sorted.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>Backlog vacío</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>No hay tareas pendientes. ¡Todo está en marcha!</div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.map(task => (
                    <div key={task.id} style={{
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: 12, padding: '14px 18px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 16,
                    }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, marginBottom: 6 }}>
                                {task.description}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <EffortBadge effort={task.effort} />
                                <PriorityBadge priority={task.priority} />
                                <span style={{
                                    fontSize: 11, color: '#64748b', background: '#f8fafc',
                                    border: '1px solid #e2e8f0', borderRadius: 6, padding: '1px 7px',
                                }}>
                                    📁 {task.projectName}
                                </span>
                                {task.agent && (
                                    <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                        {task.agent}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => onTaskStatus(task.id, 'In Progress')}
                            style={{
                                padding: '7px 16px', borderRadius: 8, border: 'none',
                                background: '#ede9fe', color: '#7c3aed',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                        >
                            ▶ Iniciar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Section: PRDs ────────────────────────────────────────────────────────────

function PrdsSection({ artifacts, artifactStats, filter, onFilterChange, onNewPrd, onPreview, onStatusChange, onHandoff, onPublish, onEdit }) {
    const filtered = filter === 'all' ? artifacts : artifacts.filter(a => a.status === filter);

    const stats = [
        { label: 'Total PRDs',   value: artifactStats?.total ?? 0,         icon: 'file-text' },
        { label: 'En Revisión',  value: artifactStats?.by_status?.pending_review ?? 0, icon: 'search' },
        { label: 'Aprobados',    value: artifactStats?.by_status?.approved ?? 0,        icon: 'check-square' },
        { label: 'Publicados',   value: artifactStats?.by_status?.published ?? 0,       icon: 'globe' },
    ];

    return (
        <div>
            {/* Stat cards */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12, marginBottom: 22,
            }}>
                {stats.map(s => (
                    <div key={s.label} style={{
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: 12, padding: '14px 16px',
                    }}>
                        <div style={{ marginBottom: 4, color: '#94a3b8' }}><WsIcon name={s.icon} size={20} /></div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter + action bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <select
                    value={filter}
                    onChange={e => onFilterChange(e.target.value)}
                    style={{
                        padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                        background: '#fff', fontSize: 13, color: '#0f172a', cursor: 'pointer',
                    }}
                >
                    <option value="all">Todos los estados</option>
                    <option value="draft">Borrador</option>
                    <option value="pending_review">En Revisión</option>
                    <option value="approved">Aprobados</option>
                    <option value="rejected">Rechazados</option>
                    <option value="published">Publicados</option>
                </select>

                <button
                    onClick={onNewPrd}
                    style={{
                        padding: '8px 20px', borderRadius: 20, border: 'none',
                        background: '#a855f7', color: '#fff',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    + Nuevo PRD
                </button>
            </div>

            {/* Artifact grid */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ marginBottom: 12, color: '#cbd5e1' }}><WsIcon name="file-text" size={40} /></div>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                        {filter === 'all' ? 'No hay PRDs aún' : `No hay PRDs con estado "${filter}"`}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                        Crea un nuevo PRD para empezar a documentar requisitos.
                    </div>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 14,
                }}>
                    {filtered.map(a => (
                        <ArtifactCard
                            key={a.id}
                            artifact={a}
                            onPreview={onPreview}
                            onEdit={onEdit}
                            onStatusChange={onStatusChange}
                            onHandoff={onHandoff}
                            onPublish={onPublish}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Section: PM Reports ──────────────────────────────────────────────────────

function ReportsSection({ reports, expandedReport, onExpand, onGenerate, generating }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                <button
                    onClick={onGenerate}
                    disabled={generating}
                    style={{
                        padding: '8px 20px', borderRadius: 20, border: 'none',
                        background: generating ? '#e2e8f0' : '#a855f7',
                        color: generating ? '#94a3b8' : '#fff',
                        fontSize: 13, fontWeight: 600,
                        cursor: generating ? 'not-allowed' : 'pointer',
                    }}
                >
                    {generating ? 'Generando…' : '+ Generar Reporte'}
                </button>
            </div>

            {reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ marginBottom: 12, color: '#cbd5e1' }}><WsIcon name="bar-chart-2" size={40} /></div>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>No hay reportes aún</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>Genera el primer reporte de PM para ver métricas y riesgos.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {reports.map(r => {
                        const isExpanded = expandedReport?.id === r.id;
                        const metrics = r.metrics || {};
                        const risks   = Array.isArray(r.risks)      ? r.risks      : [];
                        const next    = Array.isArray(r.next_steps)  ? r.next_steps : [];

                        return (
                            <div key={r.id} style={{
                                background: '#fff', border: '1px solid #e2e8f0',
                                borderRadius: 14, overflow: 'hidden',
                            }}>
                                {/* Row header */}
                                <div
                                    onClick={() => onExpand(isExpanded ? null : r)}
                                    style={{
                                        padding: '16px 20px', cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
                                            {r.title || 'PM Report'}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>
                                            {formatDate(r.created_at)}
                                            {Object.keys(metrics).length > 0 && (
                                                <span style={{ marginLeft: 10 }}>
                                                    {Object.keys(metrics).length} métricas
                                                </span>
                                            )}
                                            {risks.length > 0 && (
                                                <span style={{ marginLeft: 10, color: '#ef4444' }}>
                                                    {risks.length} riesgo{risks.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span style={{ color: '#94a3b8', fontSize: 16 }}>
                                        {isExpanded ? '▲' : '▼'}
                                    </span>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div style={{
                                        borderTop: '1px solid #f1f5f9',
                                        padding: '18px 20px',
                                        background: '#fafafa',
                                    }}>
                                        {r.summary && (
                                            <p style={{ fontSize: 13, color: '#334155', marginBottom: 16, lineHeight: 1.6 }}>
                                                {r.summary}
                                            </p>
                                        )}

                                        {Object.keys(metrics).length > 0 && (
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                                                    Métricas
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                    {Object.entries(metrics).map(([k, v]) => (
                                                        <span key={k} style={{
                                                            padding: '4px 12px', borderRadius: 8,
                                                            background: '#ede9fe', color: '#7c3aed',
                                                            fontSize: 12, fontWeight: 600,
                                                        }}>
                                                            {k}: {v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {risks.length > 0 && (
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                                                    Riesgos
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {risks.map((risk, i) => (
                                                        <div key={i} style={{
                                                            fontSize: 13, color: '#334155',
                                                            display: 'flex', gap: 8, alignItems: 'flex-start',
                                                        }}>
                                                            <span style={{ color: '#ef4444', flexShrink: 0 }}>⚠</span>
                                                            {typeof risk === 'string' ? risk : risk.description || JSON.stringify(risk)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {next.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                                                    Próximos Pasos
                                                </div>
                                                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {next.map((step, i) => (
                                                        <li key={i} style={{ fontSize: 13, color: '#334155' }}>
                                                            {typeof step === 'string' ? step : step.description || JSON.stringify(step)}
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SECTIONS = [
    { id: 'sprint',   label: 'Sprint Activo' },
    { id: 'roadmap',  label: 'Roadmap'       },
    { id: 'backlog',  label: 'Backlog'       },
    { id: 'prds',     label: 'PRDs'          },
    { id: 'reports',  label: 'PM Reports'    },
];

export default function PmWorkspace({ agentId }) {
    const [section,         setSection]         = useState('sprint');
    const [projects,        setProjects]         = useState([]);
    const [projectDetails,  setProjectDetails]   = useState([]);
    const [artifacts,       setArtifacts]        = useState([]);
    const [artifactStats,   setArtifactStats]    = useState(null);
    const [reports,         setReports]          = useState([]);
    const [expandedReport,  setExpandedReport]   = useState(null);
    const [loading,         setLoading]          = useState(true);
    const [detailsLoading,  setDetailsLoading]   = useState(false);
    const [generating,      setGenerating]       = useState(false);
    const [toast,           setToast]            = useState(null);
    const [previewArtifact, setPreviewArtifact]  = useState(null);
    const [backlogSort,     setBacklogSort]      = useState('priority');
    const [artifactFilter,  setArtifactFilter]   = useState('all');

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    // ── Fetch helpers ─────────────────────────────────────────────────────────

    const fetchProjects = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/projects`);
            if (r.ok) setProjects(await r.json());
        } catch { /* silent */ }
    }, []);

    const fetchArtifacts = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/artifacts?agent_id=pm-agent&type=prd&status=all&limit=100`);
            if (r.ok) setArtifacts(await r.json());
        } catch { /* silent */ }
    }, []);

    const fetchArtifactStats = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/artifacts/stats?agent_id=pm-agent`);
            if (r.ok) setArtifactStats(await r.json());
        } catch { /* silent */ }
    }, []);

    const fetchReports = useCallback(async () => {
        try {
            const r = await fetch(`${API_URL}/pm-reports`);
            if (r.ok) setReports(await r.json());
        } catch { /* silent */ }
    }, []);

    const fetchProjectDetails = useCallback(async (projectList) => {
        const activeProjects = (projectList || projects).filter(p => p.status === 'In Progress');
        if (activeProjects.length === 0) return;
        setDetailsLoading(true);
        try {
            const details = await Promise.all(
                activeProjects.map(p => fetch(`${API_URL}/projects/${p.id}`).then(r => r.ok ? r.json() : null))
            );
            setProjectDetails(details.filter(Boolean));
        } catch { /* silent */ }
        finally { setDetailsLoading(false); }
    }, [projects]);

    // ── Initial load ──────────────────────────────────────────────────────────

    useEffect(() => {
        Promise.all([fetchProjects(), fetchArtifacts(), fetchArtifactStats(), fetchReports()])
            .finally(() => setLoading(false));
    }, []);

    // ── Load details when navigating to sprint/backlog ────────────────────────

    useEffect(() => {
        if ((section === 'sprint' || section === 'backlog') && projectDetails.length === 0 && !detailsLoading) {
            fetchProjectDetails();
        }
    }, [section, projects]);

    // ── Actions ───────────────────────────────────────────────────────────────

    async function handleTaskStatus(taskId, newStatus) {
        try {
            const r = await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (r.ok) {
                showToast(`Tarea movida a "${newStatus}"`);
                await fetchProjectDetails();
            } else {
                showToast('Error al actualizar tarea', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    }

    async function handleNewPrd() {
        try {
            const r = await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: 'pm-agent',
                    type: 'prd',
                    title: '[Nuevo PRD]',
                    content: '',
                    metadata: {},
                }),
            });
            if (r.ok) {
                showToast('PRD creado en borrador');
                await Promise.all([fetchArtifacts(), fetchArtifactStats()]);
            } else {
                showToast('Error al crear PRD', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    }

    async function handleArtifactStatusChange(id, status, reason) {
        try {
            const body = { status };
            if (reason) body.rejection_reason = reason;
            const r = await fetch(`${API_URL}/artifacts/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (r.ok) {
                showToast(`Estado actualizado a "${status}"`);
                await Promise.all([fetchArtifacts(), fetchArtifactStats()]);
            } else {
                showToast('Error al actualizar estado', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    }

    async function handleHandoff(artifact, toAgentId, instruction) {
        try {
            const r = await fetch(`${API_URL}/artifacts/${artifact.id}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_agent_id: 'pm-agent', to_agent_id: toAgentId, instruction }),
            });
            if (r.ok) {
                showToast(`Enviado a ${toAgentId}`);
            } else {
                showToast('Error en handoff', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    }

    async function handlePublish(artifact, destination) {
        try {
            const r = await fetch(`${API_URL}/artifacts/${artifact.id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination }),
            });
            if (r.ok) {
                showToast(`Publicado en "${destination}"`);
                await fetchArtifacts();
            } else {
                showToast('Error al publicar', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    }

    async function handleGenerateReport() {
        setGenerating(true);
        try {
            const r = await fetch(`${API_URL}/pm-reports/generate`, { method: 'POST' });
            if (r.ok) {
                const newReport = await r.json();
                showToast('Reporte generado');
                await fetchReports();
                setExpandedReport(newReport);
            } else {
                showToast('Error al generar reporte', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        } finally {
            setGenerating(false);
        }
    }

    // ── Derived stats ─────────────────────────────────────────────────────────

    const activeCount   = projects.filter(p => p.status === 'In Progress').length;
    const allTodos      = projectDetails.flatMap(p => (p.phases || []).flatMap(ph => (ph.tasks || []).filter(t => t.status === 'Todo')));
    const prdCount      = (artifactStats?.by_status?.approved ?? 0) + (artifactStats?.by_status?.published ?? 0);

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                Cargando Product Command…
            </div>
        );
    }

    return (
        <>
            <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', maxWidth: 1200 }}>

                {/* ── Header ────────────────────────────────────────────── */}
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Product Command
                    </h2>
                    <p style={{ color: '#64748b', marginTop: 4, fontSize: 13, margin: '4px 0 0' }}>
                        Sprint activo, roadmap, backlog, PRDs y reportes del PM Agent
                    </p>
                </div>

                {/* ── Stats bar ─────────────────────────────────────────── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 14, marginBottom: 28,
                }}>
                    {[
                        { label: 'Proyectos activos', value: activeCount,         icon: 'rocket',      sub: 'In Progress' },
                        { label: 'Tareas pendientes', value: allTodos.length,     icon: 'clipboard',   sub: 'En Backlog'  },
                        { label: 'PRDs activos',      value: prdCount,            icon: 'file-text',   sub: 'Aprobados'   },
                        { label: 'Reportes PM',       value: reports.length,      icon: 'bar-chart-2', sub: 'Total'       },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: '#fff', border: '1px solid #e2e8f0',
                            borderRadius: 12, padding: '16px 18px',
                        }}>
                            <div style={{ marginBottom: 6, color: '#94a3b8' }}><WsIcon name={s.icon} size={22} /></div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {s.label} · {s.sub}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Section tabs ──────────────────────────────────────── */}
                <div style={{
                    display: 'flex', gap: 2, borderBottom: '1px solid #e2e8f0',
                    marginBottom: 24,
                }}>
                    {SECTIONS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSection(tab.id)}
                            style={{
                                padding: '8px 16px', border: 'none', cursor: 'pointer',
                                background: 'transparent', fontSize: 13,
                                fontWeight: section === tab.id ? 600 : 400,
                                color: section === tab.id ? '#a855f7' : '#64748b',
                                borderBottom: section === tab.id ? '2px solid #a855f7' : '2px solid transparent',
                                marginBottom: -1, borderRadius: '6px 6px 0 0',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Sprint Activo ─────────────────────────────────────── */}
                {section === 'sprint' && (
                    <SprintSection
                        projectDetails={projectDetails}
                        detailsLoading={detailsLoading}
                        onTaskStatus={handleTaskStatus}
                    />
                )}

                {/* ── Roadmap ───────────────────────────────────────────── */}
                {section === 'roadmap' && (
                    <RoadmapSection projects={projects} />
                )}

                {/* ── Backlog ───────────────────────────────────────────── */}
                {section === 'backlog' && (
                    <BacklogSection
                        projectDetails={projectDetails}
                        detailsLoading={detailsLoading}
                        sort={backlogSort}
                        onSortChange={setBacklogSort}
                        onTaskStatus={handleTaskStatus}
                    />
                )}

                {/* ── PRDs ──────────────────────────────────────────────── */}
                {section === 'prds' && (
                    <PrdsSection
                        artifacts={artifacts}
                        artifactStats={artifactStats}
                        filter={artifactFilter}
                        onFilterChange={setArtifactFilter}
                        onNewPrd={handleNewPrd}
                        onPreview={setPreviewArtifact}
                        onEdit={setPreviewArtifact}
                        onStatusChange={handleArtifactStatusChange}
                        onHandoff={handleHandoff}
                        onPublish={handlePublish}
                    />
                )}

                {/* ── PM Reports ────────────────────────────────────────── */}
                {section === 'reports' && (
                    <ReportsSection
                        reports={reports}
                        expandedReport={expandedReport}
                        onExpand={setExpandedReport}
                        onGenerate={handleGenerateReport}
                        generating={generating}
                    />
                )}
            </div>

            {/* ── Modals ────────────────────────────────────────────────── */}
            {previewArtifact && (
                <ArtifactPreviewModal
                    artifact={previewArtifact}
                    onClose={() => setPreviewArtifact(null)}
                    onStatusChange={handleArtifactStatusChange}
                />
            )}

            <Toast toast={toast} />
        </>
    );
}
