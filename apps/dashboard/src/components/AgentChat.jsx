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
    const [generatingImage, setGeneratingImage] = useState(false);
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
    }, [messages, streaming, generatingImage]);

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
        setGeneratingImage(false);
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
            let imageData = null;

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
                        // Image generation started
                        if (parsed.generating_image) {
                            setGeneratingImage(true);
                            continue;
                        }
                        // Image result received
                        if (parsed.image) {
                            imageData = parsed.image;
                            setGeneratingImage(false);
                            setMessages(prev => {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    ...updated[updated.length - 1],
                                    image_url: parsed.image.url,
                                    image: parsed.image,
                                };
                                return updated;
                            });
                            continue;
                        }
                        if (parsed.text) {
                            fullResponse += parsed.text;
                            const captured = fullResponse;
                            const capturedImage = imageData;
                            setMessages(prev => {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    role: 'assistant',
                                    content: captured,
                                    ...(capturedImage ? { image_url: capturedImage.url, image: capturedImage } : {}),
                                };
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
            setGeneratingImage(false);
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    /**
     * Renders a single chat message, including inline images if present.
     */
    function renderMessage(msg, idx) {
        const isUser = msg.role === 'user';
        const hasImage = msg.image_url || msg.image;
        const imageUrl = msg.image_url || msg.image?.url;
        const isTelegram = msg.channel === 'telegram';

        // For telegram image URLs that are full DALL-E URLs (https://...)
        const resolvedImageUrl = imageUrl?.startsWith('http')
            ? imageUrl
            : imageUrl ? `${API_URL.replace('/api', '')}${imageUrl}` : null;

        return (
            <div
                key={idx}
                style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start'
                }}
            >
                <div
                    style={{
                        maxWidth: '75%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: isUser ? '#2563eb' : '#f1f5f9',
                        color: isUser ? '#ffffff' : '#1e293b',
                        fontSize: '0.95rem',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        border: isTelegram ? '2px solid #0088cc22' : 'none',
                    }}
                >
                    {/* Channel indicator */}
                    {isTelegram && (
                        <div style={{
                            fontSize: '0.72rem',
                            color: isUser ? '#93c5fd' : '#0088cc',
                            marginBottom: '4px',
                            fontWeight: 600,
                        }}>
                            via Telegram
                        </div>
                    )}

                    {/* Image display */}
                    {hasImage && resolvedImageUrl && (
                        <div style={{ marginBottom: msg.content ? '8px' : 0 }}>
                            <img
                                src={resolvedImageUrl}
                                alt={msg.image?.revisedPrompt || 'Generated image'}
                                style={{
                                    maxWidth: '100%',
                                    borderRadius: '8px',
                                    display: 'block',
                                }}
                                loading="lazy"
                            />
                            {msg.image && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '6px',
                                    fontSize: '0.78rem',
                                    color: '#64748b',
                                }}>
                                    <span>{msg.image.filename}</span>
                                    <span>${msg.image.cost} USD</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Text content */}
                    {msg.content || (streaming && msg.role === 'assistant' && !hasImage ? '...' : '')}
                </div>
            </div>
        );
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
                        Chat with {agentId}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                        {messages.length} messages
                        {messages.some(m => m.channel === 'telegram') && (
                            <span style={{ marginLeft: '8px', color: '#0088cc' }}>
                                (incl. Telegram)
                            </span>
                        )}
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
                        x
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
                        <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Chat</p>
                        <p>{t('agentChat.startConversation') || 'Start a conversation with this agent'}</p>
                    </div>
                )}

                {messages.map((msg, idx) => renderMessage(msg, idx))}

                {/* Image generating indicator */}
                {generatingImage && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-start'
                    }}>
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            color: '#64748b',
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                border: '2px solid #2563eb',
                                borderTopColor: 'transparent',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                            Generando imagen...
                        </div>
                    </div>
                )}

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
                    {error}
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

            {/* Spinner keyframe animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
