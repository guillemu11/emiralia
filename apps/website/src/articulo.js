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

// ========== Active TOC highlight on scroll ==========
const initTocHighlight = () => {
    const tocLinks = document.querySelectorAll('.toc-link');
    const sections = [];

    tocLinks.forEach(link => {
        const id = link.getAttribute('href')?.replace('#', '');
        if (id) {
            const section = document.getElementById(id);
            if (section) sections.push({ id, el: section, link });
        }
    });

    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                tocLinks.forEach(l => l.classList.remove('toc-active'));
                const match = sections.find(s => s.id === entry.target.id);
                if (match) match.link.classList.add('toc-active');
            }
        });
    }, {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
    });

    sections.forEach(s => observer.observe(s.el));
};

// ========== Smooth scroll for TOC links ==========
const initSmoothScroll = () => {
    document.querySelectorAll('.toc-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const id = link.getAttribute('href')?.replace('#', '');
            const target = document.getElementById(id);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
};

// ========== Reading progress bar ==========
const initReadingProgress = () => {
    const bar = document.getElementById('reading-progress');
    if (!bar) return;

    // ✅ Memory Leak Fix: Use EventManager
    const progressHandler = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = `${Math.min(progress, 100)}%`;
    };
    eventManager.add(window, 'scroll', progressHandler, { passive: true });
};

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
    initTocHighlight();
    initSmoothScroll();
    initReadingProgress();
});
