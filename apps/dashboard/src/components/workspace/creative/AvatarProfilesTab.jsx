import React, { useState } from 'react';
import { AVATARS } from '../creativeConstants.js';

/**
 * AvatarProfilesTab — Pestaña de perfiles de avatares Fernando & Yolanda
 *
 * Muestra la identidad completa de cada avatar: foto, personalidad,
 * nacionalidad, acento, audio player de muestra de voz, y estado de configuración.
 *
 * @param {Object} config — respuesta de GET /api/creative/config
 */
export default function AvatarProfilesTab({ config }) {
    return (
        <div className="avatar-profiles-tab">
            <div className="avatar-profiles-intro">
                <h2 className="avatar-profiles-title">Avatares IA</h2>
                <p className="avatar-profiles-subtitle">
                    Fernando y Yolanda son los presentadores del canal de Emiralia.
                    Generan vídeos con guión + TTS + Lip Sync mediante KIE AI.
                </p>
            </div>

            <div className="avatar-cards-grid">
                {AVATARS.map(avatar => (
                    <AvatarCard
                        key={avatar.id}
                        avatar={avatar}
                        voiceId={config?.[`${avatar.id}_voice_id`] || null}
                        avatarUrl={config?.[`${avatar.id}_avatar_url`] || null}
                    />
                ))}
            </div>

            {(!config?.fernando_voice_id || !config?.yolanda_voice_id) && (
                <div className="avatar-setup-banner">
                    <div className="setup-banner-icon">⚙️</div>
                    <div>
                        <p className="setup-banner-title">Configuración pendiente</p>
                        <p className="setup-banner-desc">
                            Ejecuta el script para generar las imágenes, los audio samples
                            y configurar las voces.
                        </p>
                        <code className="setup-banner-cmd">node tools/images/setup-avatars.js</code>
                    </div>
                </div>
            )}
        </div>
    );
}

function AvatarCard({ avatar, voiceId, avatarUrl }) {
    const [imgError, setImgError] = useState(false);
    const isConfigured = !!voiceId;

    // Determine image source: env URL, local static path, or initials placeholder
    const imgSrc = imgError ? null : (avatarUrl || avatar.imageUrl);

    return (
        <div className={`avatar-card ${isConfigured ? 'avatar-card--configured' : 'avatar-card--pending'}`}>

            {/* ── Header: foto + nombre ── */}
            <div className="avatar-card-header">
                <div className="avatar-photo-wrap">
                    {imgSrc && !imgError ? (
                        <img
                            src={imgSrc}
                            alt={avatar.label}
                            className="avatar-photo"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="avatar-photo-placeholder">
                            <span className="avatar-initials">{avatar.label[0]}</span>
                        </div>
                    )}
                    <span
                        className={`avatar-status-dot ${isConfigured ? 'dot-green' : 'dot-gray'}`}
                        title={isConfigured ? 'Configurado' : 'Sin configurar'}
                    />
                </div>

                <div className="avatar-identity">
                    <div className="avatar-name-row">
                        <h3 className="avatar-name">{avatar.label}</h3>
                        <span className="avatar-flag" title={avatar.nationality}>{avatar.flag}</span>
                    </div>
                    <p className="avatar-role">{avatar.role}</p>
                    <div className="avatar-meta-row">
                        <span className="avatar-meta-chip">{avatar.nationality}</span>
                        <span className="avatar-meta-chip accent">{avatar.accent}</span>
                        <span className={`avatar-meta-chip ${isConfigured ? 'configured' : 'not-configured'}`}>
                            {isConfigured ? '✓ Configurado' : '⚠ Sin configurar'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Personalidad ── */}
            <div className="avatar-section">
                <p className="avatar-section-label">Personalidad</p>
                <div className="avatar-personality-tags">
                    {avatar.personality.map(trait => (
                        <span key={trait} className="personality-tag">{trait}</span>
                    ))}
                </div>
            </div>

            {/* ── Tono ── */}
            <div className="avatar-section">
                <p className="avatar-section-label">Estilo de comunicación</p>
                <p className="avatar-tone">{avatar.tone}</p>
            </div>

            {/* ── Script de muestra ── */}
            <div className="avatar-section">
                <p className="avatar-section-label">Guión de ejemplo</p>
                <p className="avatar-sample-script">"{avatar.sampleScript}"</p>
            </div>

            {/* ── Audio player ── */}
            <div className="avatar-section">
                <p className="avatar-section-label">Muestra de voz</p>
                {isConfigured ? (
                    <div className="avatar-audio-wrap">
                        <audio
                            controls
                            src={avatar.sampleAudioUrl}
                            className="avatar-audio-player"
                            preload="none"
                        >
                            Tu navegador no soporta el elemento audio.
                        </audio>
                    </div>
                ) : (
                    <p className="avatar-audio-placeholder">
                        Audio disponible tras configurar la voz
                    </p>
                )}
            </div>

            {/* ── Voice ID ── */}
            <div className="avatar-card-footer">
                <span className="voice-id-label">Voice ID:</span>
                <code className="voice-id-value">{voiceId || '—'}</code>
            </div>
        </div>
    );
}
