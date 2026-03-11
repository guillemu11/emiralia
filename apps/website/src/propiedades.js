import './style.css'

// Remove FOUC guard
document.body.classList.add('styles-ready');

// ========== Constants ==========
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
const AED_TO_EUR = 0.25; // approx AED → EUR
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400';

const PROPERTY_TYPES_ES = {
    'Apartment': 'Apartamento', 'Villa': 'Villa', 'Townhouse': 'Adosado',
    'Studio': 'Estudio', 'Penthouse': 'Atico', 'Duplex': 'Duplex',
    'Hotel Apartment': 'Apartamento Hotel', 'Residential Floor': 'Planta Residencial',
    'Residential Plot': 'Parcela', 'Compound': 'Complejo',
};

const FILTER_LABELS = {
    ubicacion: 'Ubicacion', city: 'Ciudad', property_type: 'Tipo',
    bedrooms: 'Habitaciones', price_min: 'Precio min', price_max: 'Precio max',
    is_off_plan: 'Off-Plan', is_verified: 'Verificadas',
};

// ========== URL State Manager ==========
class URLState {
    constructor() {
        this.params = new URLSearchParams(window.location.search);
    }

    get(key) { return this.params.get(key); }

    set(key, value) {
        if (value === null || value === undefined || value === '') {
            this.params.delete(key);
        } else {
            this.params.set(key, String(value));
        }
        this.params.delete('pagina');
        this._push();
    }

    remove(key) {
        this.params.delete(key);
        this.params.delete('pagina');
        this._push();
    }

    clear() {
        this.params = new URLSearchParams();
        this._push();
    }

    toAPIParams() {
        const map = {
            ubicacion: 'q', ciudad: 'city', tipo: 'property_type',
            habitaciones: 'bedrooms', precio_min: 'price_min', precio_max: 'price_max',
            off_plan: 'is_off_plan', verificadas: 'is_verified', ordenar: 'sort',
        };
        const api = new URLSearchParams();
        for (const [urlKey, apiKey] of Object.entries(map)) {
            const val = this.params.get(urlKey);
            if (val) api.set(apiKey, val);
        }
        return api.toString();
    }

    activeFilters() {
        const filters = [];
        const labelMap = {
            ubicacion: 'Ubicacion', ciudad: 'Ciudad', tipo: 'Tipo',
            habitaciones: 'Hab.', precio_min: 'Desde', precio_max: 'Hasta',
            off_plan: 'Off-Plan', verificadas: 'Verificadas',
        };
        for (const [key, label] of Object.entries(labelMap)) {
            const val = this.params.get(key);
            if (val) {
                let display = val;
                if (key === 'tipo') display = PROPERTY_TYPES_ES[val] || val;
                if (key === 'precio_min' || key === 'precio_max') display = formatPriceShort(Number(val));
                if (key === 'off_plan') display = val === 'true' ? 'Off-Plan' : 'Secundario';
                if (key === 'verificadas') display = 'Si';
                filters.push({ key, label, display });
            }
        }
        return filters;
    }

    _push() {
        const qs = this.params.toString();
        const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        window.history.pushState({}, '', url);
    }
}

const state = new URLState();

// ========== Formatters ==========
function formatPrice(aed) {
    if (!aed) return '-- AED';
    if (aed >= 1000000) return `${(aed / 1000000).toFixed(1)}M AED`;
    if (aed >= 1000) return `${Math.round(aed / 1000)}K AED`;
    return `${aed} AED`;
}

function formatPriceShort(aed) {
    if (!aed) return '--';
    if (aed >= 1000000) return `${(aed / 1000000).toFixed(1)}M`;
    if (aed >= 1000) return `${Math.round(aed / 1000)}K`;
    return String(aed);
}

function formatEUR(aed) {
    if (!aed) return '';
    const eur = aed * AED_TO_EUR;
    if (eur >= 1000000) return `\u2248 \u20AC ${(eur / 1000000).toFixed(1)}M`;
    if (eur >= 1000) return `\u2248 \u20AC ${Math.round(eur / 1000).toLocaleString('es-ES')}K`;
    return `\u2248 \u20AC ${Math.round(eur).toLocaleString('es-ES')}`;
}

function formatPriceAED(aed) {
    if (!aed) return '--';
    return Number(aed).toLocaleString('es-ES');
}

// ========== API Client ==========
async function fetchProperties(page = 1, limit = 24) {
    const apiParams = state.toAPIParams();
    const res = await fetch(`${API_BASE}/properties?${apiParams}&page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

async function fetchMapMarkers() {
    const apiParams = state.toAPIParams();
    const res = await fetch(`${API_BASE}/properties/map?${apiParams}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

// ========== Card Rendering (Horizontal layout — screenshot reference) ==========
function renderCard(p) {
    // ✅ SECURITY FIX: Validate property ID as integer to prevent XSS
    const propId = parseInt(p.pf_id);
    if (isNaN(propId) || propId <= 0) {
        console.error('[XSS Prevention] Invalid property ID:', p.pf_id);
        return ''; // Skip rendering if invalid ID
    }

    const images = p.images?.length ? p.images : [PLACEHOLDER_IMG];
    const totalImages = images.length;
    const beds = p.bedrooms_value === 0 ? 'Studio' : (p.bedrooms_value ? `${p.bedrooms_value} Beds` : '');
    const size = p.size_sqft ? `${Math.round(p.size_sqft).toLocaleString('es-ES')} sqft` : '--';
    const completion = p.is_off_plan ? 'Off-Plan' : 'Listo';

    // ROI estimation
    const roi = p.roi || p.estimated_roi || null;
    const roiDisplay = roi ? `${Number(roi).toFixed(1)}%` : null;
    const roiDiff = roi ? `+${(Number(roi) - 6.7).toFixed(1)}% avg` : '';

    // Alto Potencial badge (ROI >= 8 or is_premium)
    const altoPotencial = (roi && roi >= 8) || p.is_premium;

    // AI Score (computed from multiple data signals available)
    const aiScoreRaw = p.ai_score || (() => {
        let score = 55; // base score
        if (roi) score += Number(roi) * 3;
        if (p.is_verified) score += 8;
        if (p.is_premium || p.is_featured) score += 6;
        if (p.images?.length > 1) score += Math.min(p.images.length * 2, 8);
        if (p.size_sqft && Number(p.size_sqft) > 0) score += 4;
        if (p.community) score += 3;
        if (p.latitude && p.longitude) score += 3;
        if (p.bathrooms) score += 2;
        if (p.is_off_plan) score += 2; // off-plan = new development signal
        if (p.price_aed && Number(p.price_aed) > 0) score += 3;
        return Math.min(99, Math.max(40, score));
    })();
    const aiScore = aiScoreRaw;
    const aiScoreColor = aiScore >= 80 ? 'text-success bg-success-bg border-success/20' : aiScore >= 65 ? 'text-primary bg-primary/10 border-primary/20' : 'text-warning bg-warning/10 border-warning/20';

    // ✅ SECURITY FIX: Sanitize developer name to prevent XSS
    const developerRaw = p.developer_name || p.developer || p.broker_name || null;
    const developer = developerRaw ? String(developerRaw).replace(/[<>"'&]/g, (c) => ({
        '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'
    }[c])) : null;

    // ✅ SECURITY FIX: Sanitize title to prevent XSS
    const titleRaw = p.title || 'Propiedad sin titulo';
    const safeTitle = String(titleRaw).replace(/[<>"'&]/g, (c) => ({
        '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'
    }[c]));

    // Carousel dots (max 5 visible)
    const dotsCount = Math.min(totalImages, 5);
    const dots = totalImages > 1 ? Array.from({ length: dotsCount }, (_, i) =>
        `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`
    ).join('') : '';

    return `
        <div class="property-card group cursor-pointer"
             data-pf-id="${propId}" data-lat="${p.latitude || ''}" data-lng="${p.longitude || ''}">
            <div class="flex">
                <!-- Image section (left) with carousel -->
                <div class="relative w-[120px] sm:w-[220px] lg:w-[240px] shrink-0 overflow-hidden rounded-l-2xl card-carousel" data-current="0" data-total="${totalImages}">
                    <div class="carousel-track flex h-full transition-transform duration-300 ease-out" style="width:${totalImages * 100}%">
                        ${images.map((img, i) => `<img class="w-full h-full object-cover shrink-0" style="width:${100 / totalImages}%" src="${i === 0 ? img : ''}" data-src="${img}" alt="${safeTitle}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" />`).join('')}
                    </div>
                    ${altoPotencial ? `<span class="badge-alto-potencial absolute top-2 left-2 sm:top-3 sm:left-3 z-10 text-[8px] sm:text-[9px]">ALTO POTENCIAL</span>` : ''}
                    <!-- Fav button -->
                    <button class="fav-btn absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md cursor-pointer" aria-label="Guardar" data-stop-propagation="true">
                        <i data-lucide="heart" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400"></i>
                    </button>
                    <!-- Carousel arrows (visible on hover, desktop) -->
                    ${totalImages > 1 ? `
                    <button class="carousel-prev absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white" aria-label="Anterior" data-stop-propagation="true">
                        <i data-lucide="chevron-left" class="w-4 h-4 text-primary-text"></i>
                    </button>
                    <button class="carousel-next absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white" aria-label="Siguiente" data-stop-propagation="true">
                        <i data-lucide="chevron-right" class="w-4 h-4 text-primary-text"></i>
                    </button>
                    <div class="carousel-dots absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">${dots}</div>
                    ` : ''}
                    <!-- Image count -->
                    ${totalImages > 1 ? `<span class="absolute top-2 right-10 sm:top-3 sm:right-12 z-10 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1"><i data-lucide="camera" class="w-3 h-3"></i>${totalImages}</span>` : ''}
                </div>

                <!-- Content section (right) -->
                <div class="flex-1 flex flex-col justify-between min-w-0 p-3 sm:p-4 lg:p-5">
                    <!-- Top: Title + Price -->
                    <div>
                        <div class="flex items-start justify-between gap-2 sm:gap-3 mb-1">
                            <div class="min-w-0">
                                <h3 class="font-semibold text-sm sm:text-base lg:text-lg text-primary-text leading-snug line-clamp-2">${safeTitle}</h3>
                                ${developer ? `<span class="badge-developer mt-1"><i data-lucide="building-2" class="w-3 h-3 shrink-0"></i><span class="truncate">${developer}</span></span>` : ''}
                            </div>
                            <div class="text-right shrink-0">
                                <p class="font-bold text-sm sm:text-lg text-primary leading-tight">${formatPrice(p.price_aed)}</p>
                                <p class="text-[10px] sm:text-xs text-secondary-text font-medium mt-0.5">${formatEUR(p.price_aed)}</p>
                            </div>
                        </div>
                        <p class="text-[11px] sm:text-xs text-secondary-text flex items-center gap-1 mb-2 sm:mb-3">
                            <i data-lucide="map-pin" class="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-primary/60"></i>
                            <span class="truncate">${p.community || p.city || p.display_address || 'EAU'}</span>
                        </p>
                    </div>

                    <!-- Middle: Stats row — compact on mobile, 3 columns on desktop -->
                    <div class="flex items-center gap-2 sm:gap-0 sm:grid sm:grid-cols-3 mb-2 sm:mb-3 border-t border-b border-border-color py-2 sm:py-2.5">
                        <div class="sm:border-r sm:border-border-color sm:pr-3">
                            <p class="hidden sm:block text-[10px] uppercase tracking-wider text-muted-text mb-0.5">Habitaciones</p>
                            <p class="text-xs sm:text-sm font-semibold text-primary-text">${beds || '--'}</p>
                        </div>
                        <span class="text-muted-text text-[10px] sm:hidden">|</span>
                        <div class="sm:border-r sm:border-border-color sm:px-3">
                            <p class="hidden sm:block text-[10px] uppercase tracking-wider text-muted-text mb-0.5">Superficie</p>
                            <p class="text-xs sm:text-sm font-semibold text-primary-text">${size}</p>
                        </div>
                        <span class="text-muted-text text-[10px] sm:hidden">|</span>
                        <div class="sm:pl-3">
                            <p class="hidden sm:block text-[10px] uppercase tracking-wider text-muted-text mb-0.5">Entrega</p>
                            <p class="text-xs sm:text-sm font-semibold text-primary-text">${completion}</p>
                        </div>
                    </div>

                    <!-- Bottom: ROI + AI Score -->
                    <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            ${roiDisplay ? `
                            <p class="hidden sm:block text-[10px] uppercase tracking-wider text-muted-text mb-0.5">ROI Estimado</p>
                            <div class="flex items-baseline gap-1 sm:gap-2">
                                <p class="text-base sm:text-xl font-bold text-success leading-tight">${roiDisplay}</p>
                                ${roiDiff ? `<p class="hidden sm:block text-[11px] text-success/80 font-medium">${roiDiff}</p>` : ''}
                            </div>` : `
                            <p class="hidden sm:block text-[10px] uppercase tracking-wider text-muted-text mb-0.5">ROI Estimado</p>
                            <p class="text-xs sm:text-sm text-muted-text">--</p>`}
                        </div>
                        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            ${aiScore ? `
                            <div class="ai-score-badge ${aiScoreColor} border px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5">
                                <i data-lucide="sparkles" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
                                <span class="text-[11px] sm:text-xs font-bold">${aiScore}</span>
                            </div>` : ''}
                            <a href="/propiedad.html?pf_id=${propId}" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors whitespace-nowrap">
                                Ver Detalle
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSheetCard(p) {
    // ✅ SECURITY FIX: Validate property ID
    const propId = parseInt(p.pf_id);
    if (isNaN(propId) || propId <= 0) {
        console.error('[XSS Prevention] Invalid property ID in sheet card:', p.pf_id);
        return '';
    }

    // ✅ SECURITY FIX: Sanitize title
    const titleRaw = p.title || '';
    const safeTitle = String(titleRaw).replace(/[<>"'&]/g, (c) => ({
        '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'
    }[c]));

    const img = p.images?.[0] || PLACEHOLDER_IMG;
    const beds = p.bedrooms_value === 0 ? 'Studio' : (p.bedrooms_value ? `${p.bedrooms_value} hab.` : '');
    const size = p.size_sqft ? `${Math.round(p.size_sqft)} ft²` : '';
    return `
        <div class="sheet-card shrink-0 w-[260px] bg-white rounded-2xl shadow-md border border-border-color overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
             data-pf-id="${propId}">
            <div class="relative h-28">
                <img class="w-full h-full object-cover" src="${img}" alt="${safeTitle}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" />
                ${p.is_off_plan ? '<span class="badge-offplan absolute top-2 left-2">Off-Plan</span>' : ''}
            </div>
            <div class="p-3">
                <p class="font-bold text-sm text-primary-text mb-0.5">${formatPrice(p.price_aed)}</p>
                <p class="text-[11px] text-muted-text mb-1">${formatEUR(p.price_aed)}</p>
                <p class="text-[11px] text-secondary-text truncate mb-1 flex items-center gap-1">
                    <i data-lucide="map-pin" class="w-3 h-3 shrink-0"></i>
                    ${p.community || p.city || ''}
                </p>
                <div class="flex items-center gap-2 text-[10px] text-muted-text">
                    ${beds ? `<span>${beds}</span>` : ''}
                    ${beds && size ? '<span>|</span>' : ''}
                    ${size ? `<span>${size}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ========== Map ==========
let map = null;
let clusterGroup = null;
let markersByPfId = {};

function initMap() {
    const container = document.getElementById('map-leaflet');
    if (!container || !window.L) return;

    map = L.map('map-leaflet', {
        center: [25.2048, 55.2708],
        zoom: 11,
        zoomControl: false,
    });

    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
    }).addTo(map);

    // Hide placeholder when tiles load
    tileLayer.on('load', () => {
        const placeholder = document.getElementById('map-placeholder');
        if (placeholder) {
            placeholder.style.opacity = '0';
            placeholder.style.transition = 'opacity 0.5s ease';
            setTimeout(() => placeholder.remove(), 500);
        }
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        iconCreateFunction: (cluster) => L.divIcon({
            html: `<div class="cluster-icon">${cluster.getChildCount()}</div>`,
            className: '',
            iconSize: [40, 40],
        }),
        showCoverageOnHover: false,
    });
    map.addLayer(clusterGroup);
}

function createPriceMarker(m) {
    const priceLabel = formatPriceShort(m.price_aed);
    const colorClass = m.is_off_plan ? 'marker-offplan' : 'marker-secondary';

    const marker = L.marker([m.lat, m.lng], {
        icon: L.divIcon({
            className: '',
            html: `<div class="marker-bubble ${colorClass}">${priceLabel}</div>`,
            iconSize: [80, 28],
            iconAnchor: [40, 14],
        }),
    });

    marker.pfId = m.pf_id;
    marker.priceAed = m.price_aed;
    return marker;
}

async function updateMapMarkers() {
    if (!map || !clusterGroup) return;

    try {
        const { markers } = await fetchMapMarkers();
        clusterGroup.clearLayers();
        markersByPfId = {};

        const newMarkers = [];
        for (const m of markers) {
            if (!m.lat || !m.lng) continue;
            const marker = createPriceMarker(m);

            marker.on('click', () => {
                const card = document.querySelector(`.property-card[data-pf-id="${m.pf_id}"]`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('bg-light-fill');
                    setTimeout(() => card.classList.remove('bg-light-fill'), 2000);
                }

                // Find matching property for extra details
                const prop = allLoadedProperties.find(p => p.pf_id === m.pf_id);
                const popupImg = prop?.images?.[0] || PLACEHOLDER_IMG;
                const popupTitle = prop?.title || '';
                const popupBeds = prop ? (prop.bedrooms_value === 0 ? 'Studio' : (prop.bedrooms_value ? `${prop.bedrooms_value} hab.` : '')) : '';
                const popupSize = prop?.size_sqft ? `${Math.round(prop.size_sqft)} ft²` : '';
                const popupAmenities = [popupBeds, popupSize].filter(Boolean).join(' &middot; ');

                const popup = L.popup({ maxWidth: 280, className: 'emiralia-popup', closeButton: true })
                    .setLatLng(marker.getLatLng())
                    .setContent(`
                        <div class="popup-card">
                            <img class="popup-img" src="${popupImg}" alt="" onerror="this.style.display='none'" />
                            <div class="popup-body">
                                ${popupTitle ? `<p style="font-weight:600;font-size:12px;margin-bottom:2px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${popupTitle}</p>` : ''}
                                <p style="font-weight:700;font-size:14px;margin-bottom:2px;">${formatPrice(m.price_aed)} <span style="font-weight:400;font-size:11px;color:#94A3B8;">${formatEUR(m.price_aed)}</span></p>
                                <p style="font-size:11px;color:#64748B;">${popupAmenities}${popupAmenities && m.is_off_plan ? ' &middot; ' : ''}${m.is_off_plan ? '<span style="color:#F97316;font-weight:600;">Off-Plan</span>' : ''}</p>
                            </div>
                        </div>
                    `);
                marker.bindPopup(popup).openPopup();
            });

            markersByPfId[m.pf_id] = marker;
            newMarkers.push(marker);
        }

        clusterGroup.addLayers(newMarkers);

        if (newMarkers.length > 0) {
            const bounds = clusterGroup.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
            }
        }
    } catch (err) {
        console.error('Map markers error:', err);
    }
}

// ========== Carousel Logic ==========
function initCarousel() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const prevBtn = e.target.closest('.carousel-prev');
        const nextBtn = e.target.closest('.carousel-next');
        if (!prevBtn && !nextBtn) return;

        e.stopPropagation();
        e.preventDefault();

        const carousel = e.target.closest('.card-carousel');
        if (!carousel) return;

        const track = carousel.querySelector('.carousel-track');
        const total = parseInt(carousel.dataset.total);
        let current = parseInt(carousel.dataset.current);

        if (prevBtn) current = (current - 1 + total) % total;
        if (nextBtn) current = (current + 1) % total;

        carousel.dataset.current = current;
        track.style.transform = `translateX(-${current * (100 / total)}%)`;

        // Lazy load current and adjacent images
        const imgs = track.querySelectorAll('img');
        [current - 1, current, current + 1].forEach(idx => {
            const i = (idx + total) % total;
            if (imgs[i] && imgs[i].dataset.src && (!imgs[i].src || imgs[i].src === window.location.href)) {
                imgs[i].src = imgs[i].dataset.src;
            }
        });

        // Update dots
        carousel.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === current);
        });
    });
}

// ========== Carousel Touch Swipe ==========
function initCarouselSwipe() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    let startX = 0;
    let isDragging = false;
    let currentCarousel = null;

    grid.addEventListener('touchstart', (e) => {
        const carousel = e.target.closest('.card-carousel');
        if (!carousel || parseInt(carousel.dataset.total) <= 1) return;
        startX = e.touches[0].clientX;
        isDragging = true;
        currentCarousel = carousel;
    }, { passive: true });

    grid.addEventListener('touchend', (e) => {
        if (!isDragging || !currentCarousel) return;
        const dx = e.changedTouches[0].clientX - startX;
        isDragging = false;

        if (Math.abs(dx) < 40) return; // threshold

        const total = parseInt(currentCarousel.dataset.total);
        let current = parseInt(currentCarousel.dataset.current);
        current = dx < 0 ? (current + 1) % total : (current - 1 + total) % total;

        currentCarousel.dataset.current = current;
        const track = currentCarousel.querySelector('.carousel-track');
        track.style.transform = `translateX(-${current * (100 / total)}%)`;

        // Lazy load
        const imgs = track.querySelectorAll('img');
        [current - 1, current, current + 1].forEach(idx => {
            const i = (idx + total) % total;
            if (imgs[i] && imgs[i].dataset.src && (!imgs[i].src || imgs[i].src === window.location.href)) {
                imgs[i].src = imgs[i].dataset.src;
            }
        });

        // Update dots
        currentCarousel.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === current);
        });

        currentCarousel = null;
    }, { passive: true });
}

// ========== Card ↔ Map Hover Sync ==========
function initHoverSync() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    grid.addEventListener('mouseenter', (e) => {
        const card = e.target.closest('.property-card');
        if (!card) return;
        const pfId = card.dataset.pfId;
        const marker = markersByPfId[pfId];
        if (marker) {
            const el = marker.getElement();
            if (el) el.querySelector('.marker-bubble')?.classList.add('marker-hover');
        }
    }, true);

    grid.addEventListener('mouseleave', (e) => {
        const card = e.target.closest('.property-card');
        if (!card) return;
        const pfId = card.dataset.pfId;
        const marker = markersByPfId[pfId];
        if (marker) {
            const el = marker.getElement();
            if (el) el.querySelector('.marker-bubble')?.classList.remove('marker-hover');
        }
    }, true);
}

// ========== Search & Render ==========
let currentPage = 1;
let totalPages = 1;
let isLoading = false;
let allLoadedProperties = [];

async function performSearch(resetScroll = true) {
    if (isLoading) return;
    isLoading = true;
    currentPage = 1;
    allLoadedProperties = [];

    const grid = document.getElementById('cards-grid');
    const skeleton = document.getElementById('loading-skeleton');
    const empty = document.getElementById('empty-state');
    const countEl = document.getElementById('results-count');

    grid.innerHTML = '';
    skeleton.classList.remove('hidden');
    empty.classList.add('hidden');

    try {
        const data = await fetchProperties(1);
        skeleton.classList.add('hidden');

        if (data.data.length === 0) {
            empty.classList.remove('hidden');
            countEl.textContent = '0';
        } else {
            countEl.textContent = data.meta.total.toLocaleString('es-ES');
            totalPages = data.meta.pages;
            allLoadedProperties = data.data;
            grid.innerHTML = data.data.map(renderCard).join('');
            if (window.lucide) lucide.createIcons({ nodes: [grid] });
        }

        if (resetScroll) {
            document.getElementById('results-panel')?.scrollTo({ top: 0 });
        }

        updateMapMarkers();
        updateFilterPills();
        updateSheetCards(data.data.slice(0, 6));
    } catch (err) {
        console.error('Search error:', err);
        skeleton.classList.add('hidden');
        grid.innerHTML = `<div class="p-6 text-center text-secondary-text text-sm">Error al cargar propiedades. Verifica que la API este activa.</div>`;
    }

    isLoading = false;
}

async function loadMore() {
    if (isLoading || currentPage >= totalPages) return;
    isLoading = true;
    currentPage++;

    const loadingMore = document.getElementById('loading-more');
    loadingMore?.classList.remove('hidden');

    try {
        const data = await fetchProperties(currentPage);
        const grid = document.getElementById('cards-grid');
        const html = data.data.map(renderCard).join('');
        grid.insertAdjacentHTML('beforeend', html);
        allLoadedProperties.push(...data.data);

        if (window.lucide) {
            const newCards = grid.querySelectorAll('.property-card:not([data-icons-done])');
            newCards.forEach(c => {
                lucide.createIcons({ nodes: [c] });
                c.dataset.iconsDone = '1';
            });
        }
    } catch (err) {
        console.error('Load more error:', err);
        currentPage--;
    }

    loadingMore?.classList.add('hidden');
    isLoading = false;
}

// ========== Infinite Scroll ==========
function initInfiniteScroll() {
    const sentinel = document.getElementById('scroll-sentinel');
    const panel = document.getElementById('results-panel');
    if (!sentinel || !panel) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && currentPage < totalPages) {
            loadMore();
        }
    }, { root: panel, threshold: 0.1 });

    observer.observe(sentinel);
}

// ========== Filter Pills ==========
function updateFilterPills() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    const filters = state.activeFilters();
    if (filters.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = filters.map(f => `
        <span class="filter-pill inline-flex items-center gap-1 bg-primary-text text-white text-[11px] px-2.5 py-1 rounded-full font-medium">
            ${f.display}
            <button class="remove-filter cursor-pointer hover:opacity-70 flex items-center justify-center w-4 h-4 rounded-full hover:bg-white/20 transition-colors" data-key="${f.key}" aria-label="Quitar filtro">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/></svg>
            </button>
        </span>
    `).join('');

    container.querySelectorAll('.remove-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.remove(btn.dataset.key);
            performSearch();
        });
    });
}

// ========== Quick Filter Chips ==========
function initQuickFilters() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.dataset.filter;
            const isActive = chip.classList.contains('bg-primary');

            if (isActive) {
                chip.classList.remove('bg-primary', 'text-white', 'border-primary');
                chip.classList.add('border-border-emphasis');
                if (filter === 'off_plan') state.remove('off_plan');
                if (filter === 'verified') state.remove('verificadas');
            } else {
                chip.classList.add('bg-primary', 'text-white', 'border-primary');
                chip.classList.remove('border-border-emphasis');
                if (filter === 'off_plan') state.set('off_plan', 'true');
                if (filter === 'verified') state.set('verificadas', 'true');
            }
            performSearch();
        });
    });
}

// ========== Sort ==========
function initSort() {
    const selects = [document.getElementById('sort-select'), document.getElementById('sort-select-mobile')];
    selects.forEach(sel => {
        if (!sel) return;
        const current = state.get('ordenar') || 'newest';
        sel.value = current;
        sel.addEventListener('change', () => {
            state.set('ordenar', sel.value);
            selects.forEach(s => { if (s && s !== sel) s.value = sel.value; });
            performSearch();
        });
    });
}

// ========== View Toggle ==========
let currentView = 'split';

function initViewToggle() {
    const main = document.getElementById('results-main');
    const resultsPanel = document.getElementById('results-panel');
    const mapPanel = document.getElementById('map-panel');

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            setView(view);

            document.querySelectorAll('.view-btn').forEach(b => {
                b.classList.remove('active');
                b.querySelector('i')?.classList.replace('text-primary-text', 'text-secondary-text');
            });
            btn.classList.add('active');
            btn.querySelector('i')?.classList.replace('text-secondary-text', 'text-primary-text');
        });
    });

    // Mobile FAB
    const fab = document.getElementById('mobile-view-toggle');
    const sheet = document.getElementById('mobile-bottom-sheet');
    let mobileMapMode = false;

    if (fab) {
        fab.addEventListener('click', () => {
            mobileMapMode = !mobileMapMode;
            const fabIcon = document.getElementById('fab-icon');
            const fabLabel = document.getElementById('fab-label');

            if (mobileMapMode) {
                resultsPanel.classList.add('hidden');
                mapPanel.classList.remove('hidden');
                mapPanel.classList.add('block');
                fabIcon?.setAttribute('data-lucide', 'list');
                if (fabLabel) fabLabel.textContent = 'Ver Lista';
                sheet?.classList.remove('hidden');
                if (map) setTimeout(() => map.invalidateSize(), 100);
            } else {
                resultsPanel.classList.remove('hidden');
                mapPanel.classList.add('hidden');
                mapPanel.classList.remove('block');
                fabIcon?.setAttribute('data-lucide', 'map');
                if (fabLabel) fabLabel.textContent = 'Ver Mapa';
                sheet?.classList.add('hidden');
            }
            if (window.lucide) lucide.createIcons({ nodes: [fab] });
        });
    }
}

function setView(view) {
    const resultsPanel = document.getElementById('results-panel');
    const mapPanel = document.getElementById('map-panel');
    const cardsGrid = document.getElementById('cards-grid');
    currentView = view;

    if (view === 'split') {
        resultsPanel.classList.remove('hidden', 'lg:w-full', 'lg:max-w-none');
        resultsPanel.classList.add('lg:w-[55%]', 'lg:max-w-[720px]');
        mapPanel.classList.remove('hidden');
        mapPanel.classList.add('lg:block');
        // Horizontal cards = single column in split
        cardsGrid?.classList.remove('sm:grid-cols-2', 'lg:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    } else if (view === 'list') {
        resultsPanel.classList.remove('hidden', 'lg:w-[55%]', 'lg:max-w-[720px]');
        resultsPanel.classList.add('lg:w-full', 'lg:max-w-none');
        mapPanel.classList.add('hidden');
        mapPanel.classList.remove('lg:block');
        // Full width = 2 columns of horizontal cards
        cardsGrid?.classList.remove('sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
        cardsGrid?.classList.add('lg:grid-cols-2');
    } else if (view === 'map') {
        resultsPanel.classList.add('hidden');
        mapPanel.classList.remove('hidden');
        mapPanel.classList.add('lg:block', 'lg:w-full');
    }

    if (map && (view === 'split' || view === 'map')) {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

// ========== Filters Modal ==========
function initFiltersModal() {
    const modal = document.getElementById('filters-modal');
    const openBtn = document.getElementById('open-filters');
    const closeBtn = document.getElementById('close-filters');
    const backdrop = document.getElementById('filters-backdrop');
    const clearBtn = document.getElementById('clear-filters');
    const applyBtn = document.getElementById('apply-filters');
    const clearAllBtn = document.getElementById('clear-all-filters');

    if (!modal) return;

    const open = () => {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        syncFiltersFromURL();
    };
    const close = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    };

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    clearBtn?.addEventListener('click', () => {
        state.clear();
        performSearch();
        close();
    });

    clearAllBtn?.addEventListener('click', () => {
        state.clear();
        performSearch();
    });

    // Property type chips
    document.querySelectorAll('#filter-property-type .filter-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const wasActive = btn.classList.contains('bg-primary');
            document.querySelectorAll('#filter-property-type .filter-option').forEach(b => {
                b.classList.remove('bg-primary', 'text-white', 'border-primary');
            });
            if (!wasActive) {
                btn.classList.add('bg-primary', 'text-white', 'border-primary');
            }
        });
    });

    // Bedrooms chips (multi-select)
    document.querySelectorAll('#filter-bedrooms .filter-option').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('bg-primary');
            btn.classList.toggle('text-white');
            btn.classList.toggle('border-primary');
        });
    });

    // Off-plan radio
    document.querySelectorAll('#filter-off-plan .filter-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filter-off-plan .filter-option').forEach(b => {
                b.classList.remove('bg-primary', 'text-white', 'border-primary');
            });
            btn.classList.add('bg-primary', 'text-white', 'border-primary');
        });
    });

    // Price presets
    document.querySelectorAll('.price-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const minInput = document.getElementById('filter-price-min');
            const maxInput = document.getElementById('filter-price-max');
            if (minInput) minInput.value = btn.dataset.min || '';
            if (maxInput) maxInput.value = btn.dataset.max || '';
        });
    });

    // Apply button
    applyBtn?.addEventListener('click', () => {
        applyFiltersFromModal();
        close();
        performSearch();
    });
}

function syncFiltersFromURL() {
    // Property type
    const tipo = state.get('tipo');
    document.querySelectorAll('#filter-property-type .filter-option').forEach(btn => {
        const match = btn.dataset.value === tipo;
        btn.classList.toggle('bg-primary', match);
        btn.classList.toggle('text-white', match);
        btn.classList.toggle('border-primary', match);
    });

    // Bedrooms
    const beds = (state.get('habitaciones') || '').split(',').filter(Boolean);
    document.querySelectorAll('#filter-bedrooms .filter-option').forEach(btn => {
        const match = beds.includes(btn.dataset.value);
        btn.classList.toggle('bg-primary', match);
        btn.classList.toggle('text-white', match);
        btn.classList.toggle('border-primary', match);
    });

    // Price
    const priceMin = document.getElementById('filter-price-min');
    const priceMax = document.getElementById('filter-price-max');
    if (priceMin) priceMin.value = state.get('precio_min') || '';
    if (priceMax) priceMax.value = state.get('precio_max') || '';

    // Off-plan
    const offPlan = state.get('off_plan') || '';
    document.querySelectorAll('#filter-off-plan .filter-option').forEach(btn => {
        const match = btn.dataset.value === offPlan;
        btn.classList.toggle('bg-primary', match);
        btn.classList.toggle('text-white', match);
        btn.classList.toggle('border-primary', match);
    });

    // Verified
    const verified = document.getElementById('filter-verified');
    if (verified) verified.checked = state.get('verificadas') === 'true';
}

function applyFiltersFromModal() {
    // Property type
    const activeType = document.querySelector('#filter-property-type .filter-option.bg-primary');
    if (activeType) {
        state.set('tipo', activeType.dataset.value);
    } else {
        state.remove('tipo');
    }

    // Bedrooms
    const activeBeds = Array.from(document.querySelectorAll('#filter-bedrooms .filter-option.bg-primary'))
        .map(b => b.dataset.value);
    if (activeBeds.length > 0) {
        state.set('habitaciones', activeBeds.join(','));
    } else {
        state.remove('habitaciones');
    }

    // Price
    const priceMin = document.getElementById('filter-price-min')?.value;
    const priceMax = document.getElementById('filter-price-max')?.value;
    if (priceMin) state.set('precio_min', priceMin); else state.remove('precio_min');
    if (priceMax) state.set('precio_max', priceMax); else state.remove('precio_max');

    // Off-plan
    const activeOffPlan = document.querySelector('#filter-off-plan .filter-option.bg-primary');
    if (activeOffPlan && activeOffPlan.dataset.value) {
        state.set('off_plan', activeOffPlan.dataset.value);
    } else {
        state.remove('off_plan');
    }

    // Verified
    const verified = document.getElementById('filter-verified');
    if (verified?.checked) {
        state.set('verificadas', 'true');
    } else {
        state.remove('verificadas');
    }
}

// ========== Bottom Sheet (Mobile) ==========
function updateSheetCards(properties) {
    const container = document.getElementById('sheet-cards');
    if (!container) return;
    container.innerHTML = properties.slice(0, 6).map(renderSheetCard).join('');
    if (window.lucide) lucide.createIcons({ nodes: [container] });
}

function initBottomSheet() {
    const sheet = document.getElementById('mobile-bottom-sheet');
    const handle = document.getElementById('sheet-handle');
    if (!sheet || !handle) return;

    let startY = 0;
    let startH = 0;
    const PEEK = 160;
    const MAX = window.innerHeight * 0.55;

    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startH = sheet.offsetHeight;
        sheet.style.transition = 'none';
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
        const dy = startY - e.touches[0].clientY;
        const h = Math.min(Math.max(startH + dy, PEEK), MAX);
        sheet.style.height = `${h}px`;
    }, { passive: true });

    handle.addEventListener('touchend', () => {
        sheet.style.transition = 'height 0.3s ease';
        const h = sheet.offsetHeight;
        sheet.style.height = h > (PEEK + MAX) / 2 ? `${MAX}px` : `${PEEK}px`;
    });

    // ✅ XSS Fix: Event delegation for sheet card clicks
    const container = document.getElementById('sheet-cards');
    if (container) {
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.sheet-card');
            if (!card) return;

            const propId = parseInt(card.dataset.pfId);
            if (isNaN(propId) || propId <= 0) {
                console.error('[XSS Prevention] Invalid property ID in sheet card click');
                return;
            }

            window.location.href = `/propiedad.html?pf_id=${propId}`;
        });
    }
}

// ========== Lazy Image Loading (Performance Fix) ==========
function initLazyImages() {
    let loadingImages = 0;
    const MAX_CONCURRENT_LOADS = 3;

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;

                // Limit concurrent image loads
                if (src && loadingImages < MAX_CONCURRENT_LOADS) {
                    loadingImages++;
                    img.src = src;
                    img.onload = () => loadingImages--;
                    img.onerror = () => loadingImages--;
                    imageObserver.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px',
        threshold: 0.01
    });

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ========== Browser History ==========
function initPopState() {
    window.addEventListener('popstate', () => {
        state.params = new URLSearchParams(window.location.search);
        performSearch(false);
    });
}

// ========== Theme (Brand: always light) ==========
function initTheme() {
    // Brand guidelines: always light theme
    document.documentElement.classList.remove('dark');
}

// ========== Property Card Click Handler (XSS Fix) ==========
function initPropertyCardClicks() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    // Event delegation for property card clicks
    grid.addEventListener('click', (e) => {
        // Check if click is on a button that should stop propagation
        const stopPropBtn = e.target.closest('[data-stop-propagation="true"]');
        if (stopPropBtn) {
            e.stopPropagation();
            return;
        }

        // Find property card
        const card = e.target.closest('.property-card');
        if (!card) return;

        // ✅ SECURITY: Use validated integer ID from data attribute
        const propId = parseInt(card.dataset.pfId);
        if (isNaN(propId) || propId <= 0) {
            console.error('[XSS Prevention] Invalid property ID in card click');
            return;
        }

        // Navigate to property detail page
        window.location.href = `/propiedad.html?pf_id=${propId}`;
    });
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMap();
    initSort();
    initViewToggle();
    initQuickFilters();
    initFiltersModal();
    initInfiniteScroll();
    initCarousel();
    initCarouselSwipe();
    initHoverSync();
    initBottomSheet();
    initPopState();
    initPropertyCardClicks(); // ✅ XSS Fix: Event delegation instead of inline onclick
    initLazyImages(); // ✅ Performance Fix: Lazy loading with Intersection Observer

    // Render icons
    if (window.lucide) lucide.createIcons();

    // Initial search
    performSearch();
});
