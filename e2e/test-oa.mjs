import { chromium } from '/home/rhonin/oa/node_modules/.pnpm/playwright@1.59.1/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.goto('http://localhost:5173');
await page.waitForTimeout(3000);

const title = await page.title();
const h1 = await page.locator('h1').first().innerText().catch(() => 'none');
const bodyText = await page.locator('body').innerText();

const apiResp = await page.request.get('http://localhost:3000/api/projects', {
  headers: { 'x-user-id': 'u1' }
});
const apiStatus = apiResp.status();
const apiBody = await apiResp.text().catch(() => 'N/A');

console.log('=== RESULTS ===');
console.log('Title:', title);
console.log('H1:', h1);
console.log('Body (300):', bodyText.slice(0, 300));
console.log('Console errors:', errors.slice(0, 5));
console.log('API status:', apiStatus);
console.log('API body (500):', apiBody.slice(0, 500));

await browser.close();
