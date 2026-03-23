import React from 'react';
import WsIcon from '../workspace/WsIcon.jsx';

// ─── Catálogos ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'meta_ads',    label: 'Meta Ads (Facebook / Instagram)' },
  { id: 'google_ads',  label: 'Google Ads' },
  { id: 'tiktok_ads',  label: 'TikTok Ads' },
];

const OBJECTIVES_BY_PLATFORM = {
  meta_ads: [
    { id: 'BRAND_AWARENESS', label: 'Awareness de marca' },
    { id: 'TRAFFIC',         label: 'Tráfico al sitio' },
    { id: 'LEAD_GENERATION', label: 'Generación de leads' },
    { id: 'CONVERSIONS',     label: 'Conversiones / ventas' },
    { id: 'VIDEO_VIEWS',     label: 'Reproducciones de vídeo' },
  ],
  google_ads: [
    { id: 'MAXIMIZE_CONVERSIONS', label: 'Maximizar conversiones' },
    { id: 'TARGET_CPA',           label: 'CPA objetivo' },
    { id: 'TARGET_ROAS',          label: 'ROAS objetivo' },
    { id: 'MAXIMIZE_CLICKS',      label: 'Maximizar clics' },
    { id: 'BRAND_AWARENESS',      label: 'Awareness (Display)' },
  ],
  tiktok_ads: [
    { id: 'TRAFFIC',         label: 'Tráfico al sitio' },
    { id: 'LEAD_GENERATION', label: 'Generación de leads' },
    { id: 'VIDEO_VIEWS',     label: 'Reproducciones de vídeo' },
    { id: 'APP_INSTALL',     label: 'Instalaciones de app' },
  ],
};

const FORMATS_BY_PLATFORM = {
  meta_ads: [
    { id: 'single_image',  label: 'Imagen única (1080×1080 o 1080×1920)' },
    { id: 'carousel',      label: 'Carrusel (2–10 imágenes)' },
    { id: 'video',         label: 'Vídeo (máx. 15s recomendado)' },
    { id: 'stories',       label: 'Stories / Reels (1080×1920)' },
  ],
  google_ads: [
    { id: 'responsive_search', label: 'Responsive Search Ad (RSA)' },
    { id: 'responsive_display', label: 'Responsive Display Ad (RDA)' },
    { id: 'performance_max',    label: 'Performance Max' },
    { id: 'youtube_instream',   label: 'YouTube In-Stream (vídeo)' },
  ],
  tiktok_ads: [
    { id: 'in_feed',    label: 'In-Feed Ad (feed nativo, 9:16)' },
    { id: 'spark_ads',  label: 'Spark Ads (boosted orgánico)' },
    { id: 'topview',    label: 'TopView (pantalla completa al abrir)' },
  ],
};

const BID_STRATEGIES_BY_PLATFORM = {
  meta_ads:   ['LOWEST_COST', 'COST_CAP', 'BID_CAP', 'VALUE_OPTIMIZATION'],
  google_ads: ['MAXIMIZE_CONVERSIONS', 'TARGET_CPA', 'TARGET_ROAS', 'MAXIMIZE_CLICKS', 'MANUAL_CPC'],
  tiktok_ads: ['LOWEST_COST', 'BID_CAP', 'COST_CAP'],
};

const CHANNEL_TO_PLATFORM = {
  meta_ads:   'meta_ads',
  google_ads: 'google_ads',
  tiktok_ads: 'tiktok_ads',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PaidAdBriefPanel({ form, channel, onChange }) {
  // Plataforma derivada del canal; override si el usuario lo cambia
  const derivedPlatform = CHANNEL_TO_PLATFORM[channel] ?? form.ad_platform ?? 'meta_ads';
  const platform = form.ad_platform || derivedPlatform;

  const objectives   = OBJECTIVES_BY_PLATFORM[platform]   ?? [];
  const formats      = FORMATS_BY_PLATFORM[platform]      ?? [];
  const bidStrategies = BID_STRATEGIES_BY_PLATFORM[platform] ?? [];

  function handlePlatformChange(val) {
    // Resetear objetivo y formato al cambiar plataforma
    onChange('ad_platform',    val);
    onChange('ad_objective',   '');
    onChange('ad_format',      '');
    onChange('ad_bid_strategy', '');
  }

  return (
    <div className="cm-paid-brief-section">
      {/* Header */}
      <div style={{
        fontWeight: 600,
        fontSize: '0.82rem',
        color: 'var(--primary)',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <WsIcon name="target" size={14} color="var(--primary)" />
        Brief de Anuncio Pagado
      </div>

      {/* Fila 1: Plataforma + Objetivo */}
      <div className="cm-field-row">
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Plataforma</label>
          <select
            value={platform}
            onChange={e => handlePlatformChange(e.target.value)}
          >
            {PLATFORMS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Objetivo del anuncio</label>
          <select
            value={form.ad_objective ?? ''}
            onChange={e => onChange('ad_objective', e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {objectives.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila 2: Formato + Bid Strategy */}
      <div className="cm-field-row">
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Formato creativo</label>
          <select
            value={form.ad_format ?? ''}
            onChange={e => onChange('ad_format', e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {formats.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Estrategia de puja</label>
          <select
            value={form.ad_bid_strategy ?? ''}
            onChange={e => onChange('ad_bid_strategy', e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {bidStrategies.map(b => (
              <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila 3: Presupuesto diario + total */}
      <div className="cm-field-row">
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Presupuesto diario (USD)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.ad_budget_daily ?? ''}
            onChange={e => onChange('ad_budget_daily', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="cm-field" style={{ flex: 1 }}>
          <label>Presupuesto total (USD)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.ad_budget ?? ''}
            onChange={e => onChange('ad_budget', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Audiencia */}
      <div className="cm-field">
        <label>Audiencia objetivo</label>
        <textarea
          rows={2}
          value={form.audience_notes ?? ''}
          onChange={e => onChange('audience_notes', e.target.value)}
          placeholder="Ej: Inversores hispanohablantes 30-55 años, interés en inmuebles, España + México + Colombia..."
        />
      </div>

      {/* Copy headline (opcional) */}
      <div className="cm-field">
        <label>Headline / Copy principal <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
        <input
          type="text"
          value={form.ad_headline ?? ''}
          onChange={e => onChange('ad_headline', e.target.value)}
          placeholder={platform === 'google_ads' ? 'Máx. 30 caracteres por headline' : 'Máx. 40 caracteres (Meta) / texto libre (TikTok)'}
          maxLength={platform === 'meta_ads' ? 40 : platform === 'google_ads' ? 30 : 100}
        />
      </div>

      {/* Specs badge */}
      <div style={{
        marginTop: '8px',
        padding: '8px 12px',
        background: 'var(--bg-subtle, #f8fafc)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <WsIcon name="info" size={12} color="var(--text-muted)" />
        {platform === 'meta_ads'   && 'Meta: headline ≤40 chars · body ≤125 chars · imagen 1080×1080 o 1080×1920'}
        {platform === 'google_ads' && 'Google: 15 headlines ×30 chars · 4 descriptions ×90 chars · keyword match'}
        {platform === 'tiktok_ads' && 'TikTok: vídeo 1080×1920 9:16 · duración ≤15s · caption + hashtags obligatorios'}
      </div>
    </div>
  );
}
