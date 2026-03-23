import React from 'react';

const ICONS = {
  projects: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  agents: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  skills: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  tasks: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  trend: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
};

export default function StatsCard({ label, value, change, changeType = 'neutral', icon = 'projects', color = '#3b82f6' }) {
  const isUp = changeType === 'up';
  const isDown = changeType === 'down';
  const softBg = color + '18';

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <span className="stats-card-label">{label}</span>
        <div className="stats-card-icon" style={{ background: softBg, color }}>
          {ICONS[icon] || ICONS.projects}
        </div>
      </div>
      <div className="stats-card-value">{value ?? '—'}</div>
      {change !== undefined && (
        <div className={`stats-card-change ${isUp ? 'change-up' : isDown ? 'change-down' : 'change-neutral'}`}>
          {isUp && <span className="change-arrow">↑</span>}
          {isDown && <span className="change-arrow">↓</span>}
          <span>{change}</span>
          <span className="change-vs">vs. período anterior</span>
        </div>
      )}
    </div>
  );
}
