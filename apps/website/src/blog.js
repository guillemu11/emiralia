// Blog page — Academia Emiralia (dark theme)
import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Marcar estilos como listos (previene FOUC)
    document.body.classList.add('styles-ready');

    // ========== Category card filter ==========
    const categoryCards = document.querySelectorAll('.blog-cat-card');
    const articleCards = document.querySelectorAll('.blog-card');
    let activeCategory = 'all';

    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;

            // Toggle: si clickeas el activo, deseleccionar (mostrar todos)
            if (card.classList.contains('active')) {
                categoryCards.forEach(c => c.classList.remove('active'));
                activeCategory = 'all';
            } else {
                categoryCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                activeCategory = category;
            }

            // Filtrar tarjetas con animacion
            articleCards.forEach(article => {
                if (activeCategory === 'all' || article.dataset.category === activeCategory) {
                    article.style.display = '';
                    article.style.opacity = '0';
                    article.style.transform = 'translateY(12px)';
                    requestAnimationFrame(() => {
                        article.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        article.style.opacity = '1';
                        article.style.transform = 'translateY(0)';
                    });
                } else {
                    article.style.display = 'none';
                }
            });
        });
    });

    // ========== Sort buttons ==========
    const sortBtns = document.querySelectorAll('.blog-sort');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ========== Newsletter form ==========
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]').value;
            if (email) {
                const btn = form.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.textContent = 'Suscrito';
                btn.style.background = '#16A34A';
                form.querySelector('input[type="email"]').value = '';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 3000);
            }
        });
    }
});
