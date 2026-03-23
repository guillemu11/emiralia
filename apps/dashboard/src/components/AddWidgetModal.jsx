import React, { useState } from 'react';

const WIDGETS = [
  {
    id: 'agent-distribution',
    name: 'Distribución de Agentes',
    desc: 'Cómo se distribuyen los agentes activos por departamento.',
    tag: '#Agentes',
    thumb: (
      <svg width="40" height="40" fill="none" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" stroke="#3b82f6" strokeWidth="2.5"/>
        <path d="M20 4a16 16 0 0 1 0 32" stroke="#a855f7" strokeWidth="2.5"/>
        <path d="M20 4v32" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3"/>
        <path d="M4 20h32" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3"/>
      </svg>
    ),
  },
  {
    id: 'system-overview',
    name: 'Overview del Sistema',
    desc: 'Métricas clave de rendimiento del sistema WAT en tiempo real.',
    tag: '#Performance',
    thumb: (
      <svg width="40" height="40" fill="none" viewBox="0 0 40 40">
        <rect x="4" y="4" width="14" height="14" rx="2" fill="#3b82f6" opacity=".25"/>
        <rect x="22" y="4" width="14" height="14" rx="2" fill="#3b82f6" opacity=".55"/>
        <rect x="4" y="22" width="14" height="14" rx="2" fill="#3b82f6" opacity=".55"/>
        <rect x="22" y="22" width="14" height="14" rx="2" fill="#3b82f6"/>
      </svg>
    ),
  },
  {
    id: 'skill-trends',
    name: 'Tendencia de Skills',
    desc: 'Uso de skills por dominio a lo largo del tiempo.',
    tag: '#Analytics',
    thumb: (
      <svg width="40" height="40" fill="none" viewBox="0 0 40 40">
        <polyline points="4 30 14 18 22 24 36 10" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="4" y1="34" x2="36" y2="34" stroke="#e2e8f0" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: 'project-velocity',
    name: 'Velocidad de Proyectos',
    desc: 'Tasa de avance y completado de proyectos por sprint.',
    tag: '#Operations',
    thumb: (
      <svg width="40" height="40" fill="none" viewBox="0 0 40 40">
        <rect x="4" y="22" width="8" height="14" fill="#3b82f6" rx="1.5"/>
        <rect x="16" y="14" width="8" height="22" fill="#3b82f6" rx="1.5" opacity=".65"/>
        <rect x="28" y="6" width="8" height="30" fill="#3b82f6" rx="1.5" opacity=".35"/>
      </svg>
    ),
  },
  {
    id: 'team-blockers',
    name: 'Bloqueadores del Equipo',
    desc: 'Número de bloqueadores activos por departamento.',
    tag: '#Operations',
    thumb: (
      <svg width="40" height="40" fill="none" viewBox="0 0 40 40">
        <path d="M20 4L4 32h32L20 4z" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round"/>
        <line x1="20" y1="16" x2="20" y2="24" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="20" cy="29" r="1.5" fill="#f59e0b"/>
      </svg>
    ),
  },
  {
    id: 'activity-trends',
    name: 'Tendencias de Actividad',
    desc: 'Análisis de tendencias de actividad semanal por agente.',
    tag: '#Strategy',
    thumb: (
      <svg width="40" height="40" fill="none" viewBox="0 0 40 40">
        <path d="M36 20A16 16 0 0 0 4 20h32z" fill="#a855f7" opacity=".2" stroke="#a855f7" strokeWidth="2"/>
        <path d="M4 20A16 16 0 0 1 36 20" stroke="#a855f7" strokeWidth="2.5"/>
        <line x1="20" y1="4" x2="20" y2="36" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3"/>
      </svg>
    ),
  },
];

export default function AddWidgetModal({ onClose, onAdd }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Añadir Widget</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="widget-grid">
          {WIDGETS.map(w => (
            <div
              key={w.id}
              className={`widget-option ${selected === w.id ? 'widget-selected' : ''}`}
              onClick={() => setSelected(w.id)}
            >
              <div className="widget-thumb">{w.thumb}</div>
              <div className="widget-info">
                <div className="widget-name">{w.name}</div>
                <div className="widget-desc">{w.desc}</div>
                <span className="widget-tag">{w.tag}</span>
              </div>
              <button
                className={`widget-select-btn ${selected === w.id ? 'widget-select-btn-active' : ''}`}
                onClick={(e) => { e.stopPropagation(); onAdd && onAdd(w.id); onClose(); }}
              >
                {selected === w.id ? '✓' : 'Select'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
