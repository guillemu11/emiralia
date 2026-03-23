import React, { useState } from 'react';
import { AVATARS, OUTPUT_FORMATS, COST_MAP, MODELS_BY_TYPE } from '../creativeConstants.js';

/**
 * ImageBriefForm
 *
 * Formulario completo de brief para generación de imágenes via KIE AI.
 * Controla: prompt, estilo visual, avatar, texto superpuesto,
 * elementos de marca, formato de salida y calidad.
 *
 * Props:
 *   onSubmit {function} — recibe { brief, outputConfig }
 *   loading  {boolean}  — true mientras hay una generación en curso
 *   apiUrl   {string}   — URL base del API (no usado directamente aquí, delegado al padre)
 */

const IMAGE_STYLES = [
    { id: 'realistic',   label: 'Realistic' },
    { id: 'illustrated', label: 'Illustrated' },
    { id: 'cinematic',   label: 'Cinematic' },
    { id: 'minimal',     label: 'Minimal' },
];

const BRAND_ELEMENTS_OPTIONS = [
    { id: 'logo',      label: 'Logo' },
    { id: 'watermark', label: 'Watermark' },
    { id: 'tagline',   label: 'Tagline' },
];

/* Representación visual simplificada de cada ratio de aspecto */
function FormatRatioPreview({ ratio }) {
    const styles = {
        '1:1':  { width: 28, height: 28 },
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

export default function ImageBriefForm({ onSubmit, loading = false, apiUrl }) {
    const [brief, setBrief] = useState({
        prompt: '',
        style: '',
        avatar: 'none',
        text_overlay: '',
        brand_elements: [],
        reference_image_url: '',
    });

    const [refImageSource, setRefImageSource] = useState('url'); // 'url' | 'file'
    const [refFilePreview, setRefFilePreview] = useState(null);

    function handleRefFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            setRefFilePreview(ev.target.result);
            setField('reference_image_url', ev.target.result);
        };
        reader.readAsDataURL(file);
    }

    const [outputConfig, setOutputConfig] = useState({
        format: 'square',
        quality: 'standard',
        model: 'nano-banana-2',
    });

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    /* ── Helpers de estado ── */

    function setField(field, value) {
        setBrief(prev => ({ ...prev, [field]: value }));
        // Limpiar error del campo al modificarlo
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    }

    function toggleBrandElement(id) {
        setBrief(prev => ({
            ...prev,
            brand_elements: prev.brand_elements.includes(id)
                ? prev.brand_elements.filter(e => e !== id)
                : [...prev.brand_elements, id],
        }));
    }

    function setOutputField(field, value) {
        setOutputConfig(prev => ({ ...prev, [field]: value }));
    }

    /* ── Validación ── */

    function validate() {
        const newErrors = {};
        if (!brief.prompt.trim()) {
            newErrors.prompt = 'La descripción es obligatoria.';
        }
        if (!brief.style) {
            newErrors.style = 'Selecciona un estilo visual.';
        }
        return newErrors;
    }

    /* ── Submit ── */

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

    /* ── Coste estimado ── */
    const estimatedCost = COST_MAP[outputConfig.quality] ?? COST_MAP.standard;

    /* ── Formato activo del array de formatos de imagen ── */
    const imageFormats = OUTPUT_FORMATS.image;

    const isDisabled = loading || submitting;

    return (
        <form className="brief-form" onSubmit={handleSubmit} noValidate>

            {/* ── 1. Prompt ── */}
            <div className="brief-section">
                <label className="brief-label" htmlFor="brief-prompt">
                    Descripción de la imagen
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <textarea
                    id="brief-prompt"
                    className={`brief-textarea${errors.prompt ? ' brief-field-error' : ''}`}
                    rows={4}
                    placeholder="Ej: Luxury penthouse en Dubai Marina al atardecer, con vistas panorámicas al mar..."
                    value={brief.prompt}
                    onChange={e => setField('prompt', e.target.value)}
                    required
                    disabled={isDisabled}
                />
                {errors.prompt && (
                    <p className="brief-error" role="alert">{errors.prompt}</p>
                )}
            </div>

            {/* ── 2. Estilo visual ── */}
            <div className="brief-section">
                <label className="brief-label">
                    Estilo visual
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <div className="brief-style-grid" role="group" aria-label="Estilo visual">
                    {IMAGE_STYLES.map(style => (
                        <button
                            key={style.id}
                            type="button"
                            className={`brief-style-card${brief.style === style.id ? ' active' : ''}`}
                            onClick={() => setField('style', style.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.style === style.id}
                        >
                            {style.label}
                        </button>
                    ))}
                </div>
                {errors.style && (
                    <p className="brief-error" role="alert">{errors.style}</p>
                )}
            </div>

            {/* ── 3. Avatar ── */}
            <div className="brief-section">
                <label className="brief-label">Avatar (opcional)</label>
                <div className="brief-avatar-group" role="group" aria-label="Avatar">
                    {AVATARS.map(av => (
                        <button
                            key={av.id}
                            type="button"
                            className={`brief-avatar-btn${brief.avatar === av.id ? ' active' : ''}`}
                            onClick={() => setField('avatar', av.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.avatar === av.id}
                        >
                            {av.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={`brief-avatar-btn${brief.avatar === 'none' ? ' active' : ''}`}
                        onClick={() => setField('avatar', 'none')}
                        disabled={isDisabled}
                        aria-pressed={brief.avatar === 'none'}
                    >
                        Ninguno
                    </button>
                </div>
            </div>

            {/* ── 4. Texto superpuesto ── */}
            <div className="brief-section">
                <label className="brief-label" htmlFor="brief-text-overlay">
                    Texto en imagen (opcional)
                </label>
                <input
                    id="brief-text-overlay"
                    type="text"
                    className="brief-input"
                    placeholder="Ej: 'Desde 850,000 AED'"
                    value={brief.text_overlay}
                    onChange={e => setField('text_overlay', e.target.value)}
                    disabled={isDisabled}
                />
            </div>

            {/* ── 4b. Imagen de referencia (opcional) ── */}
            <div className="brief-section">
                <label className="brief-label">Imagen de referencia (opcional)</label>
                <div className="brief-image-source-toggle">
                    <button
                        type="button"
                        className={refImageSource === 'url' ? 'active' : ''}
                        onClick={() => setRefImageSource('url')}
                    >URL</button>
                    <button
                        type="button"
                        className={refImageSource === 'file' ? 'active' : ''}
                        onClick={() => setRefImageSource('file')}
                    >Subir archivo</button>
                </div>
                {refImageSource === 'url' ? (
                    <input
                        type="url"
                        className="brief-input"
                        placeholder="https://... para guiar el estilo"
                        value={brief.reference_image_url}
                        onChange={e => setField('reference_image_url', e.target.value)}
                        disabled={isDisabled}
                    />
                ) : (
                    <div className="brief-file-upload">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleRefFileChange}
                            disabled={isDisabled}
                        />
                        {refFilePreview && (
                            <img src={refFilePreview} alt="Referencia" className="brief-file-preview" />
                        )}
                    </div>
                )}
            </div>

            {/* ── 5. Elementos de marca ── */}
            <div className="brief-section">
                <label className="brief-label">Elementos de marca</label>
                <div className="brief-checkboxes">
                    {BRAND_ELEMENTS_OPTIONS.map(el => (
                        <label key={el.id} className="brief-checkbox-label">
                            <input
                                type="checkbox"
                                checked={brief.brand_elements.includes(el.id)}
                                onChange={() => toggleBrandElement(el.id)}
                                disabled={isDisabled}
                            />
                            {el.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* ── 6. Formato de salida ── */}
            <div className="brief-section">
                <label className="brief-label">Formato</label>
                <div className="brief-format-grid" role="group" aria-label="Formato de salida">
                    {imageFormats.map(fmt => (
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

            {/* ── 7. Calidad ── */}
            <div className="brief-section">
                <label className="brief-label">Calidad</label>
                <div className="brief-quality-toggle" role="group" aria-label="Calidad">
                    <button
                        type="button"
                        className={`brief-quality-option${outputConfig.quality === 'standard' ? ' active' : ''}`}
                        onClick={() => setOutputField('quality', 'standard')}
                        disabled={isDisabled}
                        aria-pressed={outputConfig.quality === 'standard'}
                    >
                        Standard
                        <span className="brief-quality-cost">${COST_MAP.standard.toFixed(2)}</span>
                    </button>
                    <button
                        type="button"
                        className={`brief-quality-option${outputConfig.quality === 'hd' ? ' active' : ''}`}
                        onClick={() => setOutputField('quality', 'hd')}
                        disabled={isDisabled}
                        aria-pressed={outputConfig.quality === 'hd'}
                    >
                        HD
                        <span className="brief-quality-cost">${COST_MAP.hd.toFixed(2)}</span>
                    </button>
                </div>
            </div>

            {/* ── 7b. Modelo de generación ── */}
            <div className="brief-section">
                <label className="brief-label">Modelo de generación</label>
                <div className="brief-quality-toggle" role="group" aria-label="Modelo de generación">
                    {MODELS_BY_TYPE.image.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            className={`brief-quality-option${outputConfig.model === m.id ? ' active' : ''}`}
                            onClick={() => setOutputField('model', m.id)}
                            disabled={isDisabled}
                            aria-pressed={outputConfig.model === m.id}
                        >
                            {m.label}
                            <span className="brief-quality-cost">{m.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 8. Coste estimado ── */}
            <div className="brief-cost-row" aria-live="polite">
                <span className="brief-cost-label">Coste estimado:</span>
                <span className="brief-cost-value">${estimatedCost.toFixed(2)}</span>
            </div>

            {/* ── 9. Submit ── */}
            <button
                type="submit"
                className="brief-submit-btn"
                disabled={isDisabled}
            >
                {submitting ? (
                    <>
                        <span className="brief-submit-spinner" aria-hidden="true" />
                        Generando...
                    </>
                ) : (
                    'Generar imagen'
                )}
            </button>
        </form>
    );
}
