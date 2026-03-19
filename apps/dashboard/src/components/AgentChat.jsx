import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { API_URL } from '../api.js';

/**
 * AgentChat - Generic chat component for all agents
 *
 * Props:
 *   - agentId: string (required) - Agent ID (e.g., 'data-agent', 'pm-agent')
 *   - userId: string (optional) - User ID for conversation persistence (default: 'dashboard-user')
 *   - onClose: function (optional) - Callback when chat is closed
 */
export default function AgentChat({ agentId, userId = 'dashboard-user', onClose }) {
    const { t } = useLanguage();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    // Load existing conversation when component mounts
    useEffect(() => {
        loadConversation();
    }, [agentId, userId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streaming]);

    async function loadConversation() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/agents/${agentId}/conversation?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to load conversation');
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (err) {
            console.error('[AgentChat] Error loading conversation:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function sendMessage() {
        const msg = input.trim();
        if (!msg || streaming) return;

        const userMsg = { role: 'user', content: msg };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setStreaming(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    userId
                }),
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            // Add placeholder assistant message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) {
                            setError(parsed.error);
                            continue;
                        }
                        if (parsed.text) {
                            fullResponse += parsed.text;
                            const captured = fullResponse;
                            setMessages(prev => {
                                const updated = [...prev];
                                updated[updated.length - 1] = { role: 'assistant', content: captured };
                                return updated;
                            });
                        }
                    } catch (e) {
                        console.error('[AgentChat] Error parsing SSE data:', e);
                    }
                }
            }
        } catch (err) {
            console.error('[AgentChat] Send error:', err);
            setError(err.message);
            // Remove empty assistant message on error
            setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1].content) {
                    updated.pop();
                }
                return updated;
            });
        } finally {
            setStreaming(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                {t('loading')}...
            </div>
        );
    }

    return (
        <div className="agent-chat-container" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#ffffff'
        }}>
            {/* Chat Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                        💬 Chat with {agentId}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                        {messages.length} messages
                    </p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#64748b'
                        }}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {messages.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: '#94a3b8'
                    }}>
                        <p style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</p>
                        <p>{t('agentChat.startConversation') || 'Start a conversation with this agent'}</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div
                            style={{
                                maxWidth: '75%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: msg.role === 'user' ? '#2563eb' : '#f1f5f9',
                                color: msg.role === 'user' ? '#ffffff' : '#1e293b',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}
                        >
                            {msg.content || (streaming && msg.role === 'assistant' ? '...' : '')}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    margin: '0 16px',
                    padding: '12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '0.9rem'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Input Area */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc'
            }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('agentChat.typeMessage') || 'Type a message...'}
                        disabled={streaming}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.95rem',
                            fontFamily: 'inherit',
                            resize: 'none',
                            minHeight: '44px',
                            maxHeight: '120px',
                            background: '#ffffff'
                        }}
                        rows={2}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || streaming}
                        style={{
                            padding: '12px 24px',
                            background: streaming ? '#94a3b8' : '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: streaming ? 'not-allowed' : 'pointer',
                            height: '44px'
                        }}
                    >
                        {streaming ? '...' : t('send') || 'Send'}
                    </button>
                </div>
                <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '0.8rem',
                    color: '#94a3b8'
                }}>
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
