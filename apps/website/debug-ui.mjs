import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/propiedades.html', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2500);

const results = await page.evaluate(() => {
    const data = {};

    // Filter bar
    const filterBar = document.getElementById('filter-bar');
    if (filterBar) {
        const rect = filterBar.getBoundingClientRect();
        const style = window.getComputedStyle(filterBar);
        data.filterBar = { top: rect.top, height: rect.height, width: rect.width, display: style.display, visibility: style.visibility, opacity: style.opacity, zIndex: style.zIndex };
    } else {
        data.filterBar = 'NOT FOUND';
    }

    // Map panel
    const mapPanel = document.getElementById('map-panel');
    if (mapPanel) {
        const rect = mapPanel.getBoundingClientRect();
        const style = window.getComputedStyle(mapPanel);
        data.mapPanel = { top: rect.top, left: rect.left, width: rect.width, height: rect.height, display: style.display, visibility: style.visibility, classes: mapPanel.className };
    } else {
        data.mapPanel = 'NOT FOUND';
    }

    // Map leaflet
    const mapLeaflet = document.getElementById('map-leaflet');
    if (mapLeaflet) {
        const rect = mapLeaflet.getBoundingClientRect();
        data.mapLeaflet = { width: rect.width, height: rect.height, isLeafletContainer: mapLeaflet.classList.contains('leaflet-container'), childCount: mapLeaflet.children.length };
    } else {
        data.mapLeaflet = 'NOT FOUND';
    }

    // Map placeholder
    const mapPlaceholder = document.getElementById('map-placeholder');
    data.mapPlaceholder = mapPlaceholder ? 'EXISTS' : 'REMOVED';

    // AI score badges
    const badges = document.querySelectorAll('.ai-score-badge');
    data.aiScoreBadges = Array.from(badges).slice(0, 3).map(b => ({ classes: b.className, text: b.textContent.trim() }));

    // Results count
    const count = document.getElementById('results-count');
    data.resultsCount = count ? count.textContent : 'NOT FOUND';

    return data;
});

console.log(JSON.stringify(results, null, 2));
await browser.close();
