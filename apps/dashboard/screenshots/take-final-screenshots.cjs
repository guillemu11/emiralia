const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname);

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });

  // Pages 1–3: standard captures
  const pages = [
    { url: 'http://localhost:4000/campaign-manager', filename: 'cm-final.png' },
    { url: 'http://localhost:4000/crm', filename: 'crm-final.png' },
    { url: 'http://localhost:4000/creative-studio', filename: 'cs-final.png' },
  ];

  for (const { url, filename } of pages) {
    const page = await context.newPage();
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    await page.close();
  }

  // Page 4: CRM with Pipeline tab active
  {
    const page = await context.newPage();
    console.log('Navigating to http://localhost:4000/crm for Pipeline tab...');
    await page.goto('http://localhost:4000/crm', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Click the Pipeline tab button
    const pipelineBtn = page.getByRole('button', { name: 'Pipeline' });
    await pipelineBtn.click();
    await page.waitForTimeout(1000);

    const filePath = path.join(SCREENSHOTS_DIR, 'crm-pipeline-final.png');
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
