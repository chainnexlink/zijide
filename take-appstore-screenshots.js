const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// App Store: iPhone 6.5" = 1242 x 2688px
const IPHONE_WIDTH = 1242;
const IPHONE_HEIGHT = 2688;
const VP_WIDTH = 414;
const VP_HEIGHT = 896;
const SCALE = 3;
const STATUS_BAR_PX = 132;

const OUTPUT_DIR = 'C:\\Users\\Administrator\\Desktop\\screenshots\\AppStore_6.5';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function createStatusBarSVG() {
  const w = IPHONE_WIDTH;
  const h = STATUS_BAR_PX;
  const notchW = 210;
  const notchH = 90;
  const notchX = (w - notchW) / 2;
  const notchR = 24;

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .time { font: bold 51px -apple-system, SF Pro Text, sans-serif; fill: white; }
      </style>
    </defs>
    <rect width="${w}" height="${h}" fill="rgba(15,23,42,0.95)"/>
    <rect x="${notchX}" y="0" width="${notchW}" height="${notchH}" rx="${notchR}" ry="${notchR}" fill="black"/>
    <text x="90" y="93" class="time">9:41</text>
    <rect x="${w - 330}" y="66" width="9" height="18" rx="2" fill="white"/>
    <rect x="${w - 318}" y="60" width="9" height="24" rx="2" fill="white"/>
    <rect x="${w - 306}" y="54" width="9" height="30" rx="2" fill="white"/>
    <rect x="${w - 294}" y="48" width="9" height="36" rx="2" fill="white"/>
    <path d="M${w - 264} 63 Q${w - 243} 45 ${w - 222} 63" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path d="M${w - 258} 72 Q${w - 243} 57 ${w - 228} 72" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path d="M${w - 252} 81 Q${w - 243} 69 ${w - 234} 81" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <circle cx="${w - 243}" cy="84" r="5" fill="white"/>
    <rect x="${w - 186}" y="57" width="72" height="33" rx="6" stroke="white" stroke-width="3" fill="none"/>
    <rect x="${w - 180}" y="63" width="54" height="21" rx="3" fill="white"/>
    <rect x="${w - 111}" y="69" width="6" height="12" rx="3" fill="white"/>
  </svg>`;
}

async function captureWithStatusBar(page, statusBarBuffer, outputPath) {
  const rawScreenshot = await page.screenshot();
  const finalImage = await sharp(rawScreenshot)
    .resize(IPHONE_WIDTH, IPHONE_HEIGHT)
    .composite([
      { input: statusBarBuffer, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
  fs.writeFileSync(outputPath, finalImage);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: VP_WIDTH, height: VP_HEIGHT, deviceScaleFactor: SCALE });

  // Load app and set demo mode
  await page.goto('http://localhost:3267/#/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1000);
  await page.evaluate(() => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('demo_expires', String(Date.now() + 3600000));
  });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  const statusBarSVG = createStatusBarSVG();
  const statusBarBuffer = await sharp(Buffer.from(statusBarSVG)).png().toBuffer();

  // Dashboard page has its own bottom tab bar and no WebLayout wrapper issue
  // The pages with bottom nav are: dashboard (has its own), shelters (via WebLayout but own fixed nav)
  // Let me capture by removing the WebLayout top header first

  // Hide WebLayout's top header and sidebar for cleaner screenshots
  await page.evaluate(() => { window.location.hash = '#/dashboard'; });
  await sleep(2500);

  // Dashboard already has its own layout with bottom nav - hide WebLayout header
  await page.evaluate(() => {
    // Hide the WebLayout sticky header (first header in the flex container)
    const headers = document.querySelectorAll('header');
    headers.forEach(h => {
      if (h.querySelector('button[class*="lg:hidden"]') || h.querySelector('button[class*="xl:hidden"]')) {
        h.style.display = 'none';
      }
    });
    // Hide sidebar
    const aside = document.querySelector('aside');
    if (aside) aside.style.display = 'none';
  });
  await sleep(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  await captureWithStatusBar(page, statusBarBuffer, path.join(OUTPUT_DIR, '01_dashboard.png'));
  console.log('Captured: 01_dashboard');

  // Shelters page
  await page.evaluate(() => { window.location.hash = '#/shelters'; });
  await sleep(2500);
  await page.evaluate(() => {
    const headers = document.querySelectorAll('header');
    headers.forEach(h => {
      if (h.querySelector('button[class*="lg:hidden"]') || h.querySelector('button[class*="xl:hidden"]')) {
        h.style.display = 'none';
      }
    });
    const aside = document.querySelector('aside');
    if (aside) aside.style.display = 'none';
  });
  await sleep(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  await captureWithStatusBar(page, statusBarBuffer, path.join(OUTPUT_DIR, '05_shelters.png'));
  console.log('Captured: 05_shelters');

  // Settings page
  await page.evaluate(() => { window.location.hash = '#/settings'; });
  await sleep(2500);
  await page.evaluate(() => {
    const headers = document.querySelectorAll('header');
    headers.forEach(h => {
      if (h.querySelector('button[class*="lg:hidden"]') || h.querySelector('button[class*="xl:hidden"]')) {
        h.style.display = 'none';
      }
    });
    const aside = document.querySelector('aside');
    if (aside) aside.style.display = 'none';
  });
  await sleep(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  await captureWithStatusBar(page, statusBarBuffer, path.join(OUTPUT_DIR, '04_settings.png'));
  console.log('Captured: 04_settings');

  // Subscription page
  await page.evaluate(() => { window.location.hash = '#/subscription'; });
  await sleep(2500);
  await page.evaluate(() => {
    const headers = document.querySelectorAll('header');
    headers.forEach(h => {
      if (h.querySelector('button[class*="lg:hidden"]') || h.querySelector('button[class*="xl:hidden"]')) {
        h.style.display = 'none';
      }
    });
    const aside = document.querySelector('aside');
    if (aside) aside.style.display = 'none';
  });
  await sleep(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  await captureWithStatusBar(page, statusBarBuffer, path.join(OUTPUT_DIR, '03_subscription.png'));
  console.log('Captured: 03_subscription');

  // Alert History page
  await page.evaluate(() => { window.location.hash = '#/alert-history'; });
  await sleep(2500);
  await page.evaluate(() => {
    const headers = document.querySelectorAll('header');
    headers.forEach(h => {
      if (h.querySelector('button[class*="lg:hidden"]') || h.querySelector('button[class*="xl:hidden"]')) {
        h.style.display = 'none';
      }
    });
    const aside = document.querySelector('aside');
    if (aside) aside.style.display = 'none';
  });
  await sleep(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  await captureWithStatusBar(page, statusBarBuffer, path.join(OUTPUT_DIR, '02_alert-history.png'));
  console.log('Captured: 02_alert-history');

  // Simulation page
  await page.evaluate(() => { window.location.hash = '#/simulation'; });
  await sleep(2500);
  await page.evaluate(() => {
    const headers = document.querySelectorAll('header');
    headers.forEach(h => {
      if (h.querySelector('button[class*="lg:hidden"]') || h.querySelector('button[class*="xl:hidden"]')) {
        h.style.display = 'none';
      }
    });
    const aside = document.querySelector('aside');
    if (aside) aside.style.display = 'none';
  });
  await sleep(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  await captureWithStatusBar(page, statusBarBuffer, path.join(OUTPUT_DIR, '06_simulation.png'));
  console.log('Captured: 06_simulation');

  // Login page (no demo mode)
  await page.evaluate(() => {
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('demo_expires');
  });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  await page.evaluate(() => { window.location.hash = '#/auth'; });
  await sleep(2000);

  await captureWithStatusBar(page, statusBarBuffer, path.join(OUTPUT_DIR, '00_login.png'));
  console.log('Captured: 00_login');

  // Verify
  const meta = await sharp(path.join(OUTPUT_DIR, '01_dashboard.png')).metadata();
  console.log('\nDimensions:', meta.width, 'x', meta.height);

  console.log('\nAll screenshots saved to:', OUTPUT_DIR);
  const files = fs.readdirSync(OUTPUT_DIR).sort();
  files.forEach(f => {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(' - ' + f + ' (' + Math.round(stat.size/1024) + 'KB)');
  });

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
