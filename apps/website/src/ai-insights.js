import './style.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  document.body.classList.add('styles-ready');
  loadTopProperties();
});

// Load Top 10 properties (mock AI score for now)
async function loadTopProperties() {
  const loadingEl = document.getElementById('loading-state');
  const gridEl = document.getElementById('properties-grid');
  const errorEl = document.getElementById('error-state');
  const lastUpdatedEl = document.getElementById('last-updated');

  try {
    const response = await fetch(`${API_URL}/api/properties?limit=10&sort=price_desc`);
    if (!response.ok) throw new Error('Failed to fetch');

    const data = await response.json();
    const properties = data.data || [];

    // Hide loading, show grid
    loadingEl.classList.add('hidden');
    gridEl.classList.remove('hidden');

    // Update timestamp
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = `Actualizado ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Render properties
    gridEl.innerHTML = properties.map((prop, index) => {
      const aiScore = 95 - (index * 3); // Mock score descending
      const scoreColor = aiScore >= 80 ? 'text-success dark:text-success/80 bg-success-bg dark:bg-green-900/30' :
                         aiScore >= 60 ? 'text-primary dark:text-primary/80 bg-primary/10 dark:bg-blue-900/30' :
                         'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';

      const image = prop.images?.[0] || '/placeholder.jpg';
      const priceFormatted = new Intl.NumberFormat('es-ES').format(prop.price_aed);

      return `
        <a href="/propiedad.html?id=${prop.pf_id}" class="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-border-color dark:border-slate-700 hover:shadow-xl transition-all">
          <div class="relative aspect-[4/3] overflow-hidden">
            <img src="${image}" alt="${prop.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div class="absolute top-3 right-3 ${scoreColor} px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
              AI ${aiScore}
            </div>
            <div class="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300">
              #${index + 1}
            </div>
          </div>
          <div class="p-5">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              ${prop.title}
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1">
              <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
              ${prop.community || prop.city}
            </p>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-secondary-text dark:text-slate-300">Precio</p>
                <p class="text-lg font-bold text-slate-900 dark:text-white">${priceFormatted} AED</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-secondary-text dark:text-slate-300">${prop.bedrooms || '—'} beds</p>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">${prop.size_sqft ? Math.round(prop.size_sqft) : '—'} sqft</p>
              </div>
            </div>
          </div>
        </a>
      `;
    }).join('');

    // Re-init icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

  } catch (error) {
    console.error('Error loading properties:', error);
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
  }
}
