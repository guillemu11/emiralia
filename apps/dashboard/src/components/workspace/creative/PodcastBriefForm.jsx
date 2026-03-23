import React, { useState, useEffect } from 'react';
import { AVATARS, OUTPUT_FORMATS, DURATION_OPTIONS, MODELS_BY_TYPE } from '../creativeConstants.js';

/**
 * PodcastBriefForm — Fase 4 del Creative Studio (Proyecto 043)
 *
 * Brief para generación de episodio de podcast video con Fernando, Yolanda, o ambos.
 * Pipeline: ElevenLabs TTS (por host) → KIE AI Lip Sync → Video Editing (si 2 hosts)
 *
 * Props:
 *   onSubmit       {function} — recibe { brief, outputConfig }
 *   loading        {boolean}  — true mientras hay una generación en curso
 *   suggestedBrief {object}   — brief pre-rellenado desde AIBriefInput
 */

const HOST_OPTIONS = [
    {
        id: 'fernando',
        label: 'Fernando',
        role: 'Asesor de Inversión',
        flag: 'MX',
        accent: 'es-MX',
        imageUrl: '/avatars/fernando.jpg',
    },
    {
        id: 'yolanda',
        label: 'Yolanda',
        role: 'Lifestyle & Lujo',
        flag: 'ES',
        accent: 'es-ES',
        imageUrl: '/avatars/yolanda.jpg',
    },
    {
        id: 'both',
        label: 'Ambos',
        role: 'Fernando + Yolanda',
        flag: '🤝',
        accent: 'es-MX / es-ES',
        imageUrl: null,
    },
];

const BACKGROUND_SCENES = [
    { id: 'minimal_studio',  label: 'Estudio Minimal',   color: '#f1f5f9' },
    { id: 'dubai_skyline',   label: 'Dubai Skyline',     color: '#1e3a5f' },
    { id: 'office',          label: 'Oficina Moderna',   color: '#2d3748' },
    { id: 'coworking',       label: 'Coworking',         color: '#744210' },
];

const VOICE_STYLES = [
    { id: 'natural',      label: 'Natural' },
    { id: 'energetico',   label: 'Energético' },
    { id: 'profesional',  label: 'Profesional' },
];

const PODCAST_FORMATS = [
    { id: '16:9', label: 'Horizontal 16:9', ratio: '16:9', use: 'YouTube / LinkedIn' },
    { id: '1:1',  label: 'Cuadrado 1:1',   ratio: '1:1',  use: 'Instagram' },
];

function FormatRatioPreview({ ratio }) {
    const styles = {
        '1:1':  { width: 28, height: 28 },
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

export default function PodcastBriefForm({ onSubmit, loading = false, suggestedBrief }) {
    const [brief, setBrief] = useState({
        hosts:            'fernando',
        topic:            '',
        talking_points:   '',
        background_scene: 'minimal_studio',
        voice_style:      'natural',
    });

    const [outputConfig, setOutputConfig] = useState({
        format:        '16:9',
        duration:      '60s',
        lipsync_model: 'infinitalk/from-audio',
    });

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors]         = useState({});

    /* Aplicar sugerencia de IA cuando llega */
    useEffect(() => {
        if (!suggestedBrief) return;
        setBrief(prev => ({ ...prev, ...suggestedBrief }));
        setErrors({});
    }, [suggestedBrief]);

    function setField(field, value) {
        setBrief(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    }

    function setOutputField(field, value) {
        setOutputConfig(prev => ({ ...prev, [field]: value }));
    }

    function validate() {
        const errs = {};
        if (!brief.hosts) errs.hosts = 'Selecciona al menos un host.';
        if (!brief.topic.trim()) errs.topic = 'El tema del episodio es obligatorio.';
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        // Parse talking_points de texto libre a array
        const talkingPointsArray = brief.talking_points
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);

        setSubmitting(true);
        try {
            await onSubmit({
                brief: {
                    ...brief,
                    talking_points: talkingPointsArray,
                },
                outputConfig,
            });
        } finally {
            setSubmitting(false);
        }
    }

    const isDisabled = loading || submitting;

    return (
        <form className="brief-form" onSubmit={handleSubmit} noValidate>

            {/* ── 1. Host ── */}
            <div className="brief-section">
                <label className="brief-label">
                    Host
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <div className="brief-host-grid" role="group" aria-label="Seleccionar host">
                    {HOST_OPTIONS.map(host => (
                        <button
                            key={host.id}
                            type="button"
                            className={`brief-host-card${brief.hosts === host.id ? ' active' : ''}`}
                            onClick={() => setField('hosts', host.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.hosts === host.id}
                        >
                            <div className="brief-host-avatar">
                                {host.imageUrl ? (
                                    <img
                                        src={host.imageUrl}
                                        alt={host.label}
                                        className="brief-host-img"
                                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                    />
                                ) : null}
                                <div className="brief-host-initials" style={{ display: host.imageUrl ? 'none' : 'flex' }}>
                                    {host.id === 'both' ? '🤝' : host.label[0]}
                                </div>
                            </div>
                            <span className="brief-host-name">{host.label}</span>
                            <span className="brief-host-role">{host.role}</span>
                            <span className="brief-host-accent">{host.accent}</span>
                        </button>
                    ))}
                </div>
                {errors.hosts && (
                    <p className="brief-error" role="alert">{errors.hosts}</p>
                )}
                {brief.hosts === 'both' && (
                    <p className="brief-field-hint">
                        Fernando y Yolanda se turnarán los talking points. Genera dos segmentos TTS + Lip Sync combinados.
                    </p>
                )}
            </div>

            {/* ── 2. Tema ── */}
            <div className="brief-section">
                <label className="brief-label" htmlFor="podcast-topic">
                    Tema del episodio
                    <span className="brief-required" aria-hidden="true"> *</span>
                </label>
                <input
                    id="podcast-topic"
                    type="text"
                    className={`brief-input${errors.topic ? ' brief-field-error' : ''}`}
                    placeholder="Ej: ROI de propiedades off-plan en Dubai 2025"
                    value={brief.topic}
                    onChange={e => setField('topic', e.target.value)}
                    disabled={isDisabled}
                    required
                />
                {errors.topic && (
                    <p className="brief-error" role="alert">{errors.topic}</p>
                )}
            </div>

            {/* ── 3. Talking Points ── */}
            <div className="brief-section">
                <label className="brief-label" htmlFor="podcast-points">
                    Talking points (uno por línea)
                </label>
                <textarea
                    id="podcast-points"
                    className="brief-textarea"
                    rows={5}
                    placeholder={
                        "Dubai Marina ofrece rentabilidades del 7–9% anual\n" +
                        "Las propiedades off-plan permiten entrada desde AED 100.000\n" +
                        "El mercado creció un 23% en 2024 según DLD"
                    }
                    value={brief.talking_points}
                    onChange={e => setField('talking_points', e.target.value)}
                    disabled={isDisabled}
                />
                <p className="brief-field-hint">
                    {brief.talking_points.split('\n').filter(s => s.trim()).length} puntos añadidos
                </p>
            </div>

            {/* ── 4. Escena de fondo ── */}
            <div className="brief-section">
                <label className="brief-label">Escena de fondo</label>
                <div className="brief-style-grid" role="group" aria-label="Escena de fondo">
                    {BACKGROUND_SCENES.map(scene => (
                        <button
                            key={scene.id}
                            type="button"
                            className={`brief-style-card${brief.background_scene === scene.id ? ' active' : ''}`}
                            onClick={() => setField('background_scene', scene.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.background_scene === scene.id}
                            style={{ '--scene-color': scene.color }}
                        >
                            <span
                                className="brief-scene-swatch"
                                style={{ background: scene.color }}
                                aria-hidden="true"
                            />
                            {scene.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 5. Estilo de voz ── */}
            <div className="brief-section">
                <label className="brief-label">Estilo de voz</label>
                <div className="brief-quality-toggle" role="group" aria-label="Estilo de voz">
                    {VOICE_STYLES.map(style => (
                        <button
                            key={style.id}
                            type="button"
                            className={`brief-quality-option${brief.voice_style === style.id ? ' active' : ''}`}
                            onClick={() => setField('voice_style', style.id)}
                            disabled={isDisabled}
                            aria-pressed={brief.voice_style === style.id}
                        >
                            {style.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 6. Formato de salida ── */}
            <div className="brief-section">
                <label className="brief-label">Formato</label>
                <div className="brief-format-grid" role="group" aria-label="Formato de salida">
                    {PODCAST_FORMATS.map(fmt => (
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

            {/* ── 7. Duración ── */}
            <div className="brief-section">
                <label className="brief-label">Duración</label>
                <div className="brief-quality-toggle" role="group" aria-label="Duración del podcast">
                    {DURATION_OPTIONS.podcast.map(opt => (
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

            {/* ── 8. Modelo de lip sync ── */}
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
                        Generando podcast...
                    </>
                ) : (
                    'Generar podcast'
                )}
            </button>
        </form>
    );
}
