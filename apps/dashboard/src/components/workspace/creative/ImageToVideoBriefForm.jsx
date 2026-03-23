import React, { useState } from 'react';
import { OUTPUT_FORMATS, DURATION_OPTIONS, MODELS_BY_TYPE } from '../creativeConstants.js';

/**
 * ImageToVideoBriefForm
 *
 * Formulario de brief para animacion de imagen estatica a video.
 * Pipeline: KIE AI Image to Video con movimiento de camara.
 *
 * Props:
 *   onSubmit {function} — recibe { brief, outputConfig }
 *   loading  {boolean}  — true mientras hay una generacion en curso
 */

const CAMERA_MOVEMENTS = [
    { id: 'pan',      label: 'Pan' },
    { id: 'zoom_in',  label: 'Zoom In' },
    { id: 'zoom_out', label: 'Zoom Out' },
    { id: 'orbit',    label: 'Orbit' },
    { id: 'static',   label: 'Static' },
];

/* Representacion visual simplificada de cada ratio de aspecto */
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

export default function ImageToVideoBriefForm({ onSubmit, loading = false }) {
    const [brief, setBrief] = useState({
        source_image_url:  '',
        motion_description: '',
        camera_movement:   'pan',
    });

    const [outputConfig, setOutputConfig] = useState({
        format:   '9:16',
        duration: '5s',
        model:    'wan/2-6-flash-image-to-video',
    });

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [imageSource, setImageSource] = useState('url'); // 'url' | 'file'
    const [filePreview, setFilePreview] = useState(null);

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            setFilePreview(ev.target.result);
            setField('source_image_url', ev.target.result);
        };
        reader.readAsDataURL(file);
    }

    /* ── Helpers de estado ── */

    function setField(field, value) {
        setBrief(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    }

    function setOutputField(field, value) {
        setOutputConfig(prev => ({ ...prev, [field]: value }));
    }

    /* ── Validacion ── */

    function validate() {
        const newErrors = {};
        if (!brief.source_image_url.trim()) {
            newErrors.source_image_url = 'La URL de la imagen fuente es obligatoria.';
        }
        if (!brief.motion_description.trim()) {
            newErrors.motion_description = 'La descripcion del movimiento es obligatoria.';
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
    const videoFormats = OUTPUT_FORMATS.video;
    const durationOptions = DURATION_OPTIONS.short_video;

    return (
        <form className="brief-form" onSubmit={handleSubmit} noValidate>

            {/* ── 1. Imagen fuente ── */}
            <div className="brief-section">
                <label className="brief-label" htmlFor="brief-source-image">
                    Imagen fuente
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <div className="brief-image-source-toggle">
                    <button
                        type="button"
                        className={imageSource === 'url' ? 'active' : ''}
                        onClick={() => setImageSource('url')}
                    >URL</button>
                    <button
                        type="button"
                        className={imageSource === 'file' ? 'active' : ''}
                        onClick={() => setImageSource('file')}
                    >Subir archivo</button>
                </div>
                {imageSource === 'url' ? (
                    <input
                        id="brief-source-image"
                        type="url"
                        className={`brief-input${errors.source_image_url ? ' brief-field-error' : ''}`}
                        placeholder="https://... o URL de asset aprobado"
                        value={brief.source_image_url}
                        onChange={e => setField('source_image_url', e.target.value)}
                        disabled={isDisabled}
                    />
                ) : (
                    <div className="brief-file-upload">
                        <input
                            id="brief-source-image"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={isDisabled}
                        />
                        {filePreview && (
                            <img src={filePreview} alt="Preview" className="brief-file-preview" />
                        )}
                    </div>
                )}
                {errors.source_image_url && (
                    <p className="brief-error" role="alert">{errors.source_image_url}</p>
                )}
            </div>

            {/* ── 2. Descripcion del movimiento ── */}
            <div className="brief-section">
                <label className="brief-label" htmlFor="brief-motion">
                    Descripcion del movimiento
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <textarea
                    id="brief-motion"
                    className={`brief-textarea${errors.motion_description ? ' brief-field-error' : ''}`}
                    rows={4}
                    placeholder="Ej: La camara hace un lento zoom in hacia la piscina infinita mientras las palmeras se mueven suavemente..."
                    value={brief.motion_description}
                    onChange={e => setField('motion_description', e.target.value)}
                    required
                    disabled={isDisabled}
                />
                {errors.motion_description && (
                    <p className="brief-error" role="alert">{errors.motion_description}</p>
                )}
            </div>

            {/* ── 3. Movimiento de camara ── */}
            <div className="brief-section">
                <label className="brief-label">Movimiento de camara</label>
                <div className="brief-style-grid" role="group" aria-label="Movimiento de camara">
                    {CAMERA_MOVEMENTS.map(mv => (
                        <button
                            key={mv.id}
                            type="button"
                            className={`brief-style-card${brief.camera_movement === mv.id ? ' active' : ''}`}
                            onClick={() => setField('camera_movement', mv.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.camera_movement === mv.id}
                        >
                            {mv.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 4. Formato de salida ── */}
            <div className="brief-section">
                <label className="brief-label">Formato</label>
                <div className="brief-format-grid" role="group" aria-label="Formato de salida">
                    {videoFormats.map(fmt => (
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

            {/* ── 5. Duracion ── */}
            <div className="brief-section">
                <label className="brief-label">Duracion</label>
                <div className="brief-quality-toggle" role="group" aria-label="Duracion del video">
                    {durationOptions.map(opt => (
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

            {/* ── 6. Modelo de video ── */}
            <div className="brief-section">
                <label className="brief-label">Modelo de video</label>
                <div className="brief-quality-toggle" role="group" aria-label="Modelo de video">
                    {MODELS_BY_TYPE.video.map(m => (
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
                    'Animar imagen'
                )}
            </button>
        </form>
    );
}
