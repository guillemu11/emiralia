import React, { useState } from 'react';
import { AVATARS, OUTPUT_FORMATS, DURATION_OPTIONS, MODELS_BY_TYPE } from '../creativeConstants.js';

/**
 * TextToVideoBriefForm
 *
 * Formulario de brief para generacion de video avatar (Text-to-Video).
 * Pipeline: KIE AI TTS → Lip Sync con Fernando o Yolanda.
 *
 * Props:
 *   onSubmit {function} — recibe { brief, outputConfig }
 *   loading  {boolean}  — true mientras hay una generacion en curso
 */

const TONE_OPTIONS = [
    { id: 'informativo',  label: 'Informativo' },
    { id: 'aspiracional', label: 'Aspiracional' },
    { id: 'urgente',      label: 'Urgente' },
    { id: 'educativo',    label: 'Educativo' },
];

const VOICE_SPEEDS = [
    { value: '0.8', label: '0.8x' },
    { value: '1',   label: '1x' },
    { value: '1.2', label: '1.2x' },
];

const QUALITY_OPTIONS = [
    { value: '720p',  label: '720p' },
    { value: '1080p', label: '1080p' },
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

export default function TextToVideoBriefForm({ onSubmit, loading = false }) {
    const [brief, setBrief] = useState({
        script:      '',
        avatar:      '',
        tone:        'informativo',
        scene:       '',
        subtitles:   false,
        voice_speed: '1',
    });

    const [outputConfig, setOutputConfig] = useState({
        format:        '9:16',
        duration:      '30s',
        quality:       '720p',
        lipsync_model: 'infinitalk/from-audio',
    });

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    /* ── Calculo de palabras y duracion estimada ── */
    // ElevenLabs Spanish: ~2.5 words/sec at 1.0x speed
    const wordCount = brief.script.trim().split(/\s+/).filter(Boolean).length;
    const wordsPerSec = 2.5 * parseFloat(brief.voice_speed || 1);
    const estimatedDuration = wordCount > 0 ? Math.ceil(wordCount / wordsPerSec) : 0;
    const charCount = brief.script.length;
    // KIE AI lipsync limit: 15s audio. At 0.8x speed, ~30 words max (~180 chars).
    const CHAR_LIMIT = 220;
    const CHAR_WARN = 160;
    const DURATION_HARD_LIMIT = 14; // leave 1s buffer under KIE's 15s cap

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
        if (!brief.script.trim()) {
            newErrors.script = 'El guion es obligatorio.';
        } else if (estimatedDuration > DURATION_HARD_LIMIT) {
            newErrors.script = `El guion genera ~${estimatedDuration}s de audio. KIE AI no acepta más de 15s — acorta el texto (máx ~${Math.floor(DURATION_HARD_LIMIT * wordsPerSec)} palabras a velocidad ${brief.voice_speed}x).`;
        }
        if (!brief.avatar) {
            newErrors.avatar = 'Selecciona un avatar.';
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
    const durationOptions = DURATION_OPTIONS.avatar_video;

    return (
        <form className="brief-form" onSubmit={handleSubmit} noValidate>

            {/* ── 1. Script ── */}
            <div className="brief-section">
                <label className="brief-label" htmlFor="brief-script">
                    Guion del video
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <textarea
                    id="brief-script"
                    className={`brief-textarea${errors.script ? ' brief-field-error' : ''}`}
                    rows={6}
                    placeholder="Ej: Buenos dias, soy Fernando. Hoy te hablo de una oportunidad unica en Dubai Marina..."
                    value={brief.script}
                    onChange={e => setField('script', e.target.value)}
                    maxLength={CHAR_LIMIT}
                    required
                    disabled={isDisabled}
                />
                <p className="brief-field-hint" aria-live="polite" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: estimatedDuration > DURATION_HARD_LIMIT ? '#dc2626' : estimatedDuration > 11 ? '#d97706' : undefined, fontWeight: estimatedDuration > 11 ? 600 : undefined }}>
                        {wordCount} palabras &middot; ~{estimatedDuration}s {estimatedDuration > DURATION_HARD_LIMIT ? '⚠ supera límite 15s' : estimatedDuration > 11 ? '⚠ cerca del límite' : ''}
                    </span>
                    <span style={{ color: charCount > CHAR_WARN ? '#dc2626' : undefined, fontWeight: charCount > CHAR_WARN ? 600 : undefined }}>
                        {charCount}/{CHAR_LIMIT}
                    </span>
                </p>
                {errors.script && (
                    <p className="brief-error" role="alert">{errors.script}</p>
                )}
            </div>

            {/* ── 2. Avatar ── */}
            <div className="brief-section">
                <label className="brief-label">
                    Avatar
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <div className="brief-avatar-group" role="group" aria-label="Seleccionar avatar">
                    {AVATARS.map(av => (
                        <button
                            key={av.id}
                            type="button"
                            className={`brief-avatar-btn${brief.avatar === av.id ? ' active' : ''}`}
                            onClick={() => setField('avatar', av.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.avatar === av.id}
                        >
                            <span className="brief-avatar-name">{av.label}</span>
                            <span className="brief-avatar-desc">{av.description}</span>
                        </button>
                    ))}
                </div>
                {errors.avatar && (
                    <p className="brief-error" role="alert">{errors.avatar}</p>
                )}
            </div>

            {/* ── 3. Tono ── */}
            <div className="brief-section">
                <label className="brief-label">Tono</label>
                <div className="brief-style-grid" role="group" aria-label="Tono del video">
                    {TONE_OPTIONS.map(tone => (
                        <button
                            key={tone.id}
                            type="button"
                            className={`brief-style-card${brief.tone === tone.id ? ' active' : ''}`}
                            onClick={() => setField('tone', tone.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.tone === tone.id}
                        >
                            {tone.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 4. Escena ── */}
            <div className="brief-section">
                <label className="brief-label" htmlFor="brief-scene">
                    Escena de fondo (opcional)
                </label>
                <input
                    id="brief-scene"
                    type="text"
                    className="brief-input"
                    placeholder="Ej: oficina moderna con skyline de Dubai al atardecer"
                    value={brief.scene}
                    onChange={e => setField('scene', e.target.value)}
                    disabled={isDisabled}
                />
            </div>

            {/* ── 5. Subtitulos ── */}
            <div className="brief-section">
                <label className="brief-label">Subtitulos</label>
                <div className="brief-checkboxes">
                    <label className="brief-checkbox-label">
                        <input
                            type="checkbox"
                            checked={brief.subtitles}
                            onChange={e => setField('subtitles', e.target.checked)}
                            disabled={isDisabled}
                        />
                        Anadir subtitulos
                    </label>
                </div>
            </div>

            {/* ── 6. Velocidad de voz ── */}
            <div className="brief-section">
                <label className="brief-label">Velocidad de voz</label>
                <div className="brief-quality-toggle" role="group" aria-label="Velocidad de voz">
                    {VOICE_SPEEDS.map(speed => (
                        <button
                            key={speed.value}
                            type="button"
                            className={`brief-quality-option${brief.voice_speed === speed.value ? ' active' : ''}`}
                            onClick={() => setField('voice_speed', speed.value)}
                            disabled={isDisabled}
                            aria-pressed={brief.voice_speed === speed.value}
                        >
                            {speed.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 7. Formato de salida ── */}
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

            {/* ── 8. Duracion ── */}
            <div className="brief-section">
                <label className="brief-label">Duracion maxima</label>
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

            {/* ── 9. Calidad ── */}
            <div className="brief-section">
                <label className="brief-label">Calidad de exportacion</label>
                <div className="brief-quality-toggle" role="group" aria-label="Calidad de video">
                    {QUALITY_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`brief-quality-option${outputConfig.quality === opt.value ? ' active' : ''}`}
                            onClick={() => setOutputField('quality', opt.value)}
                            disabled={isDisabled}
                            aria-pressed={outputConfig.quality === opt.value}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 10. Modelo de lip sync ── */}
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
                        Generando...
                    </>
                ) : (
                    'Generar video avatar'
                )}
            </button>
        </form>
    );
}
