const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = 'C:/Users/gmunoz02/Desktop/emiralia/apps/dashboard/screenshots';

const routes = [
  { url: 'http://localhost:4000/campaign-manager', file: 'cm-route1.png', label: '/campaign-manager' },
  { url: 'http://localhost:4000/campaigns', file: 'cm-route2.png', label: '/campaigns' },
  { url: 'http://localhost:4000/#/campaign-manager', file: 'cm-route3.png', label: '#/campaign-manager' },
  { url: 'http://localhost:4000/#/campaigns', file: 'cm-route4.png', label: '#/campaigns' },
];

async function getPageContentLength(page) {
  return await page.evaluate(() => document.body.innerText.trim().length);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });

  const results = [];

  // Campaign Manager routes
  for (const route of routes) {
    const page = await context.newPage();
    try {
      console.log(`Navigating to ${route.url}...`);
      await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      const contentLen = await getPageContentLength(page);
      const screenshotPath = path.join(SCREENSHOTS_DIR, route.file);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      results.push({ url: route.url, label: route.label, file: screenshotPath, contentLength: contentLen, hasContent: contentLen > 100 });
      console.log(`  -> ${route.file} (content length: ${contentLen})`);
    } catch (err) {
      console.error(`  -> ERROR: ${err.message}`);
      results.push({ url: route.url, label: route.label, file: null, error: err.message, hasContent: false });
    } finally {
      await page.close();
    }
  }

  // CRM main
  {
    const page = await context.newPage();
    try {
      console.log('Navigating to http://localhost:4000/crm...');
      await page.goto('http://localhost:4000/crm', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      const contentLen = await getPageContentLength(page);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'crm-main-mobile.png'), fullPage: false });
      console.log(`  -> crm-main-mobile.png (content length: ${contentLen})`);
      results.push({ url: '/crm', label: '/crm main', file: path.join(SCREENSHOTS_DIR, 'crm-main-mobile.png'), contentLength: contentLen, hasContent: contentLen > 100 });

      // Try to click Pipeline tab
      const pipelineTab = await page.$('button:has-text("Pipeline"), [data-tab="pipeline"], a:has-text("Pipeline")');
      if (pipelineTab) {
        await pipelineTab.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'crm-pipeline-mobile.png'), fullPage: false });
        console.log('  -> crm-pipeline-mobile.png (Pipeline tab clicked)');
        results.push({ url: '/crm#pipeline', label: 'CRM Pipeline tab', file: path.join(SCREENSHOTS_DIR, 'crm-pipeline-mobile.png'), hasContent: true });
      } else {
        // Try finding any tab-like elements
        const tabs = await page.$$('button, [role="tab"]');
        console.log(`  -> Found ${tabs.length} buttons/tabs on CRM page`);
        let pipelineFound = false;
        for (const tab of tabs) {
          const text = await tab.innerText().catch(() => '');
          console.log(`     Tab text: "${text}"`);
          if (text.toLowerCase().includes('pipeline')) {
            await tab.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'crm-pipeline-mobile.png'), fullPage: false });
            console.log('  -> crm-pipeline-mobile.png (Pipeline tab found and clicked)');
            results.push({ url: '/crm#pipeline', label: 'CRM Pipeline tab', file: path.join(SCREENSHOTS_DIR, 'crm-pipeline-mobile.png'), hasContent: true });
            pipelineFound = true;
            break;
          }
        }
        if (!pipelineFound) {
          console.log('  -> Pipeline tab not found, saving full page scroll screenshot');
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'crm-pipeline-mobile.png'), fullPage: true });
          results.push({ url: '/crm (full page)', label: 'CRM full page (Pipeline not found)', file: path.join(SCREENSHOTS_DIR, 'crm-pipeline-mobile.png'), hasContent: contentLen > 100 });
        }
      }
    } catch (err) {
      console.error(`  -> ERROR: ${err.message}`);
      results.push({ url: '/crm', label: '/crm', file: null, error: err.message, hasContent: false });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n=== RESULTS SUMMARY ===');
  for (const r of results) {
    const status = r.hasContent ? 'HAS CONTENT' : 'BLANK/EMPTY';
    console.log(`[${status}] ${r.label} -> ${r.file || 'ERROR: ' + r.error}`);
  }
})();
