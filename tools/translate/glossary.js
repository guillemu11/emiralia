/**
 * Real estate glossary for UAE property market — regional Spanish variants.
 * Single source of truth used by translate.js and glossary-reference.md.
 */

export const VARIANTS = {
    'es-ES': 'Espana',
    'es-MX': 'Mexico',
    'es-CO': 'Colombia',
    'en': 'English',
};

/**
 * Each key is the canonical English term.
 * Values are the preferred translation per regional variant.
 */
export const REAL_ESTATE_GLOSSARY = {
    // ── Property types ──────────────────────────────────────────────────
    'apartment':   { 'es-ES': 'piso',           'es-MX': 'departamento',    'es-CO': 'apartamento' },
    'studio':      { 'es-ES': 'estudio',         'es-MX': 'estudio',         'es-CO': 'estudio' },
    'villa':       { 'es-ES': 'villa',            'es-MX': 'villa',           'es-CO': 'villa' },
    'townhouse':   { 'es-ES': 'adosado',          'es-MX': 'casa adosada',    'es-CO': 'casa adosada' },
    'penthouse':   { 'es-ES': 'atico',            'es-MX': 'penthouse',       'es-CO': 'penthouse' },
    'duplex':      { 'es-ES': 'duplex',           'es-MX': 'duplex',          'es-CO': 'duplex' },
    'loft':        { 'es-ES': 'loft',             'es-MX': 'loft',            'es-CO': 'loft' },

    // ── Legal / property status ─────────────────────────────────────────
    'off-plan':    { 'es-ES': 'sobre plano',      'es-MX': 'en planos',       'es-CO': 'en planos' },
    'ready':       { 'es-ES': 'listo para entrar', 'es-MX': 'listo para entrega', 'es-CO': 'listo para entrega' },
    'freehold':    { 'es-ES': 'plena propiedad',  'es-MX': 'propiedad plena', 'es-CO': 'propiedad plena' },
    'leasehold':   { 'es-ES': 'arrendamiento',    'es-MX': 'arrendamiento',   'es-CO': 'arrendamiento' },
    'handover':    { 'es-ES': 'entrega',           'es-MX': 'entrega',         'es-CO': 'entrega' },
    'completion':  { 'es-ES': 'finalizacion',      'es-MX': 'terminacion',     'es-CO': 'terminacion' },
    'developer':   { 'es-ES': 'promotora',         'es-MX': 'desarrolladora',  'es-CO': 'constructora' },
    'development': { 'es-ES': 'promocion',         'es-MX': 'desarrollo',      'es-CO': 'proyecto' },
    'project':     { 'es-ES': 'proyecto',          'es-MX': 'desarrollo',      'es-CO': 'proyecto' },
    'broker':      { 'es-ES': 'agente inmobiliario', 'es-MX': 'agente',        'es-CO': 'agente' },
    'listing':     { 'es-ES': 'anuncio',           'es-MX': 'anuncio',         'es-CO': 'aviso' },
    'real estate': { 'es-ES': 'inmobiliario',      'es-MX': 'bienes raices',   'es-CO': 'finca raiz' },

    // ── Financial ───────────────────────────────────────────────────────
    'ROI':            { 'es-ES': 'rentabilidad',        'es-MX': 'rentabilidad',        'es-CO': 'rentabilidad' },
    'down payment':   { 'es-ES': 'entrada',             'es-MX': 'enganche',            'es-CO': 'cuota inicial' },
    'payment plan':   { 'es-ES': 'plan de pagos',       'es-MX': 'plan de pagos',       'es-CO': 'plan de pagos' },
    'service charge': { 'es-ES': 'gastos de comunidad', 'es-MX': 'mantenimiento',       'es-CO': 'administracion' },
    'mortgage':       { 'es-ES': 'hipoteca',            'es-MX': 'hipoteca',            'es-CO': 'hipoteca' },
    'rental yield':   { 'es-ES': 'rentabilidad por alquiler', 'es-MX': 'rendimiento por renta', 'es-CO': 'rentabilidad por arriendo' },
    'capital gain':   { 'es-ES': 'plusvalia',            'es-MX': 'plusvalia',            'es-CO': 'valorizacion' },

    // ── Amenities ───────────────────────────────────────────────────────
    'amenities':  { 'es-ES': 'servicios',         'es-MX': 'amenidades',      'es-CO': 'amenidades' },
    'gym':        { 'es-ES': 'gimnasio',          'es-MX': 'gimnasio',        'es-CO': 'gimnasio' },
    'pool':       { 'es-ES': 'piscina',           'es-MX': 'alberca',         'es-CO': 'piscina' },
    'parking':    { 'es-ES': 'aparcamiento',      'es-MX': 'estacionamiento', 'es-CO': 'parqueadero' },
    'balcony':    { 'es-ES': 'terraza',           'es-MX': 'balcon',          'es-CO': 'balcon' },
    'concierge':  { 'es-ES': 'conserjeria',       'es-MX': 'concierge',       'es-CO': 'recepcion' },
    'playground': { 'es-ES': 'zona infantil',     'es-MX': 'area de juegos',  'es-CO': 'zona de juegos' },

    // ── UAE-specific (kept in English everywhere) ───────────────────────
    'RERA':     { 'es-ES': 'RERA',    'es-MX': 'RERA',    'es-CO': 'RERA' },
    'DLD':      { 'es-ES': 'DLD',     'es-MX': 'DLD',     'es-CO': 'DLD' },
    'emirate':  { 'es-ES': 'emirato', 'es-MX': 'emirato',  'es-CO': 'emirato' },
    'expat':    { 'es-ES': 'expatriado', 'es-MX': 'expatriado', 'es-CO': 'expatriado' },
};
