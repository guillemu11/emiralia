import './style.css'

// Remove FOUC guard
document.body.classList.add('styles-ready');

// ========== Event Manager (Memory Leak Fix) ==========
class EventManager {
    constructor() {
        this.listeners = [];
    }

    add(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this.listeners.push({ target, event, handler });
    }

    cleanup() {
        this.listeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler);
        });
        this.listeners = [];
    }
}

const eventManager = new EventManager();
window.addEventListener('beforeunload', () => eventManager.cleanup());

// ========== Constants ==========
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
const AED_TO_EUR = 0.25;
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400';

const PROPERTY_TYPES_ES = {
    'Apartment': 'Apartamento', 'Villa': 'Villa', 'Townhouse': 'Adosado',
    'Studio': 'Estudio', 'Penthouse': 'Atico', 'Duplex': 'Duplex',
    'Hotel Apartment': 'Apartamento Hotel', 'Residential Floor': 'Planta Residencial',
    'Residential Plot': 'Parcela', 'Compound': 'Complejo',
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

// ========== Vertical Card Rendering (Premium V2) ==========
function renderCardV2(p) {
    const images = p.images?.length ? p.images : [PLACEHOLDER_IMG];
    const totalImages = images.length;
    const beds = p.bedrooms_value === 0 ? 'Studio' : (p.bedrooms_value ? `${p.bedrooms_value} hab` : null);
    const baths = p.bathrooms ? `${p.bathrooms} ba` : null;
    const size = p.size_sqft ? `${Math.round(p.size_sqft).toLocaleString('es-ES')} ft\u00B2` : null;
    const completion = p.is_off_plan ? 'Off-Plan' : 'Listo';

    // ROI
    const roi = p.roi || p.estimated_roi || null;
    const roiDisplay = roi ? `${Number(roi).toFixed(1)}%` : null;

    // Alto Potencial
    const altoPotencial = (roi && roi >= 8) || p.is_premium;

    // AI Score
    const aiScore = p.ai_score || (() => {
        let score = 55;
        if (roi) score += Number(roi) * 3;
        if (p.is_verified) score += 8;
        if (p.is_premium || p.is_featured) score += 6;
        if (p.images?.length > 1) score += Math.min(p.images.length * 2, 8);
        if (p.size_sqft && Number(p.size_sqft) > 0) score += 4;
        if (p.community) score += 3;
        if (p.latitude && p.longitude) score += 3;
        if (p.bathrooms) score += 2;
        if (p.is_off_plan) score += 2;
        if (p.price_aed && Number(p.price_aed) > 0) score += 3;
        return Math.min(99, Math.max(40, score));
    })();

    const aiScoreColor = aiScore >= 80
        ? 'bg-success text-white'
        : aiScore >= 65
            ? 'bg-primary text-white'
            : 'bg-amber-500 text-white';

    const developer = p.developer_name || p.developer || p.broker_name || null;

    // Carousel dots
    const dotsCount = Math.min(totalImages, 5);
    const dots = totalImages > 1 ? Array.from({ length: dotsCount }, (_, i) =>
        `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`
    ).join('') : '';

    // Amenity pills
    const amenities = [beds, baths, size].filter(Boolean);

    return `
        <article class="property-card-v2 group cursor-pointer rounded-2xl border border-border-color bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/[0.06] hover:-translate-y-1 hover:border-border-emphasis"
             data-pf-id="${p.pf_id}" data-lat="${p.latitude || ''}" data-lng="${p.longitude || ''}"
             onclick="window.location.href='/propiedad.html?pf_id=${p.pf_id}'">

            <!-- Image -->
            <div class="relative aspect-[4/3] overflow-hidden card-carousel" data-current="0" data-total="${totalImages}">
                <div class="carousel-track flex h-full transition-transform duration-300 ease-out" style="width:${totalImages * 100}%">
                    ${images.map((img, i) => `<img class="w-full h-full object-cover shrink-0" style="width:${100 / totalImages}%" src="${i === 0 ? img : ''}" data-src="${img}" alt="${p.title || ''}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" />`).join('')}
                </div>

                <!-- Overlay gradient -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                <!-- Top badges row -->
                <div class="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                    <div class="flex items-center gap-1.5">
                        ${altoPotencial ? `<span class="badge-alto-potencial text-[9px]">ALTO POTENCIAL</span>` : ''}
                        ${p.is_off_plan ? `<span class="badge-offplan text-[9px]">OFF-PLAN</span>` : ''}
                        ${p.is_verified ? `<span class="inline-flex items-center gap-1 bg-white backdrop-blur-sm text-[9px] font-bold text-success px-2 py-1 rounded-full shadow-sm border border-success/10"><i data-lucide="badge-check" class="w-3 h-3 text-success"></i>VERIFICADA</span>` : ''}
                    </div>
                    <button class="fav-btn w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md cursor-pointer transition-all hover:scale-110" aria-label="Guardar" onclick="event.stopPropagation()">
                        <i data-lucide="heart" class="w-4 h-4 text-slate-400"></i>
                    </button>
                </div>

                <!-- AI Score badge (bottom-left on image) -->
                ${aiScore ? `
                <div class="absolute bottom-3 left-3 z-10">
                    <div class="ai-score-badge ${aiScoreColor} px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg text-xs font-bold backdrop-blur-sm">
                        <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                        <span>${aiScore}</span>
                    </div>
                </div>` : ''}

                <!-- Image count -->
                ${totalImages > 1 ? `<span class="absolute bottom-3 right-3 z-10 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1"><i data-lucide="camera" class="w-3 h-3"></i>${totalImages}</span>` : ''}

                <!-- Carousel arrows -->
                ${totalImages > 1 ? `
                <button class="carousel-prev absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-white hover:scale-105" aria-label="Anterior" onclick="event.stopPropagation()">
                    <i data-lucide="chevron-left" class="w-4 h-4 text-primary-text"></i>
                </button>
                <button class="carousel-next absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-white hover:scale-105" aria-label="Siguiente" onclick="event.stopPropagation()">
                    <i data-lucide="chevron-right" class="w-4 h-4 text-primary-text"></i>
                </button>
                <div class="carousel-dots absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">${dots}</div>
                ` : ''}
            </div>

            <!-- Content -->
            <div class="p-4 sm:p-5">
                <!-- Location -->
                <p class="text-xs text-secondary-text flex items-center gap-1 mb-1.5">
                    <i data-lucide="map-pin" class="w-3 h-3 shrink-0 text-primary/60"></i>
                    <span class="truncate">${p.community || p.city || p.display_address || 'EAU'}</span>
                </p>

                <!-- Title -->
                <h3 class="font-semibold text-[15px] sm:text-base text-primary-text leading-snug line-clamp-2 mb-2">${p.title || 'Propiedad sin titulo'}</h3>

                <!-- Developer -->
                ${developer ? `<span class="badge-developer mb-3 inline-flex"><i data-lucide="building-2" class="w-3 h-3 shrink-0"></i><span class="truncate">${developer}</span></span>` : ''}

                <!-- Price -->
                <div class="flex items-baseline gap-2 mb-3">
                    <p class="font-bold text-lg sm:text-xl text-primary leading-tight">${formatPrice(p.price_aed)}</p>
                    <p class="text-xs text-muted-text font-medium">${formatEUR(p.price_aed)}</p>
                </div>

                <!-- Amenity pills -->
                <div class="flex items-center gap-2 flex-wrap mb-3">
                    ${amenities.map(a => `<span class="amenity-pill">${a}</span>`).join('')}
                    <span class="amenity-pill ${p.is_off_plan ? 'bg-warning/10 text-warning' : 'bg-success-bg text-success'}">${completion}</span>
                </div>

                <!-- ROI bar -->
                ${roiDisplay ? `
                <div class="flex items-center justify-between pt-3 border-t border-border-color">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                            <i data-lucide="trending-up" class="w-4 h-4 text-success"></i>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase tracking-wider text-muted-text">ROI Estimado</p>
                            <p class="text-base font-bold text-success leading-tight">${roiDisplay}</p>
                        </div>
                    </div>
                    <a href="/propiedad.html?pf_id=${p.pf_id}" class="text-xs font-semibold text-primary hover:underline flex items-center gap-1 whitespace-nowrap">
                        Ver detalle <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                    </a>
                </div>` : `
                <div class="flex items-center justify-end pt-3 border-t border-border-color">
                    <a href="/propiedad.html?pf_id=${p.pf_id}" class="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        Ver detalle <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                    </a>
                </div>`}
            </div>
        </article>
    `;
}

// ========== Carousel Logic ==========
function initCarousel() {
    const grid = document.getElementById('cards-grid-v2');
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

        // Lazy load
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

// ========== Touch Swipe ==========
function initCarouselSwipe() {
    const grid = document.getElementById('cards-grid-v2');
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

        if (Math.abs(dx) < 40) return;

        const total = parseInt(currentCarousel.dataset.total);
        let current = parseInt(currentCarousel.dataset.current);
        current = dx < 0 ? (current + 1) % total : (current - 1 + total) % total;

        currentCarousel.dataset.current = current;
        const track = currentCarousel.querySelector('.carousel-track');
        track.style.transform = `translateX(-${current * (100 / total)}%)`;

        const imgs = track.querySelectorAll('img');
        [current - 1, current, current + 1].forEach(idx => {
            const i = (idx + total) % total;
            if (imgs[i] && imgs[i].dataset.src && (!imgs[i].src || imgs[i].src === window.location.href)) {
                imgs[i].src = imgs[i].dataset.src;
            }
        });

        currentCarousel.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === current);
        });

        currentCarousel = null;
    }, { passive: true });
}

// ========== Filters ==========
function initFilters() {
    const modal = document.getElementById('filters-modal-v2');
    const openBtn = document.getElementById('open-filters-v2');
    const closeBtn = document.getElementById('close-filters-v2');
    const backdrop = document.getElementById('filters-backdrop-v2');
    const clearBtn = document.getElementById('clear-filters-v2');
    const applyBtn = document.getElementById('apply-filters-v2');

    if (!modal || !openBtn) return;

    const show = () => { modal.classList.remove('hidden'); document.body.classList.add('modal-open'); };
    const hide = () => { modal.classList.add('hidden'); document.body.classList.remove('modal-open'); };

    openBtn.addEventListener('click', show);
    closeBtn?.addEventListener('click', hide);
    backdrop?.addEventListener('click', hide);

    // Property type
    document.getElementById('filter-property-type-v2')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-opt-v2');
        if (!btn) return;
        btn.classList.toggle('active');
        btn.classList.toggle('bg-primary');
        btn.classList.toggle('text-white');
        btn.classList.toggle('border-primary');
    });

    // Bedrooms
    document.getElementById('filter-bedrooms-v2')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-opt-v2');
        if (!btn) return;
        const siblings = btn.parentElement.querySelectorAll('.filter-opt-v2');
        siblings.forEach(b => { b.classList.remove('active', 'bg-primary', 'text-white', 'border-primary'); });
        btn.classList.add('active', 'bg-primary', 'text-white', 'border-primary');
    });

    // Off-plan
    document.getElementById('filter-off-plan-v2')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-opt-v2');
        if (!btn) return;
        const siblings = btn.parentElement.querySelectorAll('.filter-opt-v2');
        siblings.forEach(b => { b.classList.remove('active', 'bg-primary', 'text-white', 'border-primary'); });
        btn.classList.add('active', 'bg-primary', 'text-white', 'border-primary');
    });

    // Price presets
    document.getElementById('filter-price-presets-v2')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.price-preset-v2');
        if (!btn) return;
        document.getElementById('filter-price-min-v2').value = btn.dataset.min || '';
        document.getElementById('filter-price-max-v2').value = btn.dataset.max || '';
        document.querySelectorAll('.price-preset-v2').forEach(b => b.classList.remove('bg-primary', 'text-white', 'border-primary'));
        btn.classList.add('bg-primary', 'text-white', 'border-primary');
    });

    // Clear
    clearBtn?.addEventListener('click', () => {
        document.querySelectorAll('.filter-opt-v2').forEach(b => b.classList.remove('active', 'bg-primary', 'text-white', 'border-primary'));
        document.querySelectorAll('.price-preset-v2').forEach(b => b.classList.remove('bg-primary', 'text-white', 'border-primary'));
        const minInput = document.getElementById('filter-price-min-v2');
        const maxInput = document.getElementById('filter-price-max-v2');
        if (minInput) minInput.value = '';
        if (maxInput) maxInput.value = '';
        document.getElementById('filter-verified-v2').checked = false;
        // Reset off-plan to "Todos"
        const offPlanBtns = document.querySelectorAll('#filter-off-plan-v2 .filter-opt-v2');
        offPlanBtns.forEach(b => b.classList.remove('active', 'bg-primary', 'text-white', 'border-primary'));
        if (offPlanBtns[0]) offPlanBtns[0].classList.add('active');
    });

    // Apply
    applyBtn?.addEventListener('click', () => {
        // Collect type
        const activeTypes = [...document.querySelectorAll('#filter-property-type-v2 .filter-opt-v2.active')].map(b => b.dataset.value);
        if (activeTypes.length) state.set('tipo', activeTypes[0]); else state.remove('tipo');

        // Bedrooms
        const activeBed = document.querySelector('#filter-bedrooms-v2 .filter-opt-v2.active');
        if (activeBed) state.set('habitaciones', activeBed.dataset.value); else state.remove('habitaciones');

        // Price
        const pMin = document.getElementById('filter-price-min-v2')?.value;
        const pMax = document.getElementById('filter-price-max-v2')?.value;
        if (pMin) state.set('precio_min', pMin); else state.remove('precio_min');
        if (pMax) state.set('precio_max', pMax); else state.remove('precio_max');

        // Off-plan
        const offPlanActive = document.querySelector('#filter-off-plan-v2 .filter-opt-v2.active');
        if (offPlanActive && offPlanActive.dataset.value) state.set('off_plan', offPlanActive.dataset.value); else state.remove('off_plan');

        // Verified
        if (document.getElementById('filter-verified-v2')?.checked) state.set('verificadas', 'true'); else state.remove('verificadas');

        hide();
        loadProperties(true);
    });

    // Quick filter chips
    document.querySelectorAll('.filter-chip-v2').forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.dataset.filter;
            if (filter === 'off_plan') {
                const current = state.get('off_plan');
                if (current === 'true') {
                    state.remove('off_plan');
                    chip.classList.remove('bg-primary', 'text-white', 'border-primary');
                } else {
                    state.set('off_plan', 'true');
                    chip.classList.add('bg-primary', 'text-white', 'border-primary');
                }
            }
            if (filter === 'verified') {
                const current = state.get('verificadas');
                if (current === 'true') {
                    state.remove('verificadas');
                    chip.classList.remove('bg-primary', 'text-white', 'border-primary');
                } else {
                    state.set('verificadas', 'true');
                    chip.classList.add('bg-primary', 'text-white', 'border-primary');
                }
            }
            loadProperties(true);
        });
    });
}

// ========== Active Filters Display ==========
function renderActiveFilters() {
    const container = document.getElementById('active-filters-v2');
    if (!container) return;

    const filters = state.activeFilters();
    const badge = document.getElementById('filter-count-badge');

    if (filters.length === 0) {
        container.innerHTML = '';
        if (badge) { badge.classList.add('hidden'); }
        return;
    }

    if (badge) {
        badge.textContent = filters.length;
        badge.classList.remove('hidden');
    }

    container.innerHTML = filters.map(f => `
        <button class="filter-pill-v2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold cursor-pointer hover:bg-primary/20 transition-colors" data-key="${f.key}">
            ${f.label}: ${f.display}
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>
    `).join('');

    lucide.createIcons({ attrs: { class: '' } });

    container.querySelectorAll('.filter-pill-v2').forEach(pill => {
        pill.addEventListener('click', () => {
            state.remove(pill.dataset.key);
            loadProperties(true);
        });
    });
}

// ========== Sort ==========
function initSort() {
    const select = document.getElementById('sort-select-v2');
    if (!select) return;

    const currentSort = state.get('ordenar');
    if (currentSort) select.value = currentSort;

    select.addEventListener('change', () => {
        state.set('ordenar', select.value);
        loadProperties(true);
    });
}

// ========== Search ==========
function initSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    const currentQ = state.get('ubicacion');
    if (currentQ) input.value = currentQ;

    let debounce;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            const val = input.value.trim();
            if (val.length >= 2) {
                state.set('ubicacion', val);
            } else {
                state.remove('ubicacion');
            }
            loadProperties(true);
        }, 400);
    });
}

// ========== Scroll to Top ==========
function initScrollToTop() {
    const fab = document.getElementById('scroll-top-fab');
    if (!fab) return;

    // ✅ Memory Leak Fix: Use EventManager
    const fabScrollHandler = () => {
        if (window.scrollY > 600) {
            fab.classList.remove('opacity-0', 'pointer-events-none');
            fab.classList.add('opacity-100');
        } else {
            fab.classList.add('opacity-0', 'pointer-events-none');
            fab.classList.remove('opacity-100');
        }
    };
    eventManager.add(window, 'scroll', fabScrollHandler, { passive: true });

    fab.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ========== View Toggle ==========
function initViewToggle() {
    const grid = document.getElementById('cards-grid-v2');
    document.querySelectorAll('.view-btn-v2').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn-v2').forEach(b => {
                b.classList.remove('active', 'bg-primary', 'text-white');
                b.querySelector('i')?.classList.add('text-muted-text');
                b.querySelector('i')?.classList.remove('text-white');
            });
            btn.classList.add('active', 'bg-primary', 'text-white');
            btn.querySelector('i')?.classList.remove('text-muted-text');
            btn.querySelector('i')?.classList.add('text-white');

            if (btn.dataset.view === 'list') {
                grid.classList.remove('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
                grid.classList.add('grid-cols-1', 'max-w-3xl', 'mx-auto');
            } else {
                grid.classList.remove('max-w-3xl', 'mx-auto');
                grid.classList.add('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
            }
        });
    });

    // Set initial active styling
    const activeBtn = document.querySelector('.view-btn-v2.active');
    if (activeBtn) {
        activeBtn.classList.add('bg-primary', 'text-white');
        activeBtn.querySelector('i')?.classList.remove('text-muted-text');
        activeBtn.querySelector('i')?.classList.add('text-white');
    }
}

// ========== Clear All ==========
function initClearAll() {
    document.getElementById('clear-all-v2')?.addEventListener('click', () => {
        state.clear();
        loadProperties(true);
    });
}

// ========== Main Data Loading ==========
let currentPage = 1;
let totalPages = 1;
let isLoading = false;
let allLoadedProperties = [];

async function loadProperties(reset = false) {
    if (isLoading) return;
    isLoading = true;

    const grid = document.getElementById('cards-grid-v2');
    const skeleton = document.getElementById('loading-skeleton-v2');
    const emptyState = document.getElementById('empty-state-v2');
    const loadingMore = document.getElementById('loading-more-v2');
    const countEl = document.getElementById('results-count-v2');

    if (reset) {
        currentPage = 1;
        allLoadedProperties = [];
        if (grid) grid.innerHTML = '';
        if (skeleton) skeleton.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
    } else {
        if (loadingMore) loadingMore.classList.remove('hidden');
    }

    try {
        const data = await fetchProperties(currentPage, 24);
        const properties = data.properties || data.data || [];
        totalPages = data.totalPages || data.total_pages || 1;

        if (skeleton) skeleton.classList.add('hidden');
        if (loadingMore) loadingMore.classList.add('hidden');

        if (reset && properties.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (countEl) countEl.textContent = '0';
            isLoading = false;
            renderActiveFilters();
            return;
        }

        const total = data.total || data.totalCount || properties.length;
        if (countEl) countEl.textContent = Number(total).toLocaleString('es-ES');

        allLoadedProperties = [...allLoadedProperties, ...properties];

        const fragment = document.createDocumentFragment();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = properties.map(p => renderCardV2(p)).join('');
        while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
        if (grid) grid.appendChild(fragment);

        lucide.createIcons({ attrs: { class: '' } });

        renderActiveFilters();
    } catch (err) {
        console.error('Error loading properties:', err);
        if (skeleton) skeleton.classList.add('hidden');
        if (loadingMore) loadingMore.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
    }

    isLoading = false;
}

// ========== Infinite Scroll ==========
function initInfiniteScroll() {
    const sentinel = document.getElementById('scroll-sentinel-v2');
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && currentPage < totalPages) {
            currentPage++;
            loadProperties(false);
        }
    }, { rootMargin: '400px' });

    observer.observe(sentinel);
}

// ========== Nav scroll effect ==========
function initNavScroll() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    // ✅ Memory Leak Fix: Use EventManager
    const navScrollHandler = () => {
        if (window.scrollY > 10) {
            nav.classList.add('shadow-sm');
            nav.classList.remove('border-color');
            nav.classList.add('border-emphasis');
        } else {
            nav.classList.remove('shadow-sm');
            nav.classList.add('border-color');
            nav.classList.remove('border-emphasis');
        }
    };
    eventManager.add(window, 'scroll', navScrollHandler, { passive: true });
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initSort();
    initSearch();
    initCarousel();
    initCarouselSwipe();
    initInfiniteScroll();
    initScrollToTop();
    initViewToggle();
    initClearAll();
    initNavScroll();
    loadProperties(true);
});
