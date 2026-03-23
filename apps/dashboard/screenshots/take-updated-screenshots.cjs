const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname);

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });

  const pages = [
    { url: 'http://localhost:4000/campaign-manager', filename: 'cm-updated.png' },
    { url: 'http://localhost:4000/crm', filename: 'crm-updated.png' },
    { url: 'http://localhost:4000/creative-studio', filename: 'cs-updated.png' },
  ];

  for (const { url, filename } of pages) {
    const page = await context.newPage();
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    // Wait 2 seconds for Vite hot-reload
    await page.waitForTimeout(2000);
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    await page.close();
  }

  await browser.close();
  console.log('All screenshots taken successfully.');
}

takeScreenshots().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
