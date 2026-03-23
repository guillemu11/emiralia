/**
 * Creative Studio — Shared Constants (Project 043)
 *
 * Single source of truth para tipos, estados, formatos y configuraciones
 * del Creative Studio. Usado por CreativeStudio.jsx, BriefForms, y AssetGallery.
 */

// ─── 8 Tipos de Contenido ────────────────────────────────────────────────────

export const CREATIVE_TYPES = [
    {
        id: 'image',
        label: 'Imagen',
        description: 'Genera imágenes con IA: propiedades, lifestyle, branding',
        icon: 'image',
        pipeline: 'KIE AI Text to Image',
        estimatedTime: '30s',
        costNote: '$0.04–$0.06 por imagen',
    },
    {
        id: 'text_to_video',
        label: 'Video Avatar',
        description: 'Fernando o Yolanda hablan con tu guión via TTS + Lip Sync',
        icon: 'video',
        pipeline: 'KIE AI TTS → Lip Sync',
        estimatedTime: '2–5 min',
        costNote: 'TTS + Lip Sync',
    },
    {
        id: 'image_to_video',
        label: 'Imagen a Video',
        description: 'Anima una imagen estática con movimiento de cámara',
        icon: 'image-play',
        pipeline: 'KIE AI Image to Video',
        estimatedTime: '1–3 min',
        costNote: 'Por duración',
    },
    {
        id: 'multiframe',
        label: 'Multi-Frame',
        description: 'Combina hasta 6 imágenes en un video con transiciones',
        icon: 'layers',
        pipeline: 'KIE AI Video Editing',
        estimatedTime: '2–4 min',
        costNote: 'Por frame',
    },
    {
        id: 'podcast',
        label: 'Podcast',
        description: 'Episodio con Fernando, Yolanda, o ambos hosts',
        icon: 'mic',
        pipeline: 'KIE AI TTS → Lip Sync → Video Editing',
        estimatedTime: '5–10 min',
        costNote: 'Por host × duración',
    },
    {
        id: 'property_tour',
        label: 'Tour Propiedad',
        description: 'Video tour de una propiedad de la DB con datos y host',
        icon: 'building',
        pipeline: 'KIE AI TTS → Lip Sync → Video Editing',
        estimatedTime: '3–8 min',
        costNote: 'Según duración',
    },
    {
        id: 'carousel',
        label: 'Carrusel',
        description: 'Serie de 3–10 imágenes para Instagram / LinkedIn',
        icon: 'layout-panel',
        pipeline: 'KIE AI Text to Image × N slides',
        estimatedTime: '1–5 min (N×30s)',
        costNote: '$0.04–$0.06 × N slides',
    },
    {
        id: 'infographic',
        label: 'Infografía',
        description: 'Visualización de datos: comparativas, timelines, stats',
        icon: 'bar-chart',
        pipeline: 'KIE AI Text to Image (structured prompt)',
        estimatedTime: '30–60s',
        costNote: '$0.04–$0.06',
    },
];

// ─── Status Config ────────────────────────────────────────────────────────────

export const CREATIVE_STATUS = {
    draft:          { label: 'Borrador',    color: '#94a3b8', bg: '#f1f5f9' },
    generating:     { label: 'Generando',   color: '#f59e0b', bg: '#fffbeb' },
    pending_review: { label: 'En Revisión', color: '#f59e0b', bg: '#fffbeb' },
    approved:       { label: 'Aprobado',    color: '#10b981', bg: '#ecfdf5' },
    rejected:       { label: 'Rechazado',   color: '#ef4444', bg: '#fef2f2' },
    scheduled:      { label: 'Programado',  color: '#3b82f6', bg: '#eff6ff' },
    published:      { label: 'Publicado',   color: '#8b5cf6', bg: '#f5f3ff' },
};

// ─── Output Formats ───────────────────────────────────────────────────────────

export const OUTPUT_FORMATS = {
    image: [
        { id: 'square',    label: 'Cuadrado 1:1',    ratio: '1:1',  use: 'Instagram' },
        { id: 'portrait',  label: 'Vertical 9:16',   ratio: '9:16', use: 'Reels / Stories' },
        { id: 'landscape', label: 'Horizontal 16:9', ratio: '16:9', use: 'LinkedIn / Web' },
    ],
    video: [
        { id: '9:16', label: 'Vertical 9:16',   ratio: '9:16', use: 'TikTok / Reels' },
        { id: '16:9', label: 'Horizontal 16:9', ratio: '16:9', use: 'YouTube / LinkedIn' },
        { id: '1:1',  label: 'Cuadrado 1:1',    ratio: '1:1',  use: 'Instagram' },
    ],
};

// ─── Duration Options ─────────────────────────────────────────────────────────

export const DURATION_OPTIONS = {
    short_video:   [{ value: '5s',  label: '5 segundos' }, { value: '10s', label: '10 segundos' }, { value: '15s', label: '15 segundos' }],
    avatar_video:  [{ value: '15s', label: '15 segundos' }, { value: '30s', label: '30 segundos' }, { value: '60s', label: '1 minuto' }],
    podcast:       [{ value: '60s', label: '1 minuto' }, { value: '120s', label: '2 minutos' }, { value: '300s', label: '5 minutos' }],
    property_tour: [{ value: '30s', label: '30 segundos' }, { value: '60s', label: '1 minuto' }, { value: '120s', label: '2 minutos' }],
};

// ─── Avatar Config ────────────────────────────────────────────────────────────

export const AVATARS = [
    {
        id: 'fernando',
        label: 'Fernando',
        emoji: '👨',
        flag: '🇲🇽',
        nationality: 'México',
        accent: 'es-MX',
        age: 38,
        role: 'Asesor de Inversión Inmobiliaria',
        personality: ['Analítico', 'Directo', 'Orientado a datos', 'Profesional'],
        tone: 'Experto y orientado a resultados — habla de ROI, rentabilidad y estrategia de inversión',
        sampleScript: 'Hola, soy Fernando. Analizo el mercado inmobiliario de Emiratos para que tú tomes las mejores decisiones de inversión.',
        imageUrl: '/avatars/fernando.jpg',
        sampleAudioUrl: '/avatars/fernando-sample.mp3',
        description: 'Voz masculina mexicana, perfil inversor',
    },
    {
        id: 'yolanda',
        label: 'Yolanda',
        emoji: '👩',
        flag: '🇪🇸',
        nationality: 'España',
        accent: 'es-ES',
        age: 34,
        role: 'Especialista en Lifestyle y Lujo',
        personality: ['Cercana', 'Entusiasta', 'Persuasiva', 'Elegante'],
        tone: 'Cálida y aspiracional — habla de estilo de vida, comunidades premium y experiencia de compra',
        sampleScript: 'Hola, soy Yolanda. Te cuento todo lo que necesitas saber para vivir e invertir en las comunidades más exclusivas de Emiratos.',
        imageUrl: '/avatars/yolanda.jpg',
        sampleAudioUrl: '/avatars/yolanda-sample.mp3',
        description: 'Voz femenina española, perfil lifestyle',
    },
];

// ─── Brief Validation Schema ──────────────────────────────────────────────────

export const BRIEF_VALIDATION_SCHEMA = {
    image:          { required: ['prompt', 'style'] },
    text_to_video:  { required: ['script', 'avatar'] },
    image_to_video: { required: ['source_image_url', 'motion_description'] },
    multiframe:     { required: ['frames'], minFrames: 2, maxFrames: 6 },
    podcast:        { required: ['hosts', 'topic'] },
    property_tour:  { required: ['host'], oneOf: [['property_id'], ['property_data.title']] },
    carousel:       { required: ['slides'], minSlides: 3, maxSlides: 10 },
    infographic:    { required: ['infographic_type', 'data'], minDataPoints: 1 },
};

// ─── Cost Estimation ──────────────────────────────────────────────────────────

export const COST_MAP = {
    standard: 0.04,
    hd: 0.06,
};

export function estimateCost(type, brief = {}, outputConfig = {}) {
    const quality = outputConfig.quality || 'standard';
    const costPerImage = COST_MAP[quality] || COST_MAP.standard;

    switch (type) {
        case 'image':
        case 'infographic':
            return costPerImage;
        case 'carousel':
            return (brief.slides?.length || 3) * costPerImage;
        default:
            return null; // video cost depends on KIE AI pricing
    }
}

// ─── Platform Labels ──────────────────────────────────────────────────────────

export const PLATFORMS = [
    { id: 'instagram', label: 'Instagram', color: '#e1306c' },
    { id: 'tiktok',    label: 'TikTok',    color: '#010101' },
    { id: 'linkedin',  label: 'LinkedIn',  color: '#0077b5' },
    { id: 'youtube',   label: 'YouTube',   color: '#ff0000' },
];

// ─── Models by Content Type ───────────────────────────────────────────────────

export const MODELS_BY_TYPE = {
    image: [
        { id: 'nano-banana-2',    label: 'Nano Banana 2',    description: 'Rápido · Gemini',           default: true },
        { id: 'flux-kontext-pro', label: 'Flux Kontext Pro', description: 'Alta calidad · Fotorrealista' },
        { id: 'flux-kontext-max', label: 'Flux Kontext Max', description: 'Máxima calidad'               },
    ],
    lipsync: [
        { id: 'infinitalk/from-audio',  label: 'InfiniTalk',     description: 'Rápido · MeiGen-AI',    default: true },
        { id: 'kling-avatar/standard',  label: 'Kling Standard', description: 'Natural · 720p'          },
        { id: 'kling-avatar/pro',       label: 'Kling Pro',      description: 'Mejor calidad · 1080p'   },
    ],
    video: [
        { id: 'wan/2-6-flash-image-to-video', label: 'WAN 2.6 Flash', description: 'Rápido · Fluido',            default: true },
        { id: 'kling-3.0/video',              label: 'Kling 3.0',     description: 'Larga duración · Alta calidad' },
    ],
};

// ─── Type helpers ─────────────────────────────────────────────────────────────

export function getTypeById(id) {
    return CREATIVE_TYPES.find(t => t.id === id);
}

export function isVideoType(type) {
    return ['text_to_video','image_to_video','multiframe','podcast','property_tour'].includes(type);
}

export function isImageType(type) {
    return ['image','carousel','infographic'].includes(type);
}
