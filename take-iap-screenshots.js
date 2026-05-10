const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = 'C:\\Users\\Administrator\\Desktop\\screenshots\\iap';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });

  // Set demo mode and load
  await page.goto('http://localhost:3267/#/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1000);
  await page.evaluate(() => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('demo_expires', String(Date.now() + 3600000));
  });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);

  // Go to subscription page
  await page.evaluate(() => { window.location.hash = '#/subscription'; });
  await sleep(3000);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Find all subscribe buttons
  const buttons = await page.$$('button');
  let subscribeButtons = [];
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.trim() === '\u8ba2\u9605') {
      subscribeButtons.push(btn);
    }
  }
  console.log('Found', subscribeButtons.length, 'subscribe buttons');

  // Click Personal plan subscribe button (first one)
  if (subscribeButtons.length >= 1) {
    await page.evaluate(() => {
      const cards = document.querySelectorAll('div[class*="bg-slate-800"][class*="rounded-2xl"][class*="border"]');
      if (cards[0]) cards[0].scrollIntoView({ block: 'center' });
    });
    await sleep(300);

    await subscribeButtons[0].click();
    await sleep(1500);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'iap_review_personal.png'),
      fullPage: false
    });
    console.log('Personal plan screenshot taken');
  }

  // Reload to reset state for Family plan
  await page.evaluate(() => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('demo_expires', String(Date.now() + 3600000));
  });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  await page.evaluate(() => { window.location.hash = '#/subscription'; });
  await sleep(3000);

  // Find buttons again after reload
  const buttons2 = await page.$$('button');
  let subscribeButtons2 = [];
  for (const btn of buttons2) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.trim() === '\u8ba2\u9605') {
      subscribeButtons2.push(btn);
    }
  }

  // Click Family plan subscribe button (second one)
  if (subscribeButtons2.length >= 2) {
    await page.evaluate(() => {
      const cards = document.querySelectorAll('div[class*="bg-slate-800"][class*="rounded-2xl"][class*="border"]');
      if (cards[1]) cards[1].scrollIntoView({ block: 'center' });
    });
    await sleep(300);

    await subscribeButtons2[1].click();
    await sleep(1500);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'iap_review_family.png'),
      fullPage: false
    });
    console.log('Family plan screenshot taken');
  }

  console.log('\nDone! Files:');
  const files = fs.readdirSync(OUTPUT_DIR);
  files.forEach(f => {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(' -', f, '(' + Math.round(stat.size/1024) + 'KB)');
  });

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
