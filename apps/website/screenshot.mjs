import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5173';
const PAGE = process.argv[3] || '/propiedades.html';
const OUT_DIR = '../../tmp';

async function takeScreenshots() {
    const browser = await chromium.launch();

    // Desktop
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopCtx.newPage();
    await desktopPage.goto(`${BASE}${PAGE}`, { waitUntil: 'networkidle', timeout: 15000 });
    await desktopPage.waitForTimeout(2500);
    await desktopPage.screenshot({ path: `${OUT_DIR}/propiedades-desktop.png`, fullPage: false });
    console.log('Desktop screenshot saved');

    // Mobile (iPhone 14 size)
    const mobileCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const mobilePage = await mobileCtx.newPage();
    await mobilePage.goto(`${BASE}${PAGE}`, { waitUntil: 'networkidle', timeout: 15000 });
    await mobilePage.waitForTimeout(2500);
    await mobilePage.screenshot({ path: `${OUT_DIR}/propiedades-mobile.png`, fullPage: false });
    console.log('Mobile screenshot saved');

    await browser.close();
}

takeScreenshots().catch(console.error);
