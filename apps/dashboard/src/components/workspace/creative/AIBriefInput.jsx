import React, { useState } from 'react';
import { API_URL } from '../../../api.js';

/**
 * AIBriefInput — "Inspirar con IA"
 *
 * Permite al usuario describir en lenguaje natural lo que quiere generar.
 * Llama a POST /api/creative/suggest-brief y devuelve un brief JSONB sugerido
 * que se puede aplicar al formulario activo.
 *
 * Props:
 *   type       {string}   — tipo de contenido activo (image, text_to_video, etc.)
 *   onSuggest  {function} — recibe el brief JSONB sugerido para pre-rellenar el form
 */
export default function AIBriefInput({ type, onSuggest, compact = false }) {
    const [description, setDescription] = useState('');
    const [loading, setLoading]         = useState(false);
    const [suggestion, setSuggestion]   = useState(null);
    const [error, setError]             = useState(null);
    const [collapsed, setCollapsed]     = useState(false);

    async function handleSuggest() {
        if (!description.trim() || !type) return;
        setLoading(true);
        setError(null);
        setSuggestion(null);
        try {
            const res = await fetch(`${API_URL}/creative/suggest-brief`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, context: description }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error generando sugerencia');
            setSuggestion(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleApply() {
        if (suggestion) {
            onSuggest(suggestion);
            setSuggestion(null);
            setDescription('');
        }
    }

    function handleKeyDown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSuggest();
        }
    }

    if (!type) return null;

    /* ── Compact bar mode (used in chat canvas) ── */
    if (compact) {
        return (
            <div className="cs2-ai-bar">
                {suggestion && (
                    <div className="cs2-ai-bar-suggestion">
                        <span style={{ flex: 1, color: 'var(--primary)', fontWeight: 500 }}>✨ Brief sugerido listo</span>
                        <button
                            type="button"
                            className="cs2-ai-apply-btn"
                            onClick={handleApply}
                        >
                            Aplicar →
                        </button>
                        <button
                            type="button"
                            onClick={() => setSuggestion(null)}
                            style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                    </div>
                )}
                {error && (
                    <p className="cs2-ai-brief-error" style={{ fontSize: '0.72rem' }}>{error}</p>
                )}
                <div className="cs2-ai-bar-row">
                    <textarea
                        className="cs2-ai-bar-textarea"
                        placeholder="Describe el contenido... (Cmd+Enter)"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={loading}
                    />
                    <button
                        type="button"
                        className="cs2-ai-bar-btn"
                        onClick={handleSuggest}
                        disabled={loading || !description.trim()}
                        aria-label="Inspirar con IA"
                    >
                        {loading
                            ? <span className="cs2-ai-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                            : '✨'
                        }
                    </button>
                </div>
            </div>
        );
    }

    /* ── Original collapsible panel ── */
    return (
        <div className={`cs2-ai-brief${collapsed ? ' collapsed' : ''}`}>
            <button
                className="cs2-ai-brief-header"
                onClick={() => setCollapsed(c => !c)}
                aria-expanded={!collapsed}
                type="button"
            >
                <span className="cs2-ai-brief-icon">✨</span>
                <span className="cs2-ai-brief-title">Inspirar con IA</span>
                <span className="cs2-ai-brief-chevron">{collapsed ? '▸' : '▾'}</span>
            </button>

            {!collapsed && (
                <div className="cs2-ai-brief-body">
                    <textarea
                        className="cs2-ai-brief-textarea"
                        placeholder="Describe lo que quieres generar... Ej: &quot;Un video corto de Fernando explicando el ROI de propiedades en Dubai Marina, tono profesional, para Instagram&quot;"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={3}
                        disabled={loading}
                    />
                    <p className="cs2-ai-brief-hint">
                        {description.trim() ? 'Cmd+Enter para generar' : 'Describe el contenido en lenguaje natural'}
                    </p>

                    {error && (
                        <p className="cs2-ai-brief-error">{error}</p>
                    )}

                    {suggestion && (
                        <div className="cs2-ai-brief-suggestion">
                            <p className="cs2-ai-suggestion-label">Sugerencia lista para aplicar</p>
                            <div className="cs2-ai-suggestion-preview">
                                {Object.entries(suggestion).slice(0, 3).map(([k, v]) => (
                                    <span key={k} className="cs2-ai-suggestion-tag">
                                        <strong>{k}:</strong> {typeof v === 'string' ? v.substring(0, 40) : JSON.stringify(v).substring(0, 30)}
                                    </span>
                                ))}
                            </div>
                            <button
                                className="cs2-ai-apply-btn"
                                onClick={handleApply}
                                type="button"
                            >
                                Aplicar al formulario →
                            </button>
                        </div>
                    )}

                    <button
                        className="cs2-ai-suggest-btn"
                        onClick={handleSuggest}
                        disabled={loading || !description.trim()}
                        type="button"
                    >
                        {loading ? (
                            <><span className="cs2-ai-spinner" />Generando sugerencia...</>
                        ) : (
                            'Auto-rellenar brief'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
