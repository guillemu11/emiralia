/**
 * Constantes compartidas entre los componentes del sistema de Artifacts.
 * Usadas en ArtifactCard, ArtifactPreviewModal, PublishMenu y ContentWorkspace.
 */

export const STATUS_COLORS = {
    draft:          { color: '#94a3b8', bg: '#f1f5f9', label: 'Borrador' },
    pending_review: { color: '#f59e0b', bg: '#fffbeb', label: 'En revisión' },
    approved:       { color: '#10b981', bg: '#ecfdf5', label: 'Aprobado' },
    rejected:       { color: '#ef4444', bg: '#fef2f2', label: 'Rechazado' },
    published:      { color: '#3b82f6', bg: '#eff6ff', label: 'Publicado' },
};

export const TYPE_LABELS = {
    blog_post:         'Blog Post',
    property_listing:  'Ficha Propiedad',
    email_template:    'Email Template',
    // Analytics types
    report:            'Reporte',
    kpi_snapshot:      'KPI Snapshot',
    funnel_analysis:   'Funnel',
    market_benchmark:  'Benchmark de Mercado',
    cohort_analysis:   'Análisis de Cohorte',
    // Legal types
    faq_entry:         'FAQ',
    legal_guide:       'Guía Legal',
    investor_brief:    'Brief Inversor',
    regulatory_alert:  'Alerta Regulatoria',
    // SEO types
    keyword:         'Keyword',
    seo_audit:       'SEO Audit',
    meta_tag:        'Meta Tag',
    structured_data: 'Structured Data',
    // WAT Auditor types
    audit_report:         'Audit Report',
    inconsistency:        'Inconsistencia',
    improvement_proposal: 'Propuesta de Mejora',
};

export const TYPE_ICONS = {
    blog_post:         'pen-line',
    property_listing:  'building-2',
    email_template:    'mail',
    // Analytics types
    report:            'bar-chart-2',
    kpi_snapshot:      'trending-up',
    funnel_analysis:   'filter',
    market_benchmark:  'scale',
    cohort_analysis:   'users',
    // Legal types
    faq_entry:         'help-circle',
    legal_guide:       'book-open',
    investor_brief:    'clipboard',
    regulatory_alert:  'alert-triangle',
    // SEO types
    keyword:         'key',
    seo_audit:       'search',
    meta_tag:        'tag',
    structured_data: 'code-2',
    // WAT Auditor types
    audit_report:         'clipboard-list',
    inconsistency:        'alert-circle',
    improvement_proposal: 'lightbulb',
};

export const PUBLISH_DESTINATIONS = {
    blog_post: [
        { id: 'web',           label: 'Web Emiralia' },
        { id: 'email',         label: 'Newsletter' },
        { id: 'social_snippet', label: 'Social Snippet' },
    ],
    property_listing: [
        { id: 'web',         label: 'Web Emiralia' },
        { id: 'email_alert', label: 'Email Alert' },
        { id: 'social_post', label: 'Social Post' },
    ],
    email_template: [
        { id: 'email_send', label: 'Enviar Email' },
        { id: 'email_test', label: 'Email de prueba' },
    ],
    video_script: [
        { id: 'heygen',    label: 'Enviar a HeyGen' },
        { id: 'instagram', label: 'Instagram Reels' },
        { id: 'tiktok',    label: 'TikTok' },
    ],
    social_post: [
        { id: 'instagram', label: 'Instagram' },
        { id: 'tiktok',    label: 'TikTok' },
    ],
    avatar_brief: [
        { id: 'heygen', label: 'Enviar a HeyGen' },
    ],
    content_calendar: [
        { id: 'approve_all', label: 'Aprobar todos' },
    ],
    // Analytics types
    report: [
        { id: 'developer_portal', label: 'Developer Portal B2B' },
        { id: 'email',            label: 'Enviar por Email' },
    ],
    kpi_snapshot: [
        { id: 'pm_agent',         label: 'PM Agent (coordinación)' },
        { id: 'developer_portal', label: 'Developer Portal' },
    ],
    funnel_analysis: [
        { id: 'pm_agent',        label: 'PM Agent' },
        { id: 'marketing_agent', label: 'Marketing Agent (handoff)' },
    ],
    market_benchmark: [
        { id: 'developer_portal', label: 'Developer Portal' },
        { id: 'email',            label: 'Enviar por Email' },
    ],
    cohort_analysis: [
        { id: 'developer_portal', label: 'Developer Portal' },
    ],
    // Legal types
    faq_entry: [
        { id: 'web_legal', label: 'Web Emiralia /legal' },
        { id: 'email',     label: 'Newsletter Legal' },
    ],
    legal_guide: [
        { id: 'web_legal', label: 'Web Emiralia /legal' },
        { id: 'pdf',       label: 'PDF Descargable' },
        { id: 'email',     label: 'Newsletter Legal' },
    ],
    investor_brief: [
        { id: 'web_legal', label: 'Web Emiralia /legal' },
        { id: 'pdf',       label: 'PDF Descargable' },
    ],
    regulatory_alert: [
        { id: 'web_legal', label: 'Web Emiralia /legal' },
        { id: 'email',     label: 'Newsletter de Alertas' },
    ],
    // SEO types
    keyword: [
        { id: 'content-agent', label: 'Brief a Content Agent' },
        { id: 'web_meta',      label: 'Actualizar metas en web' },
    ],
    seo_audit: [
        { id: 'dev-agent',     label: 'Ticket a Dev Agent' },
        { id: 'content-agent', label: 'Brief a Content Agent' },
    ],
    meta_tag: [
        { id: 'web_meta',  label: 'Aplicar al Site (API)' },
        { id: 'dev-agent', label: 'Handoff a Dev Agent' },
    ],
    structured_data: [
        { id: 'web_meta',  label: 'Deploy Schema en web' },
        { id: 'dev-agent', label: 'Handoff a Dev Agent' },
    ],
};

export const HANDOFF_AGENTS = [
    { id: 'content-agent',      label: 'Convertir en artículo (Content Agent)' },
    { id: 'translation-agent',  label: 'Traducir (Translation Agent)' },
    { id: 'seo-agent',          label: 'Optimizar SEO (SEO Agent)' },
    { id: 'social-media-agent', label: 'Snippet social (Social Media Agent)' },
    { id: 'pm-agent',           label: 'Enviar a PM Agent' },
    { id: 'marketing-agent',    label: 'Enviar a Marketing Agent' },
    { id: 'research-agent',     label: 'Investigar más (Research Agent)' },
];

// ─── Social Media Workspace constants ────────────────────────────────────────

export const SOCIAL_TYPE_LABELS = {
    video_script:     'Video Script',
    social_post:      'Post Social',
    avatar_brief:     'Brief de Avatar',
    content_calendar: 'Calendario',
};

export const SOCIAL_TYPE_ICONS = {
    video_script:     'video',
    social_post:      'image',
    avatar_brief:     'user-check',
    content_calendar: 'calendar',
};

export const AVATAR_OPTIONS = [
    { id: 'Fernando', label: 'Fernando', color: '#2563EB', bg: '#eff6ff' },
    { id: 'Yolanda',  label: 'Yolanda',  color: '#7c3aed', bg: '#f5f3ff' },
];

export const PLATFORM_OPTIONS = [
    { id: 'Instagram', label: 'Instagram', icon: 'instagram' },
    { id: 'TikTok',    label: 'TikTok',   icon: 'smartphone' },
    { id: 'Both',      label: 'Ambas',    icon: 'smartphone' },
];

export const DURATION_OPTIONS = [
    { id: '30s',  label: '30 segundos', words: 75  },
    { id: '60s',  label: '1 minuto',    words: 150 },
    { id: '90s',  label: '1.5 minutos', words: 225 },
    { id: '3min', label: '3 minutos',   words: 450 },
];

export const CTA_OPTIONS = [
    { id: 'web',       label: 'Ver la propiedad en web' },
    { id: 'contact',   label: 'Contáctanos ahora' },
    { id: 'subscribe', label: 'Suscríbete al canal' },
];

// ─── Marketing Workspace constants ───────────────────────────────────────────

export const MARKETING_TYPES = [
    { value: 'campaign_brief',  label: 'Campaign Brief',       icon: 'target',    desc: 'Brief completo de campaña de marketing' },
    { value: 'positioning_doc', label: 'Documento Estratégico', icon: 'file-text', desc: 'ICP, propuesta de valor, battlecard o GTM Plan' },
    { value: 'gtm_strategy',    label: 'GTM Strategy',          icon: 'map',       desc: 'Estrategia go-to-market por fase y canal' },
    { value: 'channel_report',  label: 'Channel Report',        icon: 'bar-chart', desc: 'Reporte de rendimiento por canal de marketing' },
];

export const MARKETING_TYPE_LABELS = {
    campaign_brief:  'Campaign Brief',
    positioning_doc: 'Documento Estratégico',
    gtm_strategy:    'GTM Strategy',
    channel_report:  'Channel Report',
};

export const MARKETING_TYPE_ICONS = {
    campaign_brief:  'target',
    positioning_doc: 'file-text',
    gtm_strategy:    'map',
    channel_report:  'bar-chart',
};

export const CAMPAIGN_CHANNELS = [
    { id: 'Organic',      label: 'Organic Search',   icon: 'search' },
    { id: 'Paid Social',  label: 'Paid Social',       icon: 'target' },
    { id: 'Email',        label: 'Email Marketing',   icon: 'mail' },
    { id: 'SEO',          label: 'SEO',               icon: 'trending-up' },
    { id: 'Partnerships', label: 'Partnerships',      icon: 'users' },
];

export const DOC_SUBTYPES = [
    { value: 'icp',             label: 'ICP — Ideal Customer Profile' },
    { value: 'propuesta_valor', label: 'Propuesta de Valor' },
    { value: 'battlecard',      label: 'Battlecard vs Competencia' },
    { value: 'gtm_plan',        label: 'GTM Plan' },
];

export const REPORT_PERIODS = [
    { id: 'last_week',    label: 'Última semana' },
    { id: 'last_month',   label: 'Último mes' },
    { id: 'last_quarter', label: 'Último trimestre' },
];

export const MARKETING_PUBLISH_DESTINATIONS = {
    campaign_brief:  [
        { id: 'social-media-agent', label: 'Social Media Agent' },
        { id: 'content-agent',      label: 'Content Agent' },
        { id: 'email_platform',     label: 'Email Platform' },
    ],
    positioning_doc: [
        { id: 'web',          label: 'Web Emiralia' },
        { id: 'content-agent', label: 'Content Agent' },
    ],
    gtm_strategy: [
        { id: 'social-media-agent', label: 'Social Media Agent' },
        { id: 'content-agent',      label: 'Content Agent' },
    ],
    channel_report: [
        { id: 'analytics-agent', label: 'Analytics Agent' },
        { id: 'email_platform',  label: 'Email Platform' },
    ],
};

export const MARKETING_HANDOFF_AGENTS = [
    { id: 'social-media-agent', label: 'Social Media Agent' },
    { id: 'content-agent',      label: 'Content Agent' },
    { id: 'analytics-agent',    label: 'Analytics Agent' },
];

export const CONTENT_TYPES = [
    { id: 'blog_post',        label: 'Blog Post',        desc: 'Artículo informativo o de inversión' },
    { id: 'property_listing', label: 'Ficha Propiedad',  desc: 'Descripción comercial de una propiedad' },
    { id: 'email_template',   label: 'Email Template',   desc: 'Email para campaña o newsletter' },
];

export const TONES = [
    { id: 'informativo',    label: 'Informativo' },
    { id: 'conversacional', label: 'Conversacional' },
    { id: 'persuasivo',     label: 'Persuasivo' },
    { id: 'urgente',        label: 'Urgente' },
];

export const LANGUAGES = [
    { id: 'es-ES', label: 'ES — España' },
    { id: 'es-MX', label: 'ES — México' },
    { id: 'es-CO', label: 'ES — Colombia' },
    { id: 'en',    label: 'EN — English' },
];

// ─── Analytics Workspace constants ───────────────────────────────────────────

export const ANALYTICS_REPORT_TYPES = [
    { id: 'kpi_snapshot',     label: 'KPI Snapshot',      desc: 'Métricas clave de la plataforma: propiedades, leads, revenue', skill: '/plataforma-kpis' },
    { id: 'report',           label: 'Market Pulse',       desc: 'Tendencias semanales del mercado EAU',                         skill: '/market-pulse' },
    { id: 'funnel_analysis',  label: 'Funnel Report',      desc: 'Análisis del funnel Visitas → Leads → Deals',                  skill: '/funnel-report' },
    { id: 'market_benchmark', label: 'Market Benchmark',   desc: 'Comparativa automática vs PropertyFinder y Bayut',             skill: '/market-benchmark' },
    { id: 'cohort_analysis',  label: 'ROI por Zona',       desc: 'Estimación de ROI por zona y tipo de propiedad',               skill: '/roi-estimator' },
];

export const FUNNEL_STAGES = [
    { id: 'visits',    label: 'Visitas',   color: '#3b82f6' },
    { id: 'leads',     label: 'Leads',     color: '#8b5cf6' },
    { id: 'qualified', label: 'Qualified', color: '#f59e0b' },
    { id: 'meetings',  label: 'Meetings',  color: '#10b981' },
    { id: 'deals',     label: 'Deals',     color: '#16a34a' },
];

// ─── Data Workspace constants ─────────────────────────────────────────────────

export const DATA_TYPE_LABELS = {
    scrape_job:          'Scraping Job',
    dataset:             'Dataset',
    dedup_report:        'Reporte Deduplicación',
    data_quality_report: 'Reporte de Calidad',
};

export const DATA_TYPE_ICONS = {
    scrape_job:          'server',
    dataset:             'database',
    dedup_report:        'layers',
    data_quality_report: 'check-square',
};

export const DATA_JOB_STATUS = {
    idle:        { label: 'Inactivo',     color: '#94a3b8', bg: '#f1f5f9' },
    running:     { label: 'Ejecutando…',  color: '#f59e0b', bg: '#fffbeb' },
    done:        { label: 'Completado',   color: '#10b981', bg: '#ecfdf5' },
    error:       { label: 'Error',        color: '#ef4444', bg: '#fef2f2' },
    coming_soon: { label: 'Próximamente', color: '#8b5cf6', bg: '#f5f3ff' },
};

// ─── DESIGN WORKSPACE ────────────────────────────────────────────────────────

export const DESIGN_TYPES = [
    { id: 'page_design',        label: 'Diseño de Página',  desc: 'Landing page, sección o página completa' },
    { id: 'component',          label: 'Componente',        desc: 'UI component reutilizable' },
    { id: 'template',           label: 'Template',          desc: 'Plantilla para email, social o landing' },
    { id: 'mockup',             label: 'Mockup',            desc: 'Boceto o wireframe de nueva UI' },
    { id: 'brand_audit_report', label: 'Brand Audit',       desc: 'Reporte de cumplimiento de brand guidelines' },
];

export const DESIGN_TYPE_LABELS = {
    page_design:        'Diseño de Página',
    component:          'Componente',
    template:           'Template',
    mockup:             'Mockup',
    brand_audit_report: 'Brand Audit',
};

export const DESIGN_TYPE_ICONS = {
    page_design:        'monitor',
    component:          'puzzle',
    template:           'layout',
    mockup:             'pen-tool',
    brand_audit_report: 'clipboard-list',
};

export const DESIGN_PUBLISH_DESTINATIONS = {
    page_design:        [{ id: 'vercel', label: 'Deploy a Vercel' }, { id: 'dev-agent', label: 'Handoff Dev Agent' }],
    component:          [{ id: 'dev-agent', label: 'Handoff Dev Agent' }],
    template:           [{ id: 'dev-agent', label: 'Handoff Dev Agent' }, { id: 'social-media-agent', label: 'Social Media Agent' }],
    mockup:             [{ id: 'dev-agent', label: 'Handoff Dev Agent' }, { id: 'marketing-agent', label: 'Marketing Agent' }],
    brand_audit_report: [{ id: 'pm-agent', label: 'PM Agent' }, { id: 'dev-agent', label: 'Dev Agent' }],
};

export const DESIGN_HANDOFF_AGENTS = [
    { id: 'dev-agent',          label: 'Deploy (Dev Agent)' },
    { id: 'content-agent',      label: 'Assets (Content Agent)' },
    { id: 'marketing-agent',    label: 'Ad creatives (Marketing Agent)' },
    { id: 'social-media-agent', label: 'Templates IG (Social Media Agent)' },
];

// ─── Legal Workspace constants ────────────────────────────────────────────────

export const LEGAL_CATEGORIES = [
    'RERA', 'Golden Visa', 'DLD', 'Hipotecas',
    'DIFC', 'Impuestos', 'Zonas Libres', 'Off-Plan',
];

export const LEGAL_TYPES = [
    { id: 'faq_entry',        label: 'FAQ',               icon: 'help-circle',   desc: 'Pregunta frecuente con respuesta estructurada' },
    { id: 'legal_guide',      label: 'Guía Legal',        icon: 'book-open',     desc: 'Guía completa sobre un tema legal o regulatorio' },
    { id: 'investor_brief',   label: 'Brief Inversor',    icon: 'clipboard',     desc: 'Resumen ejecutivo legal para inversores' },
    { id: 'regulatory_alert', label: 'Alerta Regulatoria', icon: 'alert-triangle', desc: 'Cambio normativo reciente con impacto en inversores' },
];

export const LEGAL_HANDOFF_AGENTS = [
    { id: 'content-agent',     label: 'Convertir en artículo (Content Agent)' },
    { id: 'translation-agent', label: 'Traducir a EN (Translation Agent)' },
    { id: 'research-agent',    label: 'Investigar más (Research Agent)' },
];

// ─── Dev Workspace constants ──────────────────────────────────────────────────

export const DEV_TYPE_LABELS = {
    feature:    'Feature',
    bug_fix:    'Bug Fix',
    migration:  'Migration',
    deployment: 'Deployment',
};

export const DEV_TYPE_ICONS = {
    feature:    'zap',
    bug_fix:    'alert-circle',
    migration:  'layers',
    deployment: 'rocket',
};

// Kanban: mapeo artifact status → columna visual
export const KANBAN_COLUMNS = [
    { id: 'draft',          label: 'Todo',        color: '#94a3b8' },
    { id: 'pending_review', label: 'In Progress', color: '#f59e0b' },
    { id: 'approved',       label: 'Review',      color: '#6366f1' },
    { id: 'published',      label: 'Done',        color: '#10b981' },
];

export const DEV_PRIORITY_COLORS = {
    Critical: { color: '#ef4444', bg: '#fef2f2' },
    High:     { color: '#f59e0b', bg: '#fffbeb' },
    Medium:   { color: '#3b82f6', bg: '#eff6ff' },
    Low:      { color: '#94a3b8', bg: '#f1f5f9' },
};

export const SERVICES = [
    { id: 'dashboard', label: 'Dashboard Server', port: 3001 },
    { id: 'api',       label: 'API Server',       port: 3000 },
    { id: 'postgres',  label: 'PostgreSQL',        port: 5432 },
];

export const DEV_HANDOFF_AGENTS = [
    { id: 'frontend-agent', label: 'Handoff a Frontend Agent (specs)' },
    { id: 'pm-agent',       label: 'Handoff a PM Agent (review)' },
];

// ─── SEO Workspace constants ──────────────────────────────────────────────────

export const SEO_TYPES = [
    { id: 'keyword',         label: 'Keyword',         icon: 'key',    desc: 'Keyword con vol, dificultad e intención de búsqueda' },
    { id: 'seo_audit',       label: 'SEO Audit',       icon: 'search', desc: 'Reporte de issues por página: Critical/Warning/Opportunity' },
    { id: 'meta_tag',        label: 'Meta Tag',        icon: 'tag',    desc: 'Title, description y OG tags por página' },
    { id: 'structured_data', label: 'Structured Data', icon: 'code-2', desc: 'Schema.org por tipo de página' },
];

export const KEYWORD_INTENTS = [
    { id: 'informational', label: 'Informacional' },
    { id: 'commercial',    label: 'Comercial' },
    { id: 'transactional', label: 'Transaccional' },
    { id: 'navigational',  label: 'Navegacional' },
];

export const AUDIT_SEVERITIES = [
    { id: 'critical',    label: 'Critical',    color: '#ef4444', bg: '#fef2f2' },
    { id: 'warning',     label: 'Warning',     color: '#f59e0b', bg: '#fffbeb' },
    { id: 'opportunity', label: 'Opportunity', color: '#3b82f6', bg: '#eff6ff' },
];

export const SCHEMA_TYPES = [
    { id: 'property',     label: 'Property'     },
    { id: 'article',      label: 'Article'      },
    { id: 'faq',          label: 'FAQ'          },
    { id: 'how_to',       label: 'HowTo'        },
    { id: 'organization', label: 'Organization' },
];

export const SEO_HANDOFF_AGENTS = [
    { id: 'content-agent', label: 'Crear brief (Content Agent)' },
    { id: 'dev-agent',     label: 'Ticket técnico (Dev Agent)'  },
    { id: 'data-agent',    label: 'Metadata propiedades (Data Agent)' },
];

// ─── RESEARCH WORKSPACE ────────────────────────────────────────────────────
export const RESEARCH_TYPES = [
    { value: 'intelligence_report', label: 'Intelligence Report', icon: 'brain'          },
    { value: 'market_alert',        label: 'Market Alert',        icon: 'alert-triangle' },
    { value: 'competitor_intel',    label: 'Competitor Intel',    icon: 'eye'            },
];

export const RESEARCH_IMPACT_LEVELS = [
    { id: 'HIGH',   label: 'HIGH',   color: '#ef4444', bg: '#fef2f2', textColor: '#b91c1c' },
    { id: 'MEDIUM', label: 'MEDIUM', color: '#f59e0b', bg: '#fffbeb', textColor: '#92400e' },
    { id: 'LOW',    label: 'LOW',    color: '#3b82f6', bg: '#eff6ff', textColor: '#1d4ed8' },
];

export const RESEARCH_CATEGORIES = [
    { id: 'claude_updates', label: 'Claude Updates' },
    { id: 'proptech',       label: 'PropTech'       },
    { id: 'market',         label: 'Market'         },
    { id: 'competitors',    label: 'Competitors'    },
    { id: 'rera_dld',       label: 'RERA / DLD'     },
];

export const RESEARCH_SOURCES = [
    { id: 'anthropic', name: 'Anthropic Docs',  icon: 'globe',         url: 'https://docs.anthropic.com' },
    { id: 'github',    name: 'GitHub (Claude)', icon: 'github',        url: 'https://github.com/anthropics' },
    { id: 'reddit',    name: 'Reddit',          icon: 'message-square',url: 'https://reddit.com/r/ClaudeAI' },
    { id: 'proptech',  name: 'PropTech News',   icon: 'newspaper',     url: null },
    { id: 'rera_dld',  name: 'RERA / DLD',      icon: 'landmark',      url: 'https://dubailand.gov.ae' },
];

export const RESEARCH_HANDOFF_AGENTS = [
    { id: 'wat-auditor-agent', label: 'WAT Auditor (actualizaciones Claude)'  },
    { id: 'legal-agent',       label: 'Legal Agent (cambios RERA/DLD)'        },
    { id: 'dev-agent',         label: 'Dev Agent (issues técnicos)'            },
    { id: 'marketing-agent',   label: 'Marketing Agent (tendencias de mercado)'},
    { id: 'content-agent',     label: 'Content Agent (artículo/blog)'          },
];

// ─── WAT Auditor Workspace constants ──────────────────────────────────────────

export const WAT_TYPES = [
    { id: 'audit_report',         label: 'Audit Report',        icon: 'clipboard-list', desc: 'Reporte completo de auditoría WAT con score 0-100' },
    { id: 'inconsistency',        label: 'Inconsistencia',      icon: 'alert-circle',   desc: 'Inconsistencia detectada en agentes, skills o tools' },
    { id: 'improvement_proposal', label: 'Propuesta de Mejora', icon: 'lightbulb',      desc: 'Mejora estructural propuesta para el sistema WAT' },
];

export const WAT_TYPE_LABELS = {
    audit_report:         'Audit Report',
    inconsistency:        'Inconsistencia',
    improvement_proposal: 'Propuesta de Mejora',
};

export const WAT_TYPE_ICONS = {
    audit_report:         'clipboard-list',
    inconsistency:        'alert-circle',
    improvement_proposal: 'lightbulb',
};

export const WAT_PUBLISH_DESTINATIONS = {
    audit_report: [
        { id: 'pm-agent',  label: 'PM Agent' },
        { id: 'dev-agent', label: 'Dev Agent' },
    ],
    inconsistency: [
        { id: 'dev-agent', label: 'Ticket a Dev Agent' },
    ],
    improvement_proposal: [
        { id: 'pm-agent',  label: 'PM Agent (backlog)' },
        { id: 'dev-agent', label: 'Dev Agent (implementar)' },
    ],
};

// ─── PM Workspace constants ───────────────────────────────────────────────────

export const PM_TYPE_LABELS = {
    prd:        'PRD',
    sprint:     'Sprint',
    user_story: 'Historia de Usuario',
    roadmap:    'Roadmap',
};

export const PM_TYPE_ICONS = {
    prd:        'file-text',
    sprint:     'zap',
    user_story: 'bookmark',
    roadmap:    'map',
};

export const PM_PUBLISH_DESTINATIONS = {
    prd: [
        { id: 'dev-agent',      label: 'Ticket a Dev Agent' },
        { id: 'frontend-agent', label: 'Brief Frontend Agent' },
    ],
    sprint: [
        { id: 'dev-agent', label: 'Sprint a Dev Agent' },
    ],
    user_story: [
        { id: 'dev-agent', label: 'Historia a Dev Agent' },
    ],
    roadmap: [
        { id: 'analytics-agent', label: 'Analytics Agent' },
    ],
};

export const PM_ARTIFACT_TYPES = [
    { id: 'prd',        label: 'PRD',                 icon: 'file-text', desc: 'Product Requirements Document' },
    { id: 'sprint',     label: 'Sprint',              icon: 'zap',       desc: 'Sprint planning document' },
    { id: 'user_story', label: 'Historia de Usuario', icon: 'bookmark',  desc: 'User story con criterios de aceptación' },
    { id: 'roadmap',    label: 'Roadmap',             icon: 'map',       desc: 'Roadmap del producto por fases' },
];

export const WAT_HANDOFF_AGENTS = [
    { id: 'dev-agent', label: 'Asignar a Dev Agent (técnico)' },
    { id: 'pm-agent',  label: 'Enviar a PM Agent (backlog)' },
];

export const WAT_SEVERITIES = [
    { id: 'critical',   label: 'Critical',   color: '#ef4444', bg: '#fef2f2' },
    { id: 'warning',    label: 'Warning',     color: '#f59e0b', bg: '#fffbeb' },
    { id: 'suggestion', label: 'Suggestion',  color: '#3b82f6', bg: '#eff6ff' },
];

// Score 0-100: rojo → ámbar → amarillo → verde
export const WAT_SCORE_COLORS = [
    { min: 0,   max: 50,  color: '#ef4444' },
    { min: 50,  max: 75,  color: '#f59e0b' },
    { min: 75,  max: 90,  color: '#eab308' },
    { min: 90,  max: 101, color: '#10b981' },
];
