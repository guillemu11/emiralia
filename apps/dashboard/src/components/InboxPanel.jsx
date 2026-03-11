import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { API_URL } from '../api.js';

const DEPARTMENTS = ['data', 'seo', 'dev', 'content', 'sales', 'marketing', 'design', 'product'];

export default function InboxPanel({ department, selectedId, onSelectItem, onDeleted, readOnly = false }) {
    const { t, lang } = useLanguage();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [quickTitle, setQuickTitle] = useState('');
    const [quickDept, setQuickDept] = useState(department || '');

    const STATUS_FILTERS = [
        { value: 'all', label: t('inboxPanel.all') },
        { value: 'chat', label: `💬 ${t('inboxPanel.chat')}` },
        { value: 'borrador', label: `📝 ${t('inboxPanel.draft')}` },
        { value: 'proyecto', label: `🚀 ${t('inboxPanel.project')}` },
        { value: 'discarded', label: t('inboxPanel.discarded') },
    ];

    const STATUS_LABELS = {
        chat: `💬 ${t('inboxPanel.statusChat')}`,
        borrador: `📝 ${t('inboxPanel.statusDraft')}`,
        proyecto: `🚀 ${t('inboxPanel.statusProject')}`,
        discarded: `🗑️ ${t('inboxPanel.statusDiscarded')}`,
    };

    useEffect(() => {
        loadItems();
    }, [department, statusFilter]);

    async function loadItems() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (department) params.set('department', department);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            const res = await fetch(`${API_URL}/inbox?${params}`);
            const data = await res.json();
            setItems(data);
        } catch { /* ignore */ }
        setLoading(false);
    }

    async function handleQuickAdd(e) {
        e.preventDefault();
        if (!quickTitle.trim()) return;
        try {
            await fetch(`${API_URL}/inbox`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: quickTitle.trim(), department: quickDept || null }),
            });
            setQuickTitle('');
            loadItems();
        } catch { /* ignore */ }
    }

    async function handleDelete(e, id) {
        e.stopPropagation();
        try {
            await fetch(`${API_URL}/inbox/${id}`, { method: 'DELETE' });
            setItems(prev => prev.filter(item => item.id !== id));
            if (selectedId === id) onDeleted?.();
        } catch { /* ignore */ }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
    }

    return (
        <div>
            <div className="inbox-header-row">
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    {t('inboxPanel.inbox')}
                </h2>
                {!readOnly && (
                    <button
                        className="back-button"
                        style={{ background: '#FF385C', color: '#fff', fontSize: '0.82rem', padding: '8px 16px' }}
                        onClick={() => onSelectItem(null)}
                    >
                        {t('inboxPanel.newIdea')}
                    </button>
                )}
            </div>

            {/* Quick add */}
            {!readOnly && (
                <form className="inbox-quick-add" onSubmit={handleQuickAdd}>
                    <input
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder={t('inboxPanel.quickAddPlaceholder')}
                    />
                    <select value={quickDept} onChange={(e) => setQuickDept(e.target.value)}>
                        <option value="">{t('inboxPanel.dept')}</option>
                        {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                        ))}
                    </select>
                    <button type="submit">{t('inboxPanel.add')}</button>
                </form>
            )}

            {/* Status filters */}
            <div className="inbox-filters">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.value}
                        className={`inbox-filter-pill ${statusFilter === f.value ? 'active' : ''}`}
                        onClick={() => setStatusFilter(f.value)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Items list */}
            {loading ? (
                <p className="subtitle">{t('inboxPanel.loading')}</p>
            ) : items.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                    <p style={{ color: 'var(--text-muted)' }}>{t('inboxPanel.noIdeas')}</p>
                </div>
            ) : (
                <div className="inbox-items-list">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`inbox-item-card ${selectedId === item.id ? 'selected' : ''}`}
                            onClick={() => onSelectItem(item.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <div className="inbox-item-title">{item.title}</div>
                                <button
                                    onClick={(e) => handleDelete(e, item.id)}
                                    title={t('inboxPanel.delete')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        padding: '2px 6px',
                                        borderRadius: 6,
                                        fontSize: '0.85rem',
                                        lineHeight: 1,
                                        flexShrink: 0,
                                        opacity: 0.4,
                                        transition: 'opacity 0.15s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.4}
                                >
                                    &times;
                                </button>
                            </div>
                            <div className="inbox-item-meta">
                                <span className={`source-badge ${item.source}`}>
                                    {item.source === 'telegram' ? `📱 ${t('inboxPanel.telegram')}` : item.source === 'agent' ? `🤖 ${t('inboxPanel.agent')}` : `💻 ${t('inboxPanel.dashboardSource')}`}
                                </span>
                                <span className={`inbox-status-dot ${item.status}`}></span>
                                <span>{STATUS_LABELS[item.status] || item.status}</span>
                                {item.department && <span style={{ textTransform: 'capitalize' }}>{item.department}</span>}
                                <span>{formatDate(item.created_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
