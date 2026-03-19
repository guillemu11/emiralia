import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { API_URL } from '../api.js';
import AgentChat from '../components/AgentChat.jsx';

const themeMap = {
    data: 'theme-green',
    seo: 'theme-amber',
    dev: 'theme-cyan',
    content: 'theme-amber',
    sales: 'theme-rose',
    marketing: 'theme-rose',
    design: 'theme-indigo',
    product: 'theme-purple',
};

// Mapea event_type a un tipo visual para el CSS
function eventTypeToVisual(eventType) {
    switch (eventType) {
        case 'tool_call': return 'info';
        case 'task_complete': return 'success';
        case 'error': return 'warning';
        default: return 'info';
    }
}

// Extrae un mensaje legible de un evento de la API
function formatEventContent(event) {
    if (!event.content) return event.event_type;
    if (typeof event.content === 'string') return event.content;
    // content es un objeto JSON: intentar extraer un resumen
    return event.content.message || event.content.summary || JSON.stringify(event.content);
}

function formatEventTime(timestamp, lang) {
    if (!timestamp) return '--:--';
    const d = new Date(timestamp);
    return d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function AgentDetail() {
    const { agentId } = useParams();
    const navigate = useNavigate();
    const { t, lang } = useLanguage();

    const statusConfig = {
        active: { color: '#10b981', label: t('status.active'), bg: '#ecfdf5' },
        idle: { color: '#f59e0b', label: t('status.idle'), bg: '#fffbeb' },
        offline: { color: '#94a3b8', label: t('status.offline'), bg: '#f1f5f9' },
        error: { color: '#ef4444', label: t('status.error'), bg: '#fef2f2' },
    };

    const moodLabels = {
        productive: { emoji: '🟢', label: t('mood.productive') },
        neutral: { emoji: '🟡', label: t('mood.neutral') },
        blocked: { emoji: '🔴', label: t('mood.blocked') },
        frustrated: { emoji: '😤', label: t('mood.frustrated') || 'Frustrado' },
        focused: { emoji: '🎯', label: t('mood.focused') },
    };

    const [activeTab, setActiveTab] = useState('skills');
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        avatar: '',
        skills: '',
        tools: ''
    });

    const fetchAgent = () => {
        setLoading(true);
        setError(null);
        fetch(`${API_URL}/agents/${agentId}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
                return res.json();
            })
            .then((data) => {
                setAgent(data);
                setFormData({
                    name: data.name,
                    role: data.role,
                    avatar: data.avatar,
                    skills: (data.skills || []).join(', '),
                    tools: (data.tools || []).join(', ')
                });
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAgent();
    }, [agentId]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const body = {
                ...formData,
                skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
                tools: formData.tools.split(',').map(t => t.trim()).filter(t => t)
            };

            const res = await fetch(`${API_URL}/agents/${agentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error(t('agentDetail.errorUpdating'));

            setShowModal(false);
            fetchAgent();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container animate-fade-in">
                <button className="back-button" onClick={() => navigate('/workspace')}>← {t('agentDetail.back')}</button>
                <div className="empty-state">{t('agentDetail.loadingAgent')}</div>
            </div>
        );
    }

    if (error || !agent) {
        return (
            <div className="dashboard-container animate-fade-in">
                <button className="back-button" onClick={() => navigate('/workspace')}>← {t('agentDetail.back')}</button>
                <p>{error || t('agentDetail.agentNotFound')}</p>
            </div>
        );
    }

    const st = statusConfig[agent.status] || statusConfig.offline;
    const theme = themeMap[agent.department] || '';
    const skills = agent.skills || [];
    const tools = agent.tools || [];
    const eodReports = agent.eod_reports || [];
    const recentEvents = agent.recent_events || [];

    const tabs = [
        { id: 'chat', label: 'Chat', icon: '💬', count: 0 },
        { id: 'skills', label: 'Skills', icon: '🛠', count: skills.length },
        { id: 'tools', label: 'Tools', icon: '🔧', count: tools.length },
        { id: 'workflows', label: 'Workflows', icon: '📋', count: 0 },
        { id: 'activity', label: t('agentDetail.activity'), icon: '📊', count: recentEvents.length },
        { id: 'eod', label: 'EOD Reports', icon: '📝', count: eodReports.length },
    ];

    return (
        <div className={`dashboard-container animate-fade-in ${theme}`}>
            <button className="back-button" onClick={() => navigate(`/workspace/${agent.department}`)}>
                ← {t('agentDetail.backTo')} {agent.department}
            </button>

            {/* Agent Profile Header */}
            <section className="agent-profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="agent-profile-left">
                    <div className="agent-profile-avatar-wrapper">
                        <span className="agent-profile-avatar">{agent.avatar}</span>
                        <span className="agent-profile-status-dot" style={{ background: st.color }}></span>
                    </div>
                    <div className="agent-profile-info">
                        <h1 style={{ marginBottom: '4px' }}>{agent.name}</h1>
                        <p className="agent-profile-role">{agent.role}</p>
                        <div className="agent-profile-badges">
                            <span className="dept-badge">
                                {agent.department}
                            </span>
                            <span className="agent-status-badge" style={{ background: st.bg, color: st.color }}>
                                {st.label}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    className="back-button"
                    style={{ margin: 0, background: 'var(--primary)', color: 'white' }}
                    onClick={() => setShowModal(true)}
                >
                    {t('agentDetail.editProfile')}
                </button>
            </section>

            {/* Tabs */}
            <div className="agent-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`agent-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span className="agent-tab-count">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <section className="agent-tab-content">
                {/* Chat Tab */}
                {activeTab === 'chat' && (
                    <div className="agent-chat-wrapper">
                        <AgentChat
                            agentId={agentId}
                            userId="dashboard-user"
                        />
                    </div>
                )}

                {/* Skills Tab - string tags */}
                {activeTab === 'skills' && (
                    <div className="agent-skills-list">
                        {skills.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {skills.map((skillId) => (
                                    <span key={skillId} className="card skill-card animate-fade-in" style={{
                                        display: 'inline-block',
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                    }}>
                                        {skillId}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">{t('agentDetail.noSkills')}</div>
                        )}
                    </div>
                )}

                {/* Tools Tab - string tags */}
                {activeTab === 'tools' && (
                    <div className="agent-tools-list">
                        {tools.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {tools.map((toolId) => (
                                    <span key={toolId} className="card tool-detail-card animate-fade-in" style={{
                                        display: 'inline-block',
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                    }}>
                                        🔧 {toolId}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">{t('agentDetail.noTools')}</div>
                        )}
                    </div>
                )}

                {/* Workflows Tab - empty state por ahora */}
                {activeTab === 'workflows' && (
                    <div className="agent-workflows-list">
                        <div className="empty-state">{t('agentDetail.noWorkflows')}</div>
                    </div>
                )}

                {/* Activity Tab - recent_events de la API */}
                {activeTab === 'activity' && (
                    <div className="agent-activity-feed">
                        {recentEvents.length > 0 ? (
                            recentEvents.map((event, i) => (
                                <div key={event.id || i} className="activity-item animate-fade-in">
                                    <div className="activity-time">{formatEventTime(event.timestamp, lang)}</div>
                                    <div className={`activity-dot ${eventTypeToVisual(event.event_type)}`}></div>
                                    <div className="activity-message">{formatEventContent(event)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">{t('agentDetail.noActivity')}</div>
                        )}
                    </div>
                )}

                {/* EOD Reports Tab */}
                {activeTab === 'eod' && (
                    <div className="agent-eod-reports">
                        {eodReports.length > 0 ? (
                            eodReports.map((report) => {
                                const m = moodLabels[report.mood] || { emoji: '⚪', label: report.mood };
                                const completedCount = Array.isArray(report.completed_tasks) ? report.completed_tasks.length : 0;
                                const blockersCount = Array.isArray(report.blockers) ? report.blockers.length : 0;
                                const inProgressCount = Array.isArray(report.in_progress_tasks) ? report.in_progress_tasks.length : 0;
                                const insightsCount = Array.isArray(report.insights) ? report.insights.length : 0;

                                return (
                                    <div key={report.id} className="card animate-fade-in" style={{ marginBottom: '16px', padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                                                {new Date(report.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', {
                                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                                })}
                                            </h3>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                background: '#f1f5f9',
                                            }}>
                                                {m.emoji} {m.label}
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                                            <div style={{ textAlign: 'center', padding: '12px', background: '#ecfdf5', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{completedCount}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('agentDetail.completed')}</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '12px', background: '#fffbeb', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{inProgressCount}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('agentDetail.inProgress')}</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '12px', background: blockersCount > 0 ? '#fef2f2' : '#f1f5f9', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: blockersCount > 0 ? '#ef4444' : '#94a3b8' }}>{blockersCount}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Blockers</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '12px', background: '#eef2ff', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{insightsCount}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Insights</div>
                                            </div>
                                        </div>

                                        {/* Detalles expandidos */}
                                        {completedCount > 0 && (
                                            <div style={{ marginTop: '12px' }}>
                                                <strong style={{ fontSize: '0.85rem' }}>{t('agentDetail.completed')}:</strong>
                                                <ul style={{ margin: '4px 0 0 16px', fontSize: '0.85rem', color: '#475569' }}>
                                                    {report.completed_tasks.map((task, i) => (
                                                        <li key={i}>{typeof task === 'string' ? task : JSON.stringify(task)}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {blockersCount > 0 && (
                                            <div style={{ marginTop: '8px' }}>
                                                <strong style={{ fontSize: '0.85rem', color: '#ef4444' }}>Blockers:</strong>
                                                <ul style={{ margin: '4px 0 0 16px', fontSize: '0.85rem', color: '#475569' }}>
                                                    {report.blockers.map((b, i) => (
                                                        <li key={i}>{typeof b === 'string' ? b : JSON.stringify(b)}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {insightsCount > 0 && (
                                            <div style={{ marginTop: '8px' }}>
                                                <strong style={{ fontSize: '0.85rem', color: '#6366f1' }}>Insights:</strong>
                                                <ul style={{ margin: '4px 0 0 16px', fontSize: '0.85rem', color: '#475569' }}>
                                                    {report.insights.map((insight, i) => (
                                                        <li key={i}>{typeof insight === 'string' ? insight : JSON.stringify(insight)}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="empty-state">{t('agentDetail.noEod')}</div>
                        )}
                    </div>
                )}
            </section>

            {/* ════════ EDIT AGENT MODAL ════════ */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ marginBottom: '20px' }}>{t('agentDetail.editAgentProfile')}</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label className="edit-label">{t('agentDetail.avatar')}</label>
                                    <input
                                        className="edit-input-inline"
                                        value={formData.avatar}
                                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                        placeholder="🤖"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="edit-label">{t('agentDetail.name')}</label>
                                    <input
                                        className="edit-input-inline"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label className="edit-label">{t('agentDetail.role')}</label>
                                <input
                                    className="edit-input-inline"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label className="edit-label">{t('agentDetail.skillsComma')}</label>
                                <input
                                    className="edit-input-inline"
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    placeholder="Python, Scrapy, Selenium..."
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label className="edit-label">{t('agentDetail.toolsComma')}</label>
                                <input
                                    className="edit-input-inline"
                                    value={formData.tools}
                                    onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
                                    placeholder="Browser, FileSystem, MCP:GoogleMaps..."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" className="back-button" style={{ flex: 1, margin: 0 }} onClick={() => setShowModal(false)}>
                                    {t('agentDetail.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="back-button"
                                    style={{ flex: 1, margin: 0, background: 'var(--primary)', color: 'white' }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? t('agentDetail.saving') : t('agentDetail.saveChanges')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
