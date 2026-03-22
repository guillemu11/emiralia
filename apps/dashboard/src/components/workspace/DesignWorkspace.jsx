import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../api.js';
import ArtifactPreviewModal from './ArtifactPreviewModal.jsx';
import {
    STATUS_COLORS,
    DESIGN_TYPES,
    DESIGN_TYPE_LABELS,
    DESIGN_TYPE_ICONS,
    DESIGN_HANDOFF_AGENTS,
} from './artifactConstants.js';

// ─── Brand Check (client-side) ────────────────────────────────────────────────

function runBrandCheck(artifact) {
    const issues = [];
    let deductions = 0;
    const src = (artifact.content || '') + ' ' + JSON.stringify(artifact.metadata || {});

    // Regla 1: secciones oscuras (max 2-3)
    const darkMatches = (src.match(/bg-slate-[89]00|bg-black|bg-gray-[89]00/g) || []).length;
    if (darkMatches > 3) {
        issues.push(`Demasiadas secciones oscuras: ${darkMatches} (máximo 3)`);
        deductions += Math.min(40, (darkMatches - 3) * 10);
    }

    // Regla 2: text-white sobre bg-white
    if (/bg-white[^}]{0,80}text-white|text-white[^}]{0,80}bg-white/.test(src)) {
        issues.push('Anti-patrón: text-white sobre bg-white (contraste 0:1)');
        deductions += 30;
    }

    // Regla 3: texto oscuro sobre fondo oscuro
    if (/(bg-slate-9|bg-black)[^}]{0,80}(text-slate-9|text-slate-6)/.test(src)) {
        issues.push('Anti-patrón: texto oscuro sobre fondo oscuro');
        deductions += 30;
    }

    // Regla 4: cards sin rounded-2xl
    const hasCards = /card|property-card|developer-card/.test(src);
    const hasRounded = /rounded-2xl|rounded-3xl/.test(src);
    if (hasCards && !hasRounded) {
        issues.push('Cards sin rounded-2xl (ver brand guidelines sección 8)');
        deductions += 10;
    }

    const score = Math.max(0, 100 - deductions);
    return {
        score,
        passed: score >= 70 && darkMatches <= 2,
        issues,
        darkCount: darkMatches,
    };
}

// ─── Design Preview Modal (iframe para page_design) ──────────────────────────

function DesignPreviewModal({ artifact, onClose }) {
    const [tab, setTab] = useState('vista');

    return (
        <div
            className="modal-overlay"
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
            onClick={onClose}
        >
            <div
                style={{ width: '100%', maxWidth: 900, background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{DESIGN_TYPE_ICONS[artifact.type] || '🎨'}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>{artifact.title || '(sin título)'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                            {DESIGN_TYPE_LABELS[artifact.type] || artifact.type}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20, lineHeight: 1 }}>✕</button>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
                    {[{ id: 'vista', label: 'Vista' }, { id: 'metadata', label: 'Metadata' }].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            style={{
                                padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                                fontWeight: tab === t.id ? 600 : 400,
                                color: tab === t.id ? '#6366f1' : '#64748b',
                                borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                                fontSize: '0.85rem',
                            }}
                        >{t.label}</button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: 24 }}>
                    {tab === 'vista' && (
                        artifact.metadata?.url ? (
                            <iframe
                                src={artifact.metadata.url}
                                style={{ width: '100%', height: 520, border: '1px solid #e2e8f0', borderRadius: 8 }}
                                title={artifact.title}
                                sandbox="allow-scripts allow-same-origin"
                            />
                        ) : (
                            <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, color: '#334155', fontSize: '0.88rem', background: '#f8fafc', padding: 16, borderRadius: 8, minHeight: 200 }}>
                                {artifact.content || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin contenido todavía.</span>}
                            </pre>
                        )
                    )}
                    {tab === 'metadata' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Tipo', value: DESIGN_TYPE_LABELS[artifact.type] || artifact.type },
                                { label: 'Estado', value: STATUS_COLORS[artifact.status]?.label || artifact.status },
                                { label: 'URL', value: artifact.metadata?.url || '—' },
                                { label: 'Descripción', value: artifact.metadata?.description || '—' },
                                { label: 'Brand Check Score', value: artifact.metadata?.brand_check_score != null ? `${artifact.metadata.brand_check_score}/100` : '—' },
                                { label: 'Forked from', value: artifact.metadata?.forked_from || '—' },
                                { label: 'Creado', value: artifact.created_at ? new Date(artifact.created_at).toLocaleDateString('es-ES') : '—' },
                            ].map(row => (
                                <div key={row.label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ minWidth: 160, color: '#64748b', fontSize: '0.85rem' }}>{row.label}</span>
                                    <span style={{ color: '#0f172a', fontSize: '0.85rem', wordBreak: 'break-all' }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Design Artifact Card ─────────────────────────────────────────────────────

function DesignArtifactCard({ artifact, onPreview, onEdit, onStatusChange, onDeploy, onFork, onBrandCheck }) {
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [handoffOpen, setHandoffOpen] = useState(false);
    const handoffRef = useRef(null);

    const statusMeta = STATUS_COLORS[artifact.status] || STATUS_COLORS.draft;
    const statusLabel = artifact.status === 'published' ? 'Deployed' : statusMeta.label;
    const typeLabel   = DESIGN_TYPE_LABELS[artifact.type] || artifact.type;
    const typeIcon    = DESIGN_TYPE_ICONS[artifact.type] || '🎨';
    const canBrandCheck = ['page_design', 'mockup'].includes(artifact.type);

    useEffect(() => {
        function handleClick(e) {
            if (handoffRef.current && !handoffRef.current.contains(e.target)) {
                setHandoffOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
            {/* Top accent bar — indigo */}
            <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />

            <div style={{ padding: '16px 16px 12px' }}>
                {/* Badges row */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#ede9fe', color: '#6d28d9' }}>
                        {typeIcon} {typeLabel}
                    </span>
                    <span style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: statusMeta.bg, color: statusMeta.color,
                    }}>
                        {statusLabel}
                    </span>
                    {artifact.metadata?.brand_check_score != null && (
                        <span style={{
                            fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: artifact.metadata.brand_check_score >= 70 ? '#ecfdf5' : '#fef2f2',
                            color: artifact.metadata.brand_check_score >= 70 ? '#10b981' : '#ef4444',
                        }}>
                            Brand {artifact.metadata.brand_check_score}/100
                        </span>
                    )}
                </div>

                {/* Title */}
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', marginBottom: 6, lineHeight: 1.4 }}>
                    {artifact.title || '(sin título)'}
                </div>

                {/* Content preview */}
                {artifact.content && (
                    <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: 8,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {artifact.content.replace(/^#+\s+/gm, '').replace(/\*\*/g, '')}
                    </div>
                )}

                {/* URL pill */}
                {artifact.metadata?.url && (
                    <a
                        href={artifact.metadata.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: '#6366f1', textDecoration: 'none',
                            background: '#eef2ff', padding: '2px 8px', borderRadius: 12, display: 'inline-block' }}
                        onClick={e => e.stopPropagation()}
                    >
                        🔗 {artifact.metadata.url.replace(/^https?:\/\//, '').slice(0, 40)}
                    </a>
                )}

                {/* Date */}
                <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: 8 }}>
                    {artifact.created_at ? new Date(artifact.created_at).toLocaleDateString('es-ES') : ''}
                </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {/* Ver siempre visible */}
                <button className="artifact-action-btn" onClick={() => onPreview(artifact)} title="Ver">👁 Ver</button>
                <button className="artifact-action-btn" onClick={() => onEdit(artifact)} title="Editar">✏️</button>

                {/* Draft */}
                {artifact.status === 'draft' && (
                    <button className="artifact-action-btn"
                        onClick={() => onStatusChange(artifact.id, 'pending_review')}
                        title="Enviar a revisión">
                        → Revisión
                    </button>
                )}

                {/* Pending review */}
                {artifact.status === 'pending_review' && !rejectOpen && (
                    <>
                        <button className="artifact-action-btn approve"
                            onClick={() => onStatusChange(artifact.id, 'approved')}>
                            ✅ Aprobar
                        </button>
                        <button className="artifact-action-btn reject"
                            onClick={() => setRejectOpen(true)}>
                            ❌
                        </button>
                    </>
                )}
                {artifact.status === 'pending_review' && rejectOpen && (
                    <div style={{ display: 'flex', gap: 4, width: '100%', alignItems: 'center' }}>
                        <input
                            autoFocus
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Motivo de rechazo…"
                            style={{ flex: 1, fontSize: '0.78rem', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6 }}
                        />
                        <button className="artifact-action-btn reject"
                            onClick={() => { onStatusChange(artifact.id, 'rejected', rejectReason); setRejectOpen(false); setRejectReason(''); }}>
                            Rechazar
                        </button>
                        <button className="artifact-action-btn" onClick={() => setRejectOpen(false)}>✕</button>
                    </div>
                )}

                {/* Approved */}
                {artifact.status === 'approved' && (
                    <button className="artifact-action-btn publish"
                        onClick={() => onDeploy(artifact)}
                        style={{ background: '#6366f1', color: '#fff', borderColor: '#6366f1' }}
                        title="Deploy a Dev Agent">
                        🚀 Deploy
                    </button>
                )}

                {/* Fork (approved, published, rejected) */}
                {['approved', 'published', 'rejected'].includes(artifact.status) && (
                    <button className="artifact-action-btn" onClick={() => onFork(artifact)} title="Fork">🔀 Fork</button>
                )}

                {/* Brand Check */}
                {canBrandCheck && (
                    <button className="artifact-action-btn" onClick={() => onBrandCheck(artifact)} title="Brand Check">📐</button>
                )}

                {/* Handoff */}
                {artifact.status !== 'rejected' && (
                    <div style={{ position: 'relative' }} ref={handoffRef}>
                        <button className="artifact-action-btn" onClick={() => setHandoffOpen(v => !v)} title="Handoff">→ Agente</button>
                        {handoffOpen && (
                            <div style={{
                                position: 'absolute', bottom: '100%', left: 0, background: '#fff',
                                border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                zIndex: 20, minWidth: 200, padding: 6,
                            }}>
                                {DESIGN_HANDOFF_AGENTS.map(a => (
                                    <button key={a.id}
                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px',
                                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
                                            color: '#334155', borderRadius: 6 }}
                                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                                        onClick={() => { setHandoffOpen(false); /* parent handles */ }}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ hex, name, usage }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: hex, border: '1px solid #e2e8f0', flexShrink: 0 }} />
            <div>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{name}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{hex} · {usage}</div>
            </div>
        </div>
    );
}

// ─── Design System Panel ──────────────────────────────────────────────────────

function DesignSystemPanel() {
    const [expanded, setExpanded] = useState({ colors: true, typography: false, rules: false });
    const toggle = key => setExpanded(p => ({ ...p, [key]: !p[key] }));

    const COLORS = [
        { hex: '#FFFFFF', name: 'Main BG',       usage: 'Fondo principal, cards' },
        { hex: '#F8FAFC', name: 'Section Alt',   usage: 'Secciones alternadas' },
        { hex: '#0F172A', name: 'Dark',           usage: 'Solo hero/footer' },
        { hex: '#2563EB', name: 'Primary',        usage: 'Botones CTA, links' },
        { hex: '#0F172A', name: 'Text Main',      usage: 'Títulos (16:1 AAA)' },
        { hex: '#475569', name: 'Text Body',      usage: 'Body text (7.5:1 AAA)' },
        { hex: '#94A3B8', name: 'Text Muted',     usage: 'Metadata (4.6:1 AA)' },
        { hex: '#16A34A', name: 'Success',        usage: 'ROI positivo, éxito' },
        { hex: '#E5E7EB', name: 'Border',         usage: 'Bordes de cards' },
        { hex: '#EFF6FF', name: 'Primary Soft',   usage: 'Hover states, fondos icon' },
    ];

    const sectionStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12, overflow: 'hidden' };
    const headerStyle = { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' };

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem', margin: 0 }}>Design System — Emiralia Brand Guidelines</h3>
                <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0' }}>Referencia viva. Usa estos tokens en todos los diseños.</p>
            </div>

            {/* Colors */}
            <div style={sectionStyle}>
                <div style={headerStyle} onClick={() => toggle('colors')}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>🎨 Color Tokens</span>
                    <span style={{ color: '#6366f1' }}>{expanded.colors ? '▲' : '▼'}</span>
                </div>
                {expanded.colors && (
                    <div style={{ padding: '0 20px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                            {COLORS.map(c => <ColorSwatch key={c.hex + c.name} {...c} />)}
                        </div>
                        <div style={{ marginTop: 12, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: '0.8rem', color: '#92400e' }}>
                            <strong>Regla crítica:</strong> NUNCA text-white sobre bg-white. NUNCA text-slate-900 sobre bg-slate-900.
                        </div>
                    </div>
                )}
            </div>

            {/* Typography */}
            <div style={sectionStyle}>
                <div style={headerStyle} onClick={() => toggle('typography')}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>✍ Tipografía — Inter</span>
                    <span style={{ color: '#6366f1' }}>{expanded.typography ? '▲' : '▼'}</span>
                </div>
                {expanded.typography && (
                    <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>H1 — Hero Title</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4 }}>text-3xl font-bold text-slate-900 leading-tight</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>H2 — Section Title</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4 }}>text-2xl font-bold text-slate-900</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>H3 — Card Title</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4 }}>text-lg font-bold text-slate-900</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 400, color: '#475569', lineHeight: 1.625 }}>Body — Texto de descripción y párrafos del sitio. Legible y accesible.</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4 }}>text-base font-normal text-slate-600 leading-relaxed</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta / Timestamp</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4 }}>text-xs font-medium text-slate-400</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Rules */}
            <div style={sectionStyle}>
                <div style={headerStyle} onClick={() => toggle('rules')}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>📐 Reglas Clave</span>
                    <span style={{ color: '#6366f1' }}>{expanded.rules ? '▲' : '▼'}</span>
                </div>
                {expanded.rules && (
                    <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* 80/20 */}
                        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>⚡ Regla 80/20 Light-First</div>
                            <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: 10 }}>
                                80% fondos claros (bg-white, bg-slate-50) · 20% fondos oscuros (solo hero, footer, CTA final)
                            </div>
                            <div style={{ display: 'flex', gap: 4, height: 12, borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ flex: 8, background: '#e2e8f0' }} title="80% light" />
                                <div style={{ flex: 2, background: '#0f172a' }} title="20% dark" />
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 8, fontWeight: 500 }}>
                                Máx 2-3 secciones oscuras por página. Más → rechazar y rediseñar.
                            </div>
                        </div>

                        {/* Card pattern */}
                        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>🃏 Card Pattern</div>
                            <pre style={{ fontSize: '0.78rem', color: '#475569', margin: 0, background: '#f1f5f9', padding: 10, borderRadius: 6, overflowX: 'auto' }}>
{`<div class="bg-white p-6 rounded-2xl
     border border-gray-200
     hover:shadow-lg hover:border-slate-300
     transition-all">
  <h3 class="text-slate-900 font-bold">Título</h3>
  <p class="text-slate-600">Descripción</p>
</div>`}
                            </pre>
                        </div>

                        {/* Contraste WCAG */}
                        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>♿ Contraste WCAG</div>
                            {[
                                { combo: 'slate-900 / white', ratio: '16:1', level: 'AAA', ok: true },
                                { combo: 'slate-600 / white', ratio: '7.5:1', level: 'AAA', ok: true },
                                { combo: 'white / slate-900', ratio: '16:1', level: 'AAA', ok: true },
                                { combo: 'slate-300 / slate-900', ratio: '8.2:1', level: 'AAA', ok: true },
                                { combo: 'primary #2563EB / white', ratio: '6.4:1', level: 'AA', ok: true },
                                { combo: 'white / white ❌', ratio: '1:1', level: 'FAIL', ok: false },
                            ].map(row => (
                                <div key={row.combo} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                                    <span style={{ color: row.ok ? '#475569' : '#ef4444' }}>{row.combo}</span>
                                    <span style={{ display: 'flex', gap: 8 }}>
                                        <span style={{ color: '#64748b' }}>{row.ratio}</span>
                                        <span style={{
                                            padding: '1px 7px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600,
                                            background: row.ok ? (row.level === 'AAA' ? '#ecfdf5' : '#eff6ff') : '#fef2f2',
                                            color: row.ok ? (row.level === 'AAA' ? '#059669' : '#2563eb') : '#ef4444',
                                        }}>{row.level}</span>
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Validation command */}
                        <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>🔍 Validación rápida (terminal)</div>
                            <pre style={{ fontSize: '0.78rem', color: '#475569', margin: 0, background: '#1e293b', color: '#94a3b8', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
                                {'# Contar secciones oscuras (≤2 = OK, ≤3 = review, ≥4 = rechazar)\ngrep -c "bg-slate-[89]00\\|bg-black" index.html\n\n# Buscar anti-patrón text-white en cards blancas\ngrep -A10 "bg-white" index.html | grep "text-white"'}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const INNER_TABS = [
    { id: 'assets',         label: 'Assets',        icon: '🖼' },
    { id: 'design-system',  label: 'Design System', icon: '🎨' },
    { id: 'comparativa',    label: 'Comparativa',   icon: '📸' },
    { id: 'pending-deploy', label: 'Pending Deploy', icon: '🚀' },
];

const STATUS_OPTIONS = [
    { value: 'all',            label: 'Todos los estados' },
    { value: 'draft',          label: 'Draft' },
    { value: 'pending_review', label: 'En revisión' },
    { value: 'approved',       label: 'Aprobado' },
    { value: 'published',      label: 'Deployed' },
    { value: 'rejected',       label: 'Rechazado' },
];

export default function DesignWorkspace({ agentId, agent }) {
    const [artifacts, setArtifacts]               = useState([]);
    const [stats, setStats]                       = useState(null);
    const [loading, setLoading]                   = useState(true);
    const [innerTab, setInnerTab]                 = useState('assets');
    const [filter, setFilter]                     = useState({ type: 'all', status: 'all' });
    const [previewArtifact, setPreviewArtifact]   = useState(null);
    const [editArtifact, setEditArtifact]         = useState(null);
    const [editForm, setEditForm]                 = useState({ title: '', content: '', url: '' });
    const [showWizard, setShowWizard]             = useState(false);
    const [wizardStep, setWizardStep]             = useState(1);
    const [wizard, setWizard]                     = useState({ type: 'page_design', description: '', url: '', notes: '' });
    const [generating, setGenerating]             = useState(false);
    const [brandCheckResult, setBrandCheckResult] = useState(null);
    const [brandCheckArtifact, setBrandCheckArtifact] = useState(null);
    const [compareArtifact, setCompareArtifact]   = useState(null);
    const [beforeUrl, setBeforeUrl]               = useState('');
    const [afterUrl, setAfterUrl]                 = useState('');
    const [toast, setToast]                       = useState(null);

    useEffect(() => {
        fetchArtifacts();
        fetchStats();
    }, [agentId]);

    async function fetchArtifacts() {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/artifacts?agent_id=${agentId}&limit=100`);
            setArtifacts(await res.json());
        } catch {
            showToast('Error cargando assets', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/artifacts/stats?agent_id=${agentId}`);
            setStats(await res.json());
        } catch { /* opcional */ }
    }

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    // Client-side filtering
    const filtered = artifacts.filter(a => {
        if (filter.type !== 'all' && a.type !== filter.type) return false;
        if (filter.status !== 'all' && a.status !== filter.status) return false;
        return true;
    });

    const pendingDeploy = artifacts.filter(a => a.status === 'approved');

    async function handleStatusChange(id, status, rejectionReason = null) {
        try {
            await fetch(`${API_URL}/artifacts/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, rejection_reason: rejectionReason }),
            });
            const labels = { approved: 'aprobado', rejected: 'rechazado', pending_review: 'enviado a revisión', published: 'deployed' };
            showToast(`Asset ${labels[status] || status}`);
            fetchArtifacts();
            fetchStats();
        } catch {
            showToast('Error cambiando estado', 'error');
        }
    }

    async function handleDeploy(artifact) {
        try {
            await fetch(`${API_URL}/artifacts/${artifact.id}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to_agent_id: 'dev-agent',
                    instruction: `Deploy requerido: "${artifact.title}". URL de referencia: ${artifact.metadata?.url || '(ver contenido del artefacto)'}`,
                }),
            });
            await fetch(`${API_URL}/artifacts/${artifact.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published' }),
            });
            showToast(`"${artifact.title}" enviado a Dev Agent para deploy`);
            fetchArtifacts();
            fetchStats();
        } catch {
            showToast('Error en deploy', 'error');
        }
    }

    async function handleFork(artifact) {
        try {
            await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: artifact.type,
                    title: `${artifact.title} (variante)`,
                    content: artifact.content,
                    metadata: { ...artifact.metadata, forked_from: artifact.id },
                }),
            });
            showToast('Variante creada como draft');
            fetchArtifacts();
            fetchStats();
        } catch {
            showToast('Error al crear variante', 'error');
        }
    }

    function handleBrandCheck(artifact) {
        const result = runBrandCheck(artifact);
        setBrandCheckResult(result);
        setBrandCheckArtifact(artifact);
        // Persist score
        fetch(`${API_URL}/artifacts/${artifact.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata: { ...artifact.metadata, brand_check_score: result.score } }),
        }).then(() => fetchArtifacts()).catch(() => {});
    }

    function openEdit(artifact) {
        setEditForm({ title: artifact.title || '', content: artifact.content || '', url: artifact.metadata?.url || '' });
        setEditArtifact(artifact);
    }

    async function saveEdit() {
        try {
            await fetch(`${API_URL}/artifacts/${editArtifact.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editForm.title,
                    content: editForm.content,
                    metadata: { ...editArtifact.metadata, url: editForm.url },
                }),
            });
            setEditArtifact(null);
            showToast('Asset actualizado');
            fetchArtifacts();
        } catch {
            showToast('Error al guardar', 'error');
        }
    }

    async function handleCreateDraft() {
        setGenerating(true);
        try {
            await fetch(`${API_URL}/artifacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    type: wizard.type,
                    title: wizard.description.slice(0, 100) || `Nuevo ${DESIGN_TYPE_LABELS[wizard.type]}`,
                    content: wizard.notes,
                    metadata: { url: wizard.url, description: wizard.description },
                }),
            });
            setShowWizard(false);
            setWizardStep(1);
            setWizard({ type: 'page_design', description: '', url: '', notes: '' });
            showToast('Draft creado');
            fetchArtifacts();
            fetchStats();
        } catch {
            showToast('Error al crear draft', 'error');
        } finally {
            setGenerating(false);
        }
    }

    function onCompareArtifactChange(id) {
        const a = artifacts.find(x => x.id === id);
        setCompareArtifact(a || null);
        setBeforeUrl('');
        setAfterUrl(a?.metadata?.url || '');
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: '24px 0' }}>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    padding: '12px 20px', borderRadius: 10,
                    background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
                    color: toast.type === 'error' ? '#ef4444' : '#10b981',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
                    fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Stats bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Total Assets',  value: stats?.total ?? '—', color: '#6366f1' },
                    { label: 'En revisión',   value: stats?.by_status?.pending_review ?? '—', color: '#f59e0b' },
                    { label: 'Aprobados',     value: stats?.by_status?.approved ?? '—', color: '#10b981' },
                    { label: 'Deployed',      value: stats?.by_status?.published ?? '—', color: '#3b82f6' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Inner tab nav */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
                {INNER_TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setInnerTab(t.id)}
                        style={{
                            padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                            fontWeight: innerTab === t.id ? 600 : 400,
                            color: innerTab === t.id ? '#6366f1' : '#64748b',
                            borderBottom: innerTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
                            fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        <span>{t.icon}</span> {t.label}
                        {t.id === 'pending-deploy' && pendingDeploy.length > 0 && (
                            <span style={{ background: '#6366f1', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700, marginLeft: 4 }}>
                                {pendingDeploy.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── TAB: ASSETS ──────────────────────────────────────────────── */}
            {innerTab === 'assets' && (
                <div>
                    {/* Filters + CTA */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                            value={filter.type}
                            onChange={e => setFilter(p => ({ ...p, type: e.target.value }))}
                            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', color: '#0f172a', background: '#fff' }}
                        >
                            <option value="all">Todos los tipos</option>
                            {DESIGN_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                        <select
                            value={filter.status}
                            onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}
                            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', color: '#0f172a', background: '#fff' }}
                        >
                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={() => { setShowWizard(true); setWizardStep(1); }}
                            style={{ padding: '9px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                            + Nuevo Asset
                        </button>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Cargando assets…</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>No hay assets aquí todavía</div>
                            <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>Crea tu primer diseño con el botón "Nuevo Asset"</div>
                            <button
                                onClick={() => setShowWizard(true)}
                                style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                            >
                                Crear primer asset
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                            {filtered.map(a => (
                                <DesignArtifactCard
                                    key={a.id}
                                    artifact={a}
                                    onPreview={setPreviewArtifact}
                                    onEdit={openEdit}
                                    onStatusChange={handleStatusChange}
                                    onDeploy={handleDeploy}
                                    onFork={handleFork}
                                    onBrandCheck={handleBrandCheck}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: DESIGN SYSTEM ───────────────────────────────────────── */}
            {innerTab === 'design-system' && <DesignSystemPanel />}

            {/* ── TAB: COMPARATIVA ─────────────────────────────────────────── */}
            {innerTab === 'comparativa' && (
                <div>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem', margin: '0 0 4px' }}>Comparativa Before / After</h3>
                        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>Compara visualmente un diseño antes y después del deploy.</p>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Seleccionar asset</label>
                        <select
                            value={compareArtifact?.id || ''}
                            onChange={e => onCompareArtifactChange(e.target.value)}
                            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', minWidth: 280 }}
                        >
                            <option value="">— Seleccionar —</option>
                            {artifacts.filter(a => a.type === 'page_design').map(a => (
                                <option key={a.id} value={a.id}>{a.title}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                            <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Before URL</label>
                            <input
                                type="url"
                                placeholder="https://…"
                                value={beforeUrl}
                                onChange={e => setBeforeUrl(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>After URL</label>
                            <input
                                type="url"
                                placeholder="https://…"
                                value={afterUrl}
                                onChange={e => setAfterUrl(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem', marginBottom: 8 }}>Before</div>
                            {beforeUrl ? (
                                <iframe src={beforeUrl} style={{ width: '100%', height: 500, border: '1px solid #e2e8f0', borderRadius: 8 }}
                                    sandbox="allow-scripts allow-same-origin" title="before" />
                            ) : (
                                <div style={{ height: 500, border: '2px dashed #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    Introduce una URL
                                </div>
                            )}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem', marginBottom: 8 }}>After</div>
                            {afterUrl ? (
                                <iframe src={afterUrl} style={{ width: '100%', height: 500, border: '1px solid #e2e8f0', borderRadius: 8 }}
                                    sandbox="allow-scripts allow-same-origin" title="after" />
                            ) : (
                                <div style={{ height: 500, border: '2px dashed #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    Introduce una URL
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: PENDING DEPLOY ──────────────────────────────────────── */}
            {innerTab === 'pending-deploy' && (
                <div>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem', margin: '0 0 4px' }}>Pending Deploy</h3>
                        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>Diseños aprobados listos para handoff a Dev Agent.</p>
                    </div>

                    {pendingDeploy.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, border: '2px dashed #e2e8f0', borderRadius: 12 }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>🚀</div>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No hay diseños pendientes de deploy</div>
                            <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Aprueba un asset desde la pestaña Assets.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pendingDeploy.map(a => (
                                <div key={a.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <span style={{ fontSize: 24 }}>{DESIGN_TYPE_ICONS[a.type] || '🎨'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{a.title}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>
                                            {DESIGN_TYPE_LABELS[a.type] || a.type} · {a.created_at ? new Date(a.created_at).toLocaleDateString('es-ES') : ''}
                                        </div>
                                        {a.metadata?.url && (
                                            <a href={a.metadata.url} target="_blank" rel="noreferrer"
                                                style={{ fontSize: '0.75rem', color: '#6366f1', textDecoration: 'none' }}>
                                                🔗 {a.metadata.url.slice(0, 60)}
                                            </a>
                                        )}
                                    </div>
                                    {a.metadata?.brand_check_score != null && (
                                        <div style={{
                                            textAlign: 'center', padding: '6px 12px', borderRadius: 8,
                                            background: a.metadata.brand_check_score >= 70 ? '#ecfdf5' : '#fef2f2',
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: a.metadata.brand_check_score >= 70 ? '#10b981' : '#ef4444' }}>
                                                {a.metadata.brand_check_score}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Brand Score</div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDeploy(a)}
                                        style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        🚀 Deploy ahora
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── PREVIEW MODAL ────────────────────────────────────────────── */}
            {previewArtifact && (
                previewArtifact.type === 'page_design' ? (
                    <DesignPreviewModal artifact={previewArtifact} onClose={() => setPreviewArtifact(null)} />
                ) : (
                    <ArtifactPreviewModal
                        artifact={previewArtifact}
                        onClose={() => setPreviewArtifact(null)}
                        onStatusChange={(id, status, reason) => { handleStatusChange(id, status, reason); setPreviewArtifact(null); }}
                    />
                )
            )}

            {/* ── EDIT MODAL ───────────────────────────────────────────────── */}
            {editArtifact && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setEditArtifact(null)}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: 20 }}>✏️ Editar Asset</div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Título</label>
                            <input className="edit-input-inline" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Título del asset" />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>URL (live page / iframe)</label>
                            <input className="edit-input-inline" type="url" value={editForm.url} onChange={e => setEditForm(p => ({ ...p, url: e.target.value }))} placeholder="https://…" />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Notas / Contenido</label>
                            <textarea className="edit-input-inline" rows={6} value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} placeholder="Descripción, notas, código…" style={{ resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditArtifact(null)} style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>Cancelar</button>
                            <button onClick={saveEdit} style={{ padding: '9px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── BRAND CHECK RESULT ───────────────────────────────────────── */}
            {brandCheckResult && brandCheckArtifact && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => { setBrandCheckResult(null); setBrandCheckArtifact(null); }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: 4 }}>📐 Brand Check</div>
                        <div style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 20 }}>{brandCheckArtifact.title}</div>

                        {/* Score */}
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: '3rem', fontWeight: 700, color: brandCheckResult.passed ? '#10b981' : '#ef4444' }}>
                                {brandCheckResult.score}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.82rem' }}>/ 100</div>
                            <div style={{ marginTop: 8, display: 'inline-block', padding: '4px 16px', borderRadius: 20, fontWeight: 600, fontSize: '0.82rem',
                                background: brandCheckResult.passed ? '#ecfdf5' : '#fef2f2',
                                color: brandCheckResult.passed ? '#059669' : '#ef4444' }}>
                                {brandCheckResult.passed ? '✅ Brand Compliant' : '❌ Issues encontrados'}
                            </div>
                        </div>

                        {/* Issues */}
                        {brandCheckResult.issues.length > 0 ? (
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem', marginBottom: 8 }}>Issues detectados:</div>
                                {brandCheckResult.issues.map((issue, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem', color: '#475569' }}>
                                        <span>⚠️</span> {issue}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: 16, background: '#ecfdf5', borderRadius: 8, color: '#059669', fontSize: '0.85rem', marginBottom: 20 }}>
                                No se detectaron issues de brand compliance.
                            </div>
                        )}

                        {brandCheckArtifact.metadata?.url && (
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 16, fontStyle: 'italic' }}>
                                Para auditoría visual completa, visita la URL del asset directamente.
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setBrandCheckResult(null); setBrandCheckArtifact(null); }}
                                style={{ padding: '9px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── WIZARD ───────────────────────────────────────────────────── */}
            {showWizard && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setShowWizard(false)}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Nuevo Asset</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>Paso {wizardStep} de 3</div>
                            </div>
                            <button onClick={() => setShowWizard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20 }}>✕</button>
                        </div>

                        {/* Progress */}
                        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                            {[1, 2, 3].map(s => (
                                <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= wizardStep ? '#6366f1' : '#e2e8f0', transition: 'background 0.2s' }} />
                            ))}
                        </div>

                        {/* Step 1 — Tipo */}
                        {wizardStep === 1 && (
                            <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 14, fontSize: '0.9rem' }}>¿Qué tipo de asset es?</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {DESIGN_TYPES.map(t => (
                                        <div
                                            key={t.id}
                                            className="wizard-step-card"
                                            onClick={() => setWizard(p => ({ ...p, type: t.id }))}
                                            style={{
                                                border: `2px solid ${wizard.type === t.id ? '#6366f1' : '#e2e8f0'}`,
                                                background: wizard.type === t.id ? '#eef2ff' : '#fff',
                                                borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
                                            }}
                                        >
                                            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{DESIGN_TYPE_ICONS[t.id]}</div>
                                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{t.label}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 3 }}>{t.desc}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                                    <button onClick={() => setWizardStep(2)}
                                        style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2 — Descripción */}
                        {wizardStep === 2 && (
                            <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 14, fontSize: '0.9rem' }}>
                                    {DESIGN_TYPE_ICONS[wizard.type]} {DESIGN_TYPE_LABELS[wizard.type]} — Descripción
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Descripción del diseño *</label>
                                    <textarea
                                        autoFocus
                                        rows={3}
                                        value={wizard.description}
                                        onChange={e => setWizard(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Ej: Rediseño de la hero section de la home con nuevo CTA…"
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>URL de referencia (opcional)</label>
                                    <input
                                        type="url"
                                        value={wizard.url}
                                        onChange={e => setWizard(p => ({ ...p, url: e.target.value }))}
                                        placeholder="https://…"
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: 6 }}>Notas adicionales</label>
                                    <textarea
                                        rows={3}
                                        value={wizard.notes}
                                        onChange={e => setWizard(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="Contexto, requisitos técnicos, referencias de estilo…"
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button onClick={() => setWizardStep(1)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>← Atrás</button>
                                    <button onClick={() => setWizardStep(3)} disabled={!wizard.description.trim()}
                                        style={{ padding: '10px 24px', background: wizard.description.trim() ? '#6366f1' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: wizard.description.trim() ? 'pointer' : 'not-allowed', fontSize: '0.85rem' }}>
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3 — Confirmar */}
                        {wizardStep === 3 && (
                            <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 14, fontSize: '0.9rem' }}>Confirmar nuevo asset</div>
                                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { label: 'Tipo', value: `${DESIGN_TYPE_ICONS[wizard.type]} ${DESIGN_TYPE_LABELS[wizard.type]}` },
                                        { label: 'Descripción', value: wizard.description },
                                        { label: 'URL', value: wizard.url || '—' },
                                        { label: 'Estado inicial', value: 'Draft' },
                                    ].map(row => (
                                        <div key={row.label} style={{ display: 'flex', gap: 12, fontSize: '0.85rem' }}>
                                            <span style={{ minWidth: 120, color: '#64748b', fontWeight: 500 }}>{row.label}</span>
                                            <span style={{ color: '#0f172a' }}>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button onClick={() => setWizardStep(2)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>← Atrás</button>
                                    <button onClick={handleCreateDraft} disabled={generating}
                                        style={{ padding: '10px 24px', background: generating ? '#cbd5e1' : '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: generating ? 'wait' : 'pointer', fontSize: '0.85rem' }}>
                                        {generating ? 'Creando…' : '✅ Crear Draft'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
