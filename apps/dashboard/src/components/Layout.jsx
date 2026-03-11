import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function Layout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const { lang, setLang, t } = useLanguage();

    const navItems = [
        { to: '/', icon: '📊', label: t('layout.dashboard') },
        { to: '/workspace', icon: '🏢', label: t('layout.workspace') },
        { to: '/workflows', icon: '⚡', label: t('layout.workflows') },
        { to: '/skills', icon: '🎯', label: t('layout.skillTracker') },
        { to: '/workspace/audit', icon: '📜', label: t('layout.auditLog') },
        { to: '/workspace/intelligence', icon: '🧠', label: t('layout.intelligence') },
        { to: '/inbox', icon: '📥', label: t('layout.inbox') },
        { to: '/pm-reports', icon: '📋', label: t('layout.pmReports') },
    ];

    const toggleLang = () => setLang(lang === 'es' ? 'en' : 'es');

    return (
        <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-nav-open' : ''}`}>
            {/* Mobile hamburger */}
            <button
                className="mobile-nav-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? t('layout.closeNav') : t('layout.openNav')}
            >
                {mobileOpen ? '\u2715' : '\u2630'}
            </button>

            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        {!collapsed && <span className="logo-text">Emiralia<span className="logo-accent">OS</span></span>}
                        {collapsed && <span className="logo-text">E</span>}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? t('layout.expand') : t('layout.collapse')}
                    >
                        {collapsed ? '\u203A' : '\u2039'}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/' || item.to === '/workspace'}
                            className={({ isActive }) => {
                                const isWorkspaceBase = item.to === '/workspace' && location.pathname.startsWith('/workspace') && !location.pathname.includes('/audit') && !location.pathname.includes('/intelligence');
                                return `sidebar-link ${isActive || isWorkspaceBase ? 'active' : ''}`;
                            }}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            {!collapsed && <span className="sidebar-label">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {/* Language toggle */}
                    <button
                        className="lang-toggle-btn"
                        onClick={toggleLang}
                        title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                    >
                        {collapsed ? (
                            <span className="lang-flag">{lang === 'es' ? '🇪🇸' : '🇬🇧'}</span>
                        ) : (
                            <div className="lang-toggle-inner">
                                <span className={`lang-option ${lang === 'es' ? 'lang-active' : ''}`}>🇪🇸 ES</span>
                                <span className="lang-divider">|</span>
                                <span className={`lang-option ${lang === 'en' ? 'lang-active' : ''}`}>EN 🇬🇧</span>
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

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
