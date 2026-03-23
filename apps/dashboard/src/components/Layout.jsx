import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';

// ─── Lucide-style SVG Icons ───────────────────────────────────────────────────

const Icon = ({ name, size = 18 }) => {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      </>
    ),
    workspace: (
      <>
        <rect x="3" y="9" width="18" height="13" rx="2"/>
        <path d="M3 11V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
        <path d="M12 2v5"/>
      </>
    ),
    workflows: (
      <>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </>
    ),
    skills: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </>
    ),
    audit: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </>
    ),
    intelligence: (
      <>
        <path d="M12 2a6 6 0 0 1 6 6c0 3.5-2.5 5.5-3 8H9c-.5-2.5-3-4.5-3-8a6 6 0 0 1 6-6z"/>
        <path d="M8.7 19h6.6"/>
        <path d="M10 22h4"/>
      </>
    ),
    inbox: (
      <>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
      </>
    ),
    reports: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="9" x2="9" y2="21"/>
      </>
    ),
    menu: (
      <>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </>
    ),
    chevronLeft: (
      <polyline points="15 18 9 12 15 6"/>
    ),
    chevronRight: (
      <polyline points="9 18 15 12 9 6"/>
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </>
    ),
    creative: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M10 9l5 3-5 3V9z"/>
        <path d="M2 8h3"/>
        <path d="M2 12h3"/>
        <path d="M2 16h3"/>
      </>
    ),
    campaign: (
      <>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
};

// ─── Nav Groups ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/', icon: 'dashboard', labelKey: 'layout.dashboard' },
      { to: '/workspace', icon: 'workspace', labelKey: 'layout.workspace' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/workflows', icon: 'workflows', labelKey: 'layout.workflows' },
      { to: '/skills', icon: 'skills', labelKey: 'layout.skillTracker' },
      { to: '/workspace/intelligence', icon: 'intelligence', labelKey: 'layout.intelligence' },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { to: '/creative-studio',   icon: 'creative',  labelKey: 'layout.creativeStudio' },
      { to: '/campaign-manager',  icon: 'campaign',  labelKey: 'layout.campaignManager' },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { to: '/crm', icon: 'users', labelKey: 'layout.crm' },
    ],
  },
  {
    label: 'Registros',
    items: [
      { to: '/workspace/audit', icon: 'audit', labelKey: 'layout.auditLog' },
      { to: '/pm-reports', icon: 'reports', labelKey: 'layout.pmReports' },
      { to: '/inbox', icon: 'inbox', labelKey: 'layout.inbox' },
    ],
  },
];

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();

  const toggleLang = () => setLang(lang === 'es' ? 'en' : 'es');

  const isWorkspaceActive = (to) => {
    if (to === '/workspace') {
      return location.pathname.startsWith('/workspace') &&
        !location.pathname.includes('/audit') &&
        !location.pathname.includes('/intelligence');
    }
    return false;
  };

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-nav-open' : ''}`}>

      {/* Mobile hamburger */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? t('layout.closeNav') : t('layout.openNav')}
      >
        <Icon name={mobileOpen ? 'close' : 'menu'} size={22} />
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon-wrap">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <rect x="2" y="2" width="9" height="9" rx="2" fill="#3b82f6"/>
                <rect x="13" y="2" width="9" height="9" rx="2" fill="#3b82f6" opacity=".5"/>
                <rect x="2" y="13" width="9" height="9" rx="2" fill="#3b82f6" opacity=".5"/>
                <rect x="13" y="13" width="9" height="9" rx="2" fill="#3b82f6" opacity=".25"/>
              </svg>
            </div>
            {!collapsed && (
              <span className="logo-text">
                Emiralia<span className="logo-accent">OS</span>
              </span>
            )}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? t('layout.expand') : t('layout.collapse')}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="nav-group">
              {!collapsed && (
                <span className="nav-group-label">{group.label}</span>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/' || item.to === '/workspace'}
                  className={({ isActive }) => {
                    const active = isActive || isWorkspaceActive(item.to);
                    return `sidebar-link ${active ? 'active' : ''}`;
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sidebar-icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  {!collapsed && (
                    <span className="sidebar-label">{t(item.labelKey)}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="lang-toggle-btn"
            onClick={toggleLang}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            {collapsed ? (
              <span className="lang-flag"><Icon name="globe" size={15} /></span>
            ) : (
              <div className="lang-toggle-inner">
                <Icon name="globe" size={13} style={{ opacity: 0.6 }} />
                <span className={`lang-option ${lang === 'es' ? 'lang-active' : ''}`}>ES</span>
                <span className="lang-divider">|</span>
                <span className={`lang-option ${lang === 'en' ? 'lang-active' : ''}`}>EN</span>
              </div>
            )}
          </button>
          {!collapsed && (
            <div className="sidebar-version">
              <span className="version-dot"></span>
              v0.1.0 — Phase 0
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Area (top nav + content) ── */}
      <div className="main-area">
        <header className="top-nav">
          <div className="top-nav-search">
            <Icon name="search" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              className="top-nav-input"
              readOnly
            />
            <kbd className="top-nav-kbd">⌘K</kbd>
          </div>
          <div className="top-nav-actions">
            <button className="top-nav-icon-btn" title="Notificaciones">
              <Icon name="bell" size={18} />
            </button>
            <div className="top-nav-avatar" title="Emiralia">
              E
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
