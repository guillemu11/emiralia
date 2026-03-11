import './style.css'

// Remove FOUC guard — styles are now injected
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

// Global instance
const eventManager = new EventManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    eventManager.cleanup();
});


// ========== Search Modal ==========
const initSearchModal = () => {
    const modal = document.getElementById('search-modal');
    if (!modal) return;

    const triggers = [
        document.getElementById('hero-search-trigger'),
        document.getElementById('sticky-search-trigger'),
    ];
    const closeBtn = document.getElementById('search-modal-close');

    const openModal = () => {
        modal.classList.add('modal-open');
        document.body.classList.add('modal-open');
        // Re-render icons inside modal
        if (window.lucide) lucide.createIcons({ nodes: [modal] });
    };

    const closeModal = () => {
        modal.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
    };

    triggers.forEach(trigger => {
        if (trigger) trigger.addEventListener('click', openModal);
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
}

// ========== Category Tabs ==========
const initCategoryTabs = () => {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.classList.remove('border-primary-text', 'dark:border-white');
                t.classList.add('border-transparent');
                t.querySelector('i')?.classList.replace('text-primary-text', 'text-secondary-text');
                t.querySelector('span')?.classList.replace('text-primary-text', 'text-secondary-text');
                t.querySelector('span')?.classList.replace('font-semibold', 'font-medium');
            });

            tab.classList.add('active');
            tab.classList.remove('border-transparent');
            tab.classList.add('border-primary-text', 'dark:border-white');
            tab.querySelector('i')?.classList.replace('text-secondary-text', 'text-primary-text');
            tab.querySelector('span')?.classList.replace('text-secondary-text', 'text-primary-text');
            tab.querySelector('span')?.classList.replace('font-medium', 'font-semibold');
        });
    });
}

// ========== Simulator ==========
const initSimulator = () => {
    const investmentSlider = document.getElementById('slider-investment');
    const horizonSlider = document.getElementById('slider-horizon');
    const investmentDisplay = document.getElementById('investment-display');
    const horizonDisplay = document.getElementById('horizon-display');
    const riskDisplay = document.getElementById('risk-display');
    const riskBtns = document.querySelectorAll('.risk-btn');

    const formatCurrency = (val) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        return `$${Number(val).toLocaleString('en-US')}`;
    };

    if (investmentSlider && investmentDisplay) {
        investmentSlider.addEventListener('input', (e) => {
            investmentDisplay.textContent = formatCurrency(e.target.value);
        });
    }

    if (horizonSlider && horizonDisplay) {
        horizonSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            horizonDisplay.textContent = `${val} ${val === '1' ? 'Año' : 'Años'}`;
        });
    }

    riskBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            riskBtns.forEach((b, i) => {
                b.classList.toggle('bg-primary', i === Number(btn.dataset.index));
                b.classList.toggle('bg-slate-700', i !== Number(btn.dataset.index));
            });
            if (riskDisplay) riskDisplay.textContent = btn.dataset.risk;
        });
    });
}

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

    document.querySelectorAll('main > section').forEach((section, i) => {
        if (i === 0) return;
        section.classList.add('reveal');
        observer.observe(section);
    });

    setTimeout(() => {
        document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
            el.classList.add('is-visible');
        });
    }, 3000);
}

// ========== Sticky search pill (appears when hero pill leaves viewport) ==========
const initStickySearch = () => {
    const heroPill = document.getElementById('hero-search-trigger');
    const stickyWrapper = document.getElementById('sticky-search-wrapper');
    const nav = document.getElementById('main-nav');
    if (!heroPill || !stickyWrapper) return;

    let stickyVisible = false;
    let ticking = false;

    // ✅ Memory Leak Fix: Use EventManager
    const scrollHandler = () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const pillRect = heroPill.getBoundingClientRect();
                const shouldShow = pillRect.bottom < -100;

                if (shouldShow && !stickyVisible) {
                    // Scroll down: nav hides first (via initNavScroll), then sticky enters with CSS delay
                    stickyVisible = true;
                    stickyWrapper.classList.remove('is-hiding');
                    stickyWrapper.style.maxHeight = '80px';
                    stickyWrapper.style.opacity = '1';
                } else if (!shouldShow && stickyVisible) {
                    // Scroll up: hide sticky immediately (no delay), nav returns after
                    stickyVisible = false;
                    stickyWrapper.classList.add('is-hiding');
                    stickyWrapper.style.maxHeight = '0';
                    stickyWrapper.style.opacity = '0';

                    // Show nav after sticky has finished hiding
                    if (nav && window.innerWidth < 640) {
                        setTimeout(() => {
                            nav.classList.remove('nav-hidden');
                        }, 200);
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    };
    eventManager.add(window, 'scroll', scrollHandler, { passive: true });
}

// ========== Nav + category tabs scroll effect ==========
const initNavScroll = () => {
    const nav = document.getElementById('main-nav');
    const hero = document.getElementById('hero-section');
    const categoryTabs = document.getElementById('category-tabs');
    if (!nav) return;

    const heroHeight = hero ? hero.offsetHeight : 600;
    let lastScrollY = 0;
    let ticking = false;

    // ✅ Memory Leak Fix: Use EventManager
    const navScrollHandler = () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const y = window.scrollY;
                const pastHero40 = y > heroHeight * 0.4;
                const pastHero = y > heroHeight;
                const scrollingDown = y > lastScrollY;
                const delta = Math.abs(y - lastScrollY);

                // Desktop + mobile: nav background
                nav.classList.toggle('nav-scrolled', pastHero40);
                nav.classList.toggle('shadow-sm', pastHero40);

                // Mobile
                if (window.innerWidth < 640) {
                    // Only ADD nav-hidden when scrolling past hero
                    // Removal is handled by initStickySearch for coordinated transition
                    if (pastHero) {
                        nav.classList.add('nav-hidden');
                    } else if (!pastHero) {
                        nav.classList.remove('nav-hidden');
                    }

                    // Category tabs: collapse on scroll down, expand on scroll up
                    if (categoryTabs && pastHero && delta > 5) {
                        categoryTabs.classList.toggle('tabs-hidden', scrollingDown);
                    }
                }

                lastScrollY = y;
                ticking = false;
            });
            ticking = true;
        }
    };
    eventManager.add(window, 'scroll', navScrollHandler, { passive: true });
}

// ========== Navigate to Search Results ==========
const initSearchNavigation = () => {
    // Desktop "Analizar" button
    const heroBtn = document.getElementById('hero-analyze-btn');
    if (heroBtn) {
        heroBtn.addEventListener('click', () => {
            window.location.href = '/propiedades.html';
        });
    }

    // Mobile modal "Analizar" button
    const modalBtn = document.getElementById('modal-analyze-btn');
    if (modalBtn) {
        modalBtn.addEventListener('click', () => {
            window.location.href = '/propiedades.html';
        });
    }

    // Nav "Propiedades" link
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        if (link.textContent.trim() === 'Propiedades' && link.getAttribute('href') === '#') {
            link.setAttribute('href', '/propiedades.html');
        }
    });
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    initSearchModal();
    initStickySearch();
    initCategoryTabs();
    initSimulator();
    initAnimations();
    initNavScroll();
    initSearchNavigation();
});
