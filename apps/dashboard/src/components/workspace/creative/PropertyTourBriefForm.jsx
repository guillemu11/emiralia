import React, { useState, useEffect, useRef } from 'react';
import { DURATION_OPTIONS, MODELS_BY_TYPE } from '../creativeConstants.js';
import { API_URL } from '../../../api.js';

/**
 * PropertyTourBriefForm — Fase 4 del Creative Studio (Proyecto 043)
 *
 * Brief para generación de video tour de propiedad con host avatar.
 * Pipeline: ElevenLabs TTS (host) → KIE AI Lip Sync → Video Editing + data overlays
 *
 * Dos modos:
 *   Modo DB  — búsqueda de propiedad desde base de datos → auto-populate
 *   Modo Manual — entrada manual de datos de la propiedad
 *
 * Props:
 *   onSubmit       {function} — recibe { brief, outputConfig }
 *   loading        {boolean}  — true mientras hay una generación en curso
 *   suggestedBrief {object}   — brief pre-rellenado desde AIBriefInput
 */

const HOST_OPTIONS = [
    { id: 'fernando', label: 'Fernando', role: 'Asesor de Inversión', accent: 'es-MX' },
    { id: 'yolanda',  label: 'Yolanda',  role: 'Lifestyle & Lujo',   accent: 'es-ES' },
    { id: 'auto',     label: 'Auto',     role: 'Selección automática', accent: '—' },
];

const DATA_OVERLAYS = [
    { id: 'precio',     label: 'Precio' },
    { id: 'roi',        label: 'ROI' },
    { id: 'metros',     label: 'm²' },
    { id: 'ubicacion',  label: 'Ubicación' },
    { id: 'developer',  label: 'Developer' },
];

const TOUR_FORMATS = [
    { id: '9:16', label: 'Vertical 9:16',   ratio: '9:16', use: 'TikTok / Reels' },
    { id: '16:9', label: 'Horizontal 16:9', ratio: '16:9', use: 'YouTube / LinkedIn' },
];

function FormatRatioPreview({ ratio }) {
    const styles = {
        '9:16': { width: 18, height: 32 },
        '16:9': { width: 36, height: 20 },
    };
    const s = styles[ratio] || { width: 28, height: 28 };
    return (
        <div
            className="brief-format-preview"
            style={{ width: s.width, height: s.height }}
            aria-hidden="true"
        />
    );
}

export default function PropertyTourBriefForm({ onSubmit, loading = false, suggestedBrief }) {
    const [mode, setMode]             = useState('db');   // 'db' | 'manual'
    const [brief, setBrief]           = useState({
        host:           'fernando',
        property_id:    null,
        property_data:  {},
        data_overlays:  ['precio', 'roi'],
    });
    const [outputConfig, setOutputConfig] = useState({
        format:        '9:16',
        duration:      '60s',
        lipsync_model: 'infinitalk/from-audio',
    });

    // DB mode state
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties]  = useState([]);
    const [searching, setSearching]    = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const searchTimeout = useRef(null);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors]         = useState({});

    /* Aplicar sugerencia de IA cuando llega */
    useEffect(() => {
        if (!suggestedBrief) return;
        setBrief(prev => ({ ...prev, ...suggestedBrief }));
        setErrors({});
    }, [suggestedBrief]);

    /* Búsqueda de propiedades con debounce */
    useEffect(() => {
        if (mode !== 'db' || !searchQuery.trim()) {
            setProperties([]);
            return;
        }
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`${API_URL}/properties?search=${encodeURIComponent(searchQuery)}&limit=12`);
                const data = await res.json();
                setProperties(Array.isArray(data) ? data : (data.properties || []));
            } catch {
                setProperties([]);
            } finally {
                setSearching(false);
            }
        }, 400);
    }, [searchQuery, mode]);

    function selectProperty(property) {
        setSelectedProperty(property);
        setBrief(prev => ({
            ...prev,
            property_id: property.pf_id || property.id,
            property_data: {
                title:       property.title || property.name || '',
                price_aed:   property.price_aed || property.price || '',
                community:   property.community || property.location || '',
                bedrooms:    property.bedrooms || '',
                size_sqft:   property.size_sqft || property.area_sqft || '',
                roi:         property.roi || '',
                images:      property.images || [],
            },
        }));
        setSearchQuery('');
        setProperties([]);
    }

    function setField(field, value) {
        setBrief(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    }

    function setPropertyDataField(field, value) {
        setBrief(prev => ({
            ...prev,
            property_data: { ...prev.property_data, [field]: value },
        }));
    }

    function toggleOverlay(id) {
        setBrief(prev => {
            const current = prev.data_overlays;
            return {
                ...prev,
                data_overlays: current.includes(id)
                    ? current.filter(o => o !== id)
                    : [...current, id],
            };
        });
    }

    function setOutputField(field, value) {
        setOutputConfig(prev => ({ ...prev, [field]: value }));
    }

    function validate() {
        const errs = {};
        if (!brief.host) errs.host = 'Selecciona un host.';
        if (mode === 'db' && !brief.property_id) {
            errs.property = 'Selecciona una propiedad de la base de datos.';
        }
        if (mode === 'manual' && !brief.property_data?.title?.trim()) {
            errs.property_title = 'El título de la propiedad es obligatorio.';
        }
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit({ brief, outputConfig });
        } finally {
            setSubmitting(false);
        }
    }

    const isDisabled = loading || submitting;

    return (
        <form className="brief-form" onSubmit={handleSubmit} noValidate>

            {/* ── 1. Modo (DB / Manual) ── */}
            <div className="brief-section">
                <label className="brief-label">Fuente de datos</label>
                <div className="brief-quality-toggle" role="group" aria-label="Modo de entrada">
                    <button
                        type="button"
                        className={`brief-quality-option${mode === 'db' ? ' active' : ''}`}
                        onClick={() => { setMode('db'); setSelectedProperty(null); }}
                        disabled={isDisabled}
                    >
                        Desde DB
                    </button>
                    <button
                        type="button"
                        className={`brief-quality-option${mode === 'manual' ? ' active' : ''}`}
                        onClick={() => setMode('manual')}
                        disabled={isDisabled}
                    >
                        Manual
                    </button>
                </div>
            </div>

            {/* ── 2a. Modo DB: buscador ── */}
            {mode === 'db' && (
                <div className="brief-section">
                    <label className="brief-label" htmlFor="property-search">
                        Buscar propiedad
                        <span className="brief-required" aria-hidden="true"> *</span>
                    </label>

                    {selectedProperty ? (
                        <div className="brief-selected-property">
                            <div className="brief-selected-property-info">
                                <span className="brief-selected-property-name">
                                    {selectedProperty.title || selectedProperty.name}
                                </span>
                                <span className="brief-selected-property-meta">
                                    {selectedProperty.community} · AED {selectedProperty.price_aed?.toLocaleString() || selectedProperty.price?.toLocaleString()}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="brief-clear-btn"
                                onClick={() => { setSelectedProperty(null); setField('property_id', null); }}
                                disabled={isDisabled}
                            >
                                Cambiar
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                id="property-search"
                                type="text"
                                className={`brief-input${errors.property ? ' brief-field-error' : ''}`}
                                placeholder="Buscar por nombre, comunidad, tipo..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                disabled={isDisabled}
                            />
                            {searching && (
                                <p className="brief-field-hint">Buscando propiedades...</p>
                            )}
                            {properties.length > 0 && (
                                <div className="brief-property-results">
                                    {properties.map(p => (
                                        <button
                                            key={p.id || p.pf_id}
                                            type="button"
                                            className="brief-property-card"
                                            onClick={() => selectProperty(p)}
                                            disabled={isDisabled}
                                        >
                                            {(p.images?.[0] || p.thumbnail_url) && (
                                                <img
                                                    src={p.images?.[0] || p.thumbnail_url}
                                                    alt=""
                                                    className="brief-property-thumb"
                                                />
                                            )}
                                            <div className="brief-property-card-info">
                                                <span className="brief-property-card-name">
                                                    {p.title || p.name}
                                                </span>
                                                <span className="brief-property-card-meta">
                                                    {p.community} · AED {(p.price_aed || p.price || 0).toLocaleString()}
                                                    {p.roi ? ` · ROI ${p.roi}%` : ''}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {!searching && searchQuery.trim() && properties.length === 0 && (
                                <p className="brief-field-hint">No se encontraron propiedades. Prueba con otra búsqueda o usa el modo Manual.</p>
                            )}
                        </>
                    )}
                    {errors.property && (
                        <p className="brief-error" role="alert">{errors.property}</p>
                    )}
                </div>
            )}

            {/* ── 2b. Modo Manual: campos de propiedad ── */}
            {mode === 'manual' && (
                <div className="brief-section">
                    <label className="brief-label">
                        Datos de la propiedad
                        <span className="brief-required" aria-hidden="true"> *</span>
                    </label>
                    <div className="brief-manual-grid">
                        <div className="brief-manual-field">
                            <label className="brief-sublabel" htmlFor="prop-title">Título</label>
                            <input
                                id="prop-title"
                                type="text"
                                className={`brief-input${errors.property_title ? ' brief-field-error' : ''}`}
                                placeholder="Marina Heights, Dubai Marina"
                                value={brief.property_data?.title || ''}
                                onChange={e => setPropertyDataField('title', e.target.value)}
                                disabled={isDisabled}
                            />
                            {errors.property_title && (
                                <p className="brief-error" role="alert">{errors.property_title}</p>
                            )}
                        </div>
                        <div className="brief-manual-field">
                            <label className="brief-sublabel" htmlFor="prop-price">Precio (AED)</label>
                            <input
                                id="prop-price"
                                type="text"
                                className="brief-input"
                                placeholder="1.200.000"
                                value={brief.property_data?.price_aed || ''}
                                onChange={e => setPropertyDataField('price_aed', e.target.value)}
                                disabled={isDisabled}
                            />
                        </div>
                        <div className="brief-manual-field">
                            <label className="brief-sublabel" htmlFor="prop-community">Comunidad</label>
                            <input
                                id="prop-community"
                                type="text"
                                className="brief-input"
                                placeholder="Dubai Marina"
                                value={brief.property_data?.community || ''}
                                onChange={e => setPropertyDataField('community', e.target.value)}
                                disabled={isDisabled}
                            />
                        </div>
                        <div className="brief-manual-field">
                            <label className="brief-sublabel" htmlFor="prop-beds">Habitaciones</label>
                            <input
                                id="prop-beds"
                                type="text"
                                className="brief-input"
                                placeholder="2 BR"
                                value={brief.property_data?.bedrooms || ''}
                                onChange={e => setPropertyDataField('bedrooms', e.target.value)}
                                disabled={isDisabled}
                            />
                        </div>
                        <div className="brief-manual-field">
                            <label className="brief-sublabel" htmlFor="prop-sqft">m² / sqft</label>
                            <input
                                id="prop-sqft"
                                type="text"
                                className="brief-input"
                                placeholder="1.200 sqft"
                                value={brief.property_data?.size_sqft || ''}
                                onChange={e => setPropertyDataField('size_sqft', e.target.value)}
                                disabled={isDisabled}
                            />
                        </div>
                        <div className="brief-manual-field">
                            <label className="brief-sublabel" htmlFor="prop-roi">ROI (%)</label>
                            <input
                                id="prop-roi"
                                type="text"
                                className="brief-input"
                                placeholder="7.2"
                                value={brief.property_data?.roi || ''}
                                onChange={e => setPropertyDataField('roi', e.target.value)}
                                disabled={isDisabled}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── 3. Host ── */}
            <div className="brief-section">
                <label className="brief-label">
                    Host del tour
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <div className="brief-avatar-group" role="group" aria-label="Seleccionar host">
                    {HOST_OPTIONS.map(host => (
                        <button
                            key={host.id}
                            type="button"
                            className={`brief-avatar-btn${brief.host === host.id ? ' active' : ''}`}
                            onClick={() => setField('host', host.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.host === host.id}
                        >
                            <span className="brief-avatar-name">{host.label}</span>
                            <span className="brief-avatar-desc">{host.accent}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 4. Data overlays ── */}
            <div className="brief-section">
                <label className="brief-label">Datos a mostrar en video</label>
                <div className="brief-checkboxes">
                    {DATA_OVERLAYS.map(overlay => (
                        <label key={overlay.id} className="brief-checkbox-label">
                            <input
                                type="checkbox"
                                checked={brief.data_overlays.includes(overlay.id)}
                                onChange={() => toggleOverlay(overlay.id)}
                                disabled={isDisabled}
                            />
                            {overlay.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* ── 5. Formato ── */}
            <div className="brief-section">
                <label className="brief-label">Formato</label>
                <div className="brief-format-grid" role="group" aria-label="Formato de salida">
                    {TOUR_FORMATS.map(fmt => (
                        <button
                            key={fmt.id}
                            type="button"
                            className={`brief-format-card${outputConfig.format === fmt.id ? ' active' : ''}`}
                            onClick={() => setOutputField('format', fmt.id)}
                            disabled={isDisabled}
                            aria-pressed={outputConfig.format === fmt.id}
                        >
                            <FormatRatioPreview ratio={fmt.ratio} />
                            <span className="brief-format-label">{fmt.label}</span>
                            <span className="brief-format-use">{fmt.use}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 6. Duración ── */}
            <div className="brief-section">
                <label className="brief-label">Duración</label>
                <div className="brief-quality-toggle" role="group" aria-label="Duración del tour">
                    {DURATION_OPTIONS.property_tour.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`brief-quality-option${outputConfig.duration === opt.value ? ' active' : ''}`}
                            onClick={() => setOutputField('duration', opt.value)}
                            disabled={isDisabled}
                            aria-pressed={outputConfig.duration === opt.value}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Modelo de lip sync ── */}
            <div className="brief-section">
                <label className="brief-label">Modelo de lip sync</label>
                <div className="brief-quality-toggle" role="group" aria-label="Modelo de lip sync">
                    {MODELS_BY_TYPE.lipsync.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            className={`brief-quality-option${outputConfig.lipsync_model === m.id ? ' active' : ''}`}
                            onClick={() => setOutputField('lipsync_model', m.id)}
                            disabled={isDisabled}
                            aria-pressed={outputConfig.lipsync_model === m.id}
                        >
                            {m.label}
                            <span className="brief-quality-cost">{m.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Submit ── */}
            <button
                type="submit"
                className="brief-submit-btn"
                disabled={isDisabled}
            >
                {submitting ? (
                    <>
                        <span className="brief-submit-spinner" aria-hidden="true" />
                        Generando tour...
                    </>
                ) : (
                    'Generar tour de propiedad'
                )}
            </button>
        </form>
    );
}
