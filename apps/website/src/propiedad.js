/**
 * propiedad.js — Pagina de detalle de propiedad individual
 * Carga datos de la API por ID, renderiza galeria, metricas y mapa.
 */

import './style.css';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : '/api';

const AED_TO_EUR = 0.25;
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80';

const PROPERTY_TYPES_ES = {
  Apartment: 'Apartamento',
  Villa: 'Villa',
  Townhouse: 'Adosado',
  Penthouse: 'Atico',
  Duplex: 'Duplex',
  'Hotel Apartment': 'Apartamento Hotel',
};

const AMENITIES_ICONS = {
  'Piscina': 'waves',
  'Piscina infinity': 'waves',
  'Gimnasio': 'dumbbell',
  'Parking': 'car',
  'Seguridad 24/7': 'shield',
  'Area infantil': 'baby',
  'Jardin': 'trees',
  'Jardin privado': 'trees',
  'Spa': 'flower-2',
  'Sauna': 'flame',
  'Concierge': 'bell-ring',
  'Balcon': 'sun',
  'Terraza': 'sun',
  'Vista al mar': 'waves',
  'BBQ': 'flame',
  'Sala de cine': 'clapperboard',
  'Coworking': 'monitor',
  'Cancha de tenis': 'trophy',
  'Cancha de padel': 'trophy',
};

// Formato de numeros
function fmtPrice(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US');
}

function fmtPriceAED(n) {
  return `AED ${fmtPrice(n)}`;
}

function fmtPriceEUR(n) {
  if (n == null) return '';
  return `~ EUR ${fmtPrice(Math.round(n * AED_TO_EUR))}`;
}

// Obtener ID de la URL
function getPropertyId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || params.get('pf_id');
}

// ========== DATA FETCHING ==========

async function fetchProperty(id) {
  try {
    const res = await fetch(`${API_BASE}/properties/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.error('Error fetching property:', err);
    return null;
  }
}

// ========== RENDER ==========

function renderProperty(p) {
  if (!p) return renderEmpty();

  const images = p.images && p.images.length > 0 ? p.images : [PLACEHOLDER_IMG];
  const title = p.title || 'Propiedad en EAU';
  const community = p.community || 'Dubai';
  const city = p.city || 'Dubai';
  const priceAED = p.price_aed || p.price;
  const beds = p.bedrooms_value ?? p.bedrooms ?? '—';
  const baths = p.bathrooms ?? '—';
  const size = p.size_sqft ?? '—';
  const type = PROPERTY_TYPES_ES[p.property_type] || p.property_type || 'Propiedad';
  const isOffPlan = p.is_off_plan;
  const isVerified = p.is_verified;
  const isPremium = p.is_premium || (p.ai_score && p.ai_score >= 80);
  const roi = p.roi;
  const aiScore = p.ai_score;
  const developer = p.developer_name || p.broker_name || '—';
  const completion = p.completion_date || (isOffPlan ? 'En construccion' : 'Listo');
  const lat = p.latitude;
  const lng = p.longitude;

  // Page title
  document.title = `${title} - Emiralia`;

  // Breadcrumb
  const bcCommunity = document.getElementById('breadcrumb-community');
  if (bcCommunity) bcCommunity.textContent = community;

  // Hero gallery
  renderGallery(images);

  // Badges
  if (isOffPlan) show('badge-offplan');
  if (isVerified) show('badge-verified');
  if (isPremium) show('badge-premium');

  // Title & price
  setText('property-title', title);
  setHTML('property-location', `<i data-lucide="map-pin" class="w-4 h-4 text-primary"></i><span>${community}, ${city}</span>`);
  setText('property-price', fmtPriceAED(priceAED));
  setText('property-price-eur', fmtPriceEUR(priceAED));

  // Specs
  setText('spec-beds', `${beds} Habitaciones`);
  setText('spec-baths', `${baths} Banos`);
  setText('spec-size', `${fmtPrice(size)} sqft`);
  setText('spec-completion', completion);

  // Metrics
  if (roi != null) setText('metric-roi', `${roi}%`);
  if (p.appreciation != null) setText('metric-appreciation', `${p.appreciation}%`);
  if (p.occupancy != null) setText('metric-occupancy', `${p.occupancy}%`);

  // AI Score
  if (aiScore != null) {
    setText('ai-score-value', Math.round(aiScore));
    const bar = document.getElementById('ai-score-bar');
    if (bar) bar.style.width = `${Math.min(aiScore, 100)}%`;
  }

  // Description
  if (p.description) {
    setHTML('property-description', `<p>${p.description.replace(/\n/g, '</p><p>')}</p>`);
  }

  // Sidebar price
  setText('sidebar-price', fmtPriceAED(priceAED));
  setText('sidebar-price-eur', fmtPriceEUR(priceAED));

  // Characteristics
  setText('char-type', type);
  setText('char-beds', beds);
  setText('char-baths', baths);
  setText('char-size', `${fmtPrice(size)} sqft`);
  setText('char-status', isOffPlan ? 'Off-Plan' : 'Secundario');
  setText('char-completion', completion);
  setText('char-developer', developer);
  setText('char-ref', p.pf_id || p.id || '—');

  // ROI sidebar
  if (priceAED && size && size > 0) {
    setText('roi-price-sqft', fmtPriceAED(Math.round(priceAED / size)));
  }
  if (roi != null) setText('roi-rental', `${roi}%`);
  if (roi != null && priceAED) {
    setText('roi-annual-income', fmtPriceAED(Math.round(priceAED * roi / 100)));
  }
  if (p.appreciation != null && priceAED) {
    setText('roi-projected', fmtPriceAED(Math.round(priceAED * (1 + p.appreciation / 100))));
  }

  // Developer section
  setText('developer-name', developer);
  if (p.developer_logo) {
    const logoEl = document.getElementById('developer-logo');
    if (logoEl) logoEl.innerHTML = `<img src="${p.developer_logo}" alt="${developer}" class="w-full h-full object-contain p-2" />`;
  }

  // Amenities
  if (p.amenities && p.amenities.length > 0) {
    renderAmenities(p.amenities);
  }

  // Map
  if (lat && lng) {
    initMap(lat, lng, title);
  }

  // Contact modal
  setText('contact-property-name', title);

  // Refresh Lucide icons
  if (window.lucide) lucide.createIcons();
}

function renderEmpty() {
  setText('property-title', 'Propiedad no encontrada');
  setText('property-price', '—');
  setText('property-price-eur', '');
}

// ========== GALLERY ==========

let currentImgIndex = 0;
let galleryImages = [];

function renderGallery(images) {
  galleryImages = images;
  currentImgIndex = 0;

  const heroImg = document.getElementById('hero-img');
  if (heroImg) {
    heroImg.src = images[0];
    heroImg.alt = 'Propiedad';
  }
  updateImgCounter();

  // Thumbnails
  const thumbContainer = document.getElementById('thumbnails');
  if (thumbContainer && images.length > 1) {
    thumbContainer.classList.remove('hidden');
    thumbContainer.innerHTML = images.map((img, i) =>
      `<button class="thumb-btn shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 ${i === 0 ? 'border-primary' : 'border-transparent'} hover:border-primary/50 transition-colors cursor-pointer" data-index="${i}">
        <img src="${img}" alt="Foto ${i + 1}" class="w-full h-full object-cover" loading="lazy" />
      </button>`
    ).join('');

    thumbContainer.querySelectorAll('.thumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        goToImage(parseInt(btn.dataset.index));
      });
    });
  }

  // Gallery nav
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  const gallery = document.getElementById('hero-gallery');

  if (images.length > 1) {
    if (prevBtn) prevBtn.style.opacity = '1';
    if (nextBtn) nextBtn.style.opacity = '1';

    prevBtn?.addEventListener('click', () => goToImage(currentImgIndex - 1));
    nextBtn?.addEventListener('click', () => goToImage(currentImgIndex + 1));

    // Touch swipe
    if (gallery) {
      let startX = 0;
      gallery.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      gallery.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          goToImage(currentImgIndex + (diff > 0 ? 1 : -1));
        }
      }, { passive: true });
    }
  }
}

function goToImage(index) {
  if (galleryImages.length === 0) return;
  currentImgIndex = ((index % galleryImages.length) + galleryImages.length) % galleryImages.length;
  const heroImg = document.getElementById('hero-img');
  if (heroImg) {
    heroImg.style.opacity = '0.5';
    heroImg.src = galleryImages[currentImgIndex];
    heroImg.onload = () => { heroImg.style.opacity = '1'; };
  }
  updateImgCounter();
  updateThumbnailActive();
}

function updateImgCounter() {
  const counter = document.getElementById('img-counter');
  if (counter) counter.textContent = `${currentImgIndex + 1} / ${galleryImages.length}`;
}

function updateThumbnailActive() {
  document.querySelectorAll('.thumb-btn').forEach((btn, i) => {
    btn.classList.toggle('border-primary', i === currentImgIndex);
    btn.classList.toggle('border-transparent', i !== currentImgIndex);
  });
}

// ========== AMENITIES ==========

function renderAmenities(amenities) {
  const grid = document.getElementById('amenities-grid');
  if (!grid) return;

  grid.innerHTML = amenities.slice(0, 9).map(a => {
    const name = typeof a === 'string' ? a : a.name || a;
    const icon = AMENITIES_ICONS[name] || 'check-circle';
    return `<div class="flex items-center gap-3 bg-slate-50 border border-border-color rounded-xl px-4 py-3">
      <i data-lucide="${icon}" class="w-4.5 h-4.5 text-secondary-text"></i>
      <span class="text-sm text-primary-text">${name}</span>
    </div>`;
  }).join('');
}

// ========== MAP ==========

function initMap(lat, lng, title) {
  const mapEl = document.getElementById('property-map');
  if (!mapEl || !window.L) return;

  const map = L.map(mapEl, {
    center: [lat, lng],
    zoom: 15,
    scrollWheelZoom: false,
    attributionControl: false,
  });

  // Estilo claro para el mapa (brand guidelines: light theme)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map);

  // Marcador personalizado
  const icon = L.divIcon({
    className: 'custom-marker-detail',
    html: `<div class="w-10 h-10 rounded-full bg-primary border-4 border-primary/30 shadow-lg shadow-primary/40 flex items-center justify-center">
      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  L.marker([lat, lng], { icon }).addTo(map)
    .bindPopup(`<strong>${title}</strong>`);
}

// ========== MODALS ==========

function initContactModal() {
  const modal = document.getElementById('contact-modal');
  const backdrop = document.getElementById('contact-backdrop');
  const closeBtn = document.getElementById('close-contact');
  const ctaContact = document.getElementById('cta-contact');
  const ctaRequest = document.getElementById('cta-request');

  function openModal() { modal?.classList.remove('hidden'); }
  function closeModal() { modal?.classList.add('hidden'); }

  ctaContact?.addEventListener('click', openModal);
  ctaRequest?.addEventListener('click', openModal);
  backdrop?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Form submit
  const form = document.getElementById('contact-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.textContent = 'Enviado!';
      btn.classList.add('opacity-70', 'pointer-events-none');
    }
    setTimeout(closeModal, 1500);
  });
}

// ========== HELPERS ==========

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

// ========== INIT ==========

async function init() {
  // Mostrar body
  document.body.classList.add('styles-ready');

  // Init Lucide
  if (window.lucide) lucide.createIcons();

  // Init modals
  initContactModal();

  // Fetch property data
  const id = getPropertyId();
  if (id) {
    const property = await fetchProperty(id);
    renderProperty(property);
  } else {
    // Sin ID: mostrar datos de demo (ya en HTML)
    if (window.lucide) lucide.createIcons();
    // Intentar cargar mapa con coords de Dubai Marina por defecto
    initMap(25.0805, 55.1403, 'Dubai Marina');
  }
}

document.addEventListener('DOMContentLoaded', init);
