import React, { useState } from 'react';
import { OUTPUT_FORMATS } from '../creativeConstants.js';

/**
 * MultiframeBriefForm
 *
 * Formulario de brief para video multi-frame: hasta 6 imagenes con transiciones.
 * Pipeline: KIE AI Video Editing.
 *
 * Props:
 *   onSubmit {function} — recibe { brief, outputConfig }
 *   loading  {boolean}  — true mientras hay una generacion en curso
 */

const TRANSITION_STYLES = [
    { id: 'fade',  label: 'Fade' },
    { id: 'cut',   label: 'Cut' },
    { id: 'wipe',  label: 'Wipe' },
    { id: 'morph', label: 'Morph' },
];

const MAX_FRAMES = 6;
const MIN_FRAMES = 2;

/* Solo formatos 9:16 y 16:9 para multiframe */
const MULTIFRAME_FORMATS = OUTPUT_FORMATS.video.filter(f => f.id === '9:16' || f.id === '16:9');

/* Representacion visual simplificada de cada ratio de aspecto */
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

function createEmptyFrame() {
    return { image_url: '', caption: '', duration_s: 3 };
}

export default function MultiframeBriefForm({ onSubmit, loading = false }) {
    const [brief, setBrief] = useState({
        frames: [
            createEmptyFrame(),
            createEmptyFrame(),
        ],
        transition_style: 'fade',
    });

    const [outputConfig, setOutputConfig] = useState({
        format: '9:16',
    });

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    /* Parallel arrays for image source type and file previews per frame */
    const [frameSources, setFrameSources] = useState(['url', 'url']); // 'url' | 'file'
    const [framePreviews, setFramePreviews] = useState([null, null]);

    /* ── Duracion total calculada ── */
    const totalDuration = brief.frames.reduce((sum, f) => sum + (Number(f.duration_s) || 0), 0);

    /* ── Helpers de estado ── */

    function setOutputField(field, value) {
        setOutputConfig(prev => ({ ...prev, [field]: value }));
    }

    function updateFrame(index, field, value) {
        setBrief(prev => {
            const frames = prev.frames.map((f, i) =>
                i === index ? { ...f, [field]: value } : f
            );
            return { ...prev, frames };
        });
        if (errors.frames) {
            setErrors(prev => ({ ...prev, frames: null }));
        }
    }

    function setFrameSource(index, source) {
        setFrameSources(prev => prev.map((s, i) => i === index ? source : s));
        // Clear the image_url when switching mode
        updateFrame(index, 'image_url', '');
        setFramePreviews(prev => prev.map((p, i) => i === index ? null : p));
    }

    function handleFrameFileChange(index, e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            setFramePreviews(prev => prev.map((p, i) => i === index ? ev.target.result : p));
            updateFrame(index, 'image_url', ev.target.result);
        };
        reader.readAsDataURL(file);
    }

    function addFrame() {
        if (brief.frames.length >= MAX_FRAMES) return;
        setBrief(prev => ({
            ...prev,
            frames: [...prev.frames, createEmptyFrame()],
        }));
        setFrameSources(prev => [...prev, 'url']);
        setFramePreviews(prev => [...prev, null]);
    }

    function removeFrame(index) {
        if (brief.frames.length <= MIN_FRAMES) return;
        setBrief(prev => ({
            ...prev,
            frames: prev.frames.filter((_, i) => i !== index),
        }));
        setFrameSources(prev => prev.filter((_, i) => i !== index));
        setFramePreviews(prev => prev.filter((_, i) => i !== index));
    }

    function moveFrameUp(index) {
        if (index === 0) return;
        setBrief(prev => {
            const frames = [...prev.frames];
            [frames[index - 1], frames[index]] = [frames[index], frames[index - 1]];
            return { ...prev, frames };
        });
        setFrameSources(prev => {
            const arr = [...prev];
            [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
            return arr;
        });
        setFramePreviews(prev => {
            const arr = [...prev];
            [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
            return arr;
        });
    }

    function moveFrameDown(index) {
        if (index === brief.frames.length - 1) return;
        setBrief(prev => {
            const frames = [...prev.frames];
            [frames[index], frames[index + 1]] = [frames[index + 1], frames[index]];
            return { ...prev, frames };
        });
        setFrameSources(prev => {
            const arr = [...prev];
            [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
            return arr;
        });
        setFramePreviews(prev => {
            const arr = [...prev];
            [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
            return arr;
        });
    }

    function setTransition(value) {
        setBrief(prev => ({ ...prev, transition_style: value }));
    }

    /* ── Validacion ── */

    function validate() {
        const newErrors = {};
        if (brief.frames.length < MIN_FRAMES) {
            newErrors.frames = `Se necesitan al menos ${MIN_FRAMES} frames.`;
        }
        const missingUrls = brief.frames.some(f => !f.image_url.trim());
        if (missingUrls) {
            newErrors.frames = 'Todos los frames deben tener una imagen.';
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

    const isDisabled = loading || submitting;
    const canAddFrame = brief.frames.length < MAX_FRAMES;

    return (
        <form className="brief-form" onSubmit={handleSubmit} noValidate>

            {/* ── 1. Frames ── */}
            <div className="brief-section">
                <label className="brief-label">
                    Frames
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>

                <div className="brief-frames-list">
                    {brief.frames.map((frame, index) => (
                        <div key={index} className="brief-frame-slot">

                            {/* Badge de numero de frame */}
                            <div className="brief-frame-header">
                                <span className="brief-frame-badge">Frame {index + 1}</span>
                                <div className="brief-frame-actions">
                                    <button
                                        type="button"
                                        className="brief-frame-move-btn"
                                        onClick={() => moveFrameUp(index)}
                                        disabled={isDisabled || index === 0}
                                        aria-label={`Mover frame ${index + 1} hacia arriba`}
                                        title="Mover arriba"
                                    >
                                        &uarr;
                                    </button>
                                    <button
                                        type="button"
                                        className="brief-frame-move-btn"
                                        onClick={() => moveFrameDown(index)}
                                        disabled={isDisabled || index === brief.frames.length - 1}
                                        aria-label={`Mover frame ${index + 1} hacia abajo`}
                                        title="Mover abajo"
                                    >
                                        &darr;
                                    </button>
                                    {brief.frames.length > MIN_FRAMES && (
                                        <button
                                            type="button"
                                            className="brief-frame-remove-btn"
                                            onClick={() => removeFrame(index)}
                                            disabled={isDisabled}
                                            aria-label={`Eliminar frame ${index + 1}`}
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* URL imagen — con toggle URL / Subir archivo */}
                            <div className="brief-image-source-toggle">
                                <button
                                    type="button"
                                    className={frameSources[index] === 'url' ? 'active' : ''}
                                    onClick={() => setFrameSource(index, 'url')}
                                >URL</button>
                                <button
                                    type="button"
                                    className={frameSources[index] === 'file' ? 'active' : ''}
                                    onClick={() => setFrameSource(index, 'file')}
                                >Subir archivo</button>
                            </div>

                            {frameSources[index] === 'url' ? (
                                <input
                                    type="url"
                                    className="brief-input"
                                    placeholder="URL de imagen..."
                                    value={frame.image_url}
                                    onChange={e => updateFrame(index, 'image_url', e.target.value)}
                                    disabled={isDisabled}
                                    aria-label={`URL de imagen para frame ${index + 1}`}
                                />
                            ) : (
                                <div className="brief-file-upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleFrameFileChange(index, e)}
                                        disabled={isDisabled}
                                        aria-label={`Imagen para frame ${index + 1}`}
                                    />
                                    {framePreviews[index] && (
                                        <img
                                            src={framePreviews[index]}
                                            alt={`Frame ${index + 1} preview`}
                                            className="brief-file-preview"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Caption */}
                            <input
                                type="text"
                                className="brief-input"
                                placeholder="Pie de foto opcional"
                                value={frame.caption}
                                onChange={e => updateFrame(index, 'caption', e.target.value)}
                                disabled={isDisabled}
                                aria-label={`Pie de foto para frame ${index + 1}`}
                            />

                            {/* Duracion del frame */}
                            <div className="brief-frame-duration">
                                <label className="brief-frame-duration-label" htmlFor={`frame-duration-${index}`}>
                                    Duracion (s):
                                </label>
                                <input
                                    id={`frame-duration-${index}`}
                                    type="number"
                                    className="brief-input brief-frame-duration-input"
                                    min={1}
                                    max={10}
                                    value={frame.duration_s}
                                    onChange={e => updateFrame(index, 'duration_s', parseInt(e.target.value, 10) || 1)}
                                    disabled={isDisabled}
                                    aria-label={`Duracion del frame ${index + 1} en segundos`}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {errors.frames && (
                    <p className="brief-error" role="alert">{errors.frames}</p>
                )}

                {/* Duracion total calculada */}
                <p className="brief-field-hint" aria-live="polite">
                    Duracion total: {totalDuration}s
                </p>

                {/* Boton anadir frame */}
                <button
                    type="button"
                    className="brief-add-frame-btn"
                    onClick={addFrame}
                    disabled={isDisabled || !canAddFrame}
                    aria-label="Anadir un nuevo frame"
                >
                    + Anadir frame
                    {!canAddFrame && <span className="brief-add-frame-limit"> (max {MAX_FRAMES})</span>}
                </button>
            </div>

            {/* ── 2. Estilo de transicion ── */}
            <div className="brief-section">
                <label className="brief-label">Estilo de transicion</label>
                <div className="brief-style-grid" role="group" aria-label="Estilo de transicion">
                    {TRANSITION_STYLES.map(ts => (
                        <button
                            key={ts.id}
                            type="button"
                            className={`brief-style-card${brief.transition_style === ts.id ? ' active' : ''}`}
                            onClick={() => setTransition(ts.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.transition_style === ts.id}
                        >
                            {ts.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 3. Formato de salida ── */}
            <div className="brief-section">
                <label className="brief-label">Formato</label>
                <div className="brief-format-grid" role="group" aria-label="Formato de salida">
                    {MULTIFRAME_FORMATS.map(fmt => (
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

            {/* ── Submit ── */}
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
                    'Generar video multi-frame'
                )}
            </button>
        </form>
    );
}
