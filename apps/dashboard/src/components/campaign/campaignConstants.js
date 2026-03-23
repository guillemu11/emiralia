// ─── Campaign Manager Constants ───────────────────────────────────────────────

export const CAMPAIGN_STATUS_COLORS = {
  planning:   { bg: 'var(--theme-indigo-soft)',  text: 'var(--theme-indigo)',  label: 'Planning' },
  briefing:   { bg: 'var(--theme-amber-soft)',   text: 'var(--theme-amber)',   label: 'Briefing' },
  producing:  { bg: 'var(--theme-cyan-soft)',    text: 'var(--theme-cyan)',    label: 'Produciendo' },
  reviewing:  { bg: 'var(--theme-purple-soft)',  text: 'var(--theme-purple)',  label: 'En Revisión' },
  active:     { bg: 'var(--theme-green-soft)',   text: 'var(--theme-green)',   label: 'Activa' },
  paused:     { bg: '#fef3c7',                   text: '#d97706',              label: 'Pausada' },
  completed:  { bg: '#f1f5f9',                   text: '#64748b',              label: 'Completada' },
};

export const ITEM_STATUS_COLORS = {
  pending:        { bg: '#f1f5f9',                   text: '#64748b',              label: 'Pendiente' },
  briefing:       { bg: 'var(--theme-amber-soft)',   text: 'var(--theme-amber)',   label: 'Briefing' },
  producing:      { bg: 'var(--theme-cyan-soft)',    text: 'var(--theme-cyan)',    label: 'Produciendo' },
  pending_review: { bg: 'var(--theme-purple-soft)',  text: 'var(--theme-purple)',  label: 'En Revisión' },
  approved:       { bg: 'var(--theme-green-soft)',   text: 'var(--theme-green)',   label: 'Aprobado' },
  scheduled:      { bg: 'var(--theme-blue-soft)',    text: 'var(--theme-blue)',    label: 'Programado' },
  published:      { bg: '#f0fdf4',                   text: '#16a34a',              label: 'Publicado' },
  rejected:       { bg: '#fff1f2',                   text: '#f43f5e',              label: 'Rechazado' },
};

export const CHANNEL_OPTIONS = [
  { id: 'blog',        label: 'Blog',           icon: 'file-text', color: '#6366f1' },
  { id: 'instagram',  label: 'Instagram',       icon: 'instagram',  color: '#ec4899' },
  { id: 'tiktok',     label: 'TikTok',          icon: 'smartphone', color: '#0f172a' },
  { id: 'linkedin',   label: 'LinkedIn',        icon: 'users',      color: '#0ea5e9' },
  { id: 'meta_ads',   label: 'Meta Ads',        icon: 'target',     color: '#3b82f6' },
  { id: 'google_ads', label: 'Google Ads',      icon: 'search',     color: '#f59e0b' },
  { id: 'tiktok_ads', label: 'TikTok Ads',      icon: 'smartphone', color: '#14b8a6' },
  { id: 'email',      label: 'Email',           icon: 'mail',       color: '#8b5cf6' },
];

export const CONTENT_TYPE_BY_CHANNEL = {
  blog:        'blog_post',
  instagram:   'social_image',
  tiktok:      'avatar_video',
  linkedin:    'social_image',
  meta_ads:    'paid_ad_image',
  google_ads:  'paid_ad_image',
  tiktok_ads:  'paid_ad_video',
  email:       'email_campaign',
};

export const CHANNEL_DEFAULTS = {
  blog:        { content_type: 'blog_post',      assigned_agent: 'content-agent' },
  instagram:   { content_type: 'social_image',   assigned_agent: 'social-media-agent' },
  tiktok:      { content_type: 'avatar_video',   assigned_agent: 'social-media-agent' },
  linkedin:    { content_type: 'social_image',   assigned_agent: 'content-agent' },
  meta_ads:    { content_type: 'paid_ad_image',  assigned_agent: 'paid-media-agent' },
  google_ads:  { content_type: 'paid_ad_image',  assigned_agent: 'paid-media-agent' },
  tiktok_ads:  { content_type: 'paid_ad_video',  assigned_agent: 'paid-media-agent' },
  email:       { content_type: 'email_campaign', assigned_agent: 'content-agent' },
};

export const CHANNEL_MAP = Object.fromEntries(
  CHANNEL_OPTIONS.map(c => [c.id, c])
);
