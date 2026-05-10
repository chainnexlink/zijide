const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const SESSION_DATA = JSON.stringify({
  access_token: "eyJhbGciOiJFUzI1NiIsImtpZCI6IjVjN2ZmOGI3LWU3YWUtNGI4ZS1iY2E2LTY2YzNlYmZiNjM0MiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1cm93anFtam9mcGl0c21saG1nLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNjAzMjNhYi0zZjIyLTRiZDgtYmJiNy1iYTAyZTVmNGI2YmUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc3OTgxMzAyLCJpYXQiOjE3Nzc5Nzc3MDIsImVtYWlsIjoicmV2aWV3ZXJAd2FycmVzY3VlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJyZXZpZXdlckB3YXJyZXNjdWUuY29tIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImI2MDMyM2FiLTNmMjItNGJkOC1iYmI3LWJhMDJlNWY0YjZiZSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc3OTc3NzAyfV0sInNlc3Npb25faWQiOiI4MGQwZTkxZC1kMGY0LTQzZmQtYmIzZi1mMDhmMmRlZTE4M2IiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.IupvH8BAxbb53wZ1mOs5K6WLRj9FUpfaYa6fcKS84FxG5wbcbzkl_fZraxT6rKVwSA1awaAIvVPoCQzshxiNqA",
  refresh_token: "4gwyenf5bnxy",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 1777981302,
  user: { id: "b60323ab-3f22-4bd8-bbb7-ba02e5f4b6be", email: "reviewer@warrescue.com", role: "authenticated", aud: "authenticated", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { email: "reviewer@warrescue.com" } }
});

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  // 2064x2752 output: viewport 1032x1376 with scale 2
  await page.setViewport({ width: 1032, height: 1376, deviceScaleFactor: 2 });

  const baseUrl = 'http://localhost:3267';
  const outputDir = path.join(__dirname, 'ipad-screenshots');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  console.log('Setting up session...');
  await page.evaluateOnNewDocument(() => {
    window.__REACT_ERROR_OVERLAY_GLOBAL_HOOK__ = { iframeReady: () => {} };
    window.addEventListener('unhandledrejection', (e) => { e.preventDefault(); });
    window.addEventListener('error', (e) => { e.preventDefault(); });
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((session) => {
    localStorage.setItem('sb-aurowjqmjofpitsmlhmg-auth-token', session);
  }, SESSION_DATA);
  await delay(500);

  await page.goto(baseUrl + '/#/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(3000);
  console.log('URL after session:', page.url());

  if (page.url().includes('/auth') || page.url().endsWith('/#/')) {
    console.log('Session not working, using demo mode...');
    await page.evaluate(() => {
      localStorage.setItem('demo_mode', 'true');
      localStorage.setItem('demo_expires', String(Date.now() + 7*24*60*60*1000));
    });
    await page.goto(baseUrl + '/#/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    console.log('After demo mode:', page.url());
  }

  const pagesToCapture = [
    { name: 'dashboard', hash: '#/dashboard' },
    { name: 'shelters', hash: '#/shelters' },
    { name: 'settings', hash: '#/settings' },
    { name: 'sos', hash: '#/sos-history' },
    { name: 'subscription', hash: '#/subscription' },
  ];

  for (const p of pagesToCapture) {
    console.log('Capturing', p.name, '...');
    await page.goto(baseUrl + '/' + p.hash, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    // Remove webpack error overlay
    await page.evaluate(() => {
      const overlay = document.querySelector('#webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
      const overlayFrame = document.querySelector('iframe[src*="overlay"]');
      if (overlayFrame) overlayFrame.remove();
      document.querySelectorAll('[id*="overlay"], [class*="overlay"]').forEach(el => {
        if (el.style && (el.style.position === 'fixed' || el.style.position === 'absolute')) el.remove();
      });
      document.querySelectorAll('body > div').forEach(el => {
        if (el.shadowRoot || (el.style.position === 'fixed' && el.style.zIndex > 9000)) el.remove();
      });
    });
    await delay(300);

    await page.screenshot({
      path: path.join(outputDir, 'ipad-' + p.name + '.png'),
      clip: { x: 0, y: 0, width: 1032, height: 1376 }
    });
    console.log('  saved:', p.name, '(2064x2752)');
  }

  await browser.close();
  console.log('\nAll screenshots in:', outputDir);
  console.log('Size: 2064x2752px');
})();
