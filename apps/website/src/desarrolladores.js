import './style.css'

// Remove FOUC guard
document.body.classList.add('styles-ready');


// ========== Scroll Animations ==========
const initAnimations = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.body.classList.add('js-loaded');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px'
    });

    // Animate developer cards on scroll
    document.querySelectorAll('.space-y-8 > div, .space-y-10 > div').forEach((card, i) => {
        card.classList.add('reveal');
        card.style.transitionDelay = `${i * 0.08}s`;
        observer.observe(card);
    });

    // Fallback: reveal all after 3s
    setTimeout(() => {
        document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
            el.classList.add('is-visible');
        });
    }, 3000);
}

// ========== Developer Search Filter ==========
const initSearch = () => {
    const searchInput = document.querySelector('input[placeholder*="Buscar desarrollador"]');
    if (!searchInput) return;

    const cards = document.querySelectorAll('.space-y-8 > div, .space-y-10 > div');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        cards.forEach(card => {
            const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const visible = !query || name.includes(query);
            card.style.display = visible ? '' : 'none';
        });
    });
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    initAnimations();
    initSearch();
});
