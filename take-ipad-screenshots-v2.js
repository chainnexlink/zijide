const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshot(pageName, htmlFile) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // iPad dimensions: 2064x2752 at 2x scale = viewport 1032x1376
  await page.setViewport({
    width: 1032,
    height: 1376,
    deviceScaleFactor: 2
  });

  const filePath = path.resolve(__dirname, 'screenshot-pages', htmlFile);
  await page.goto(`file:///${filePath.replace(/\\/g, '/')}`, {
    waitUntil: 'networkidle0'
  });

  // Wait for rendering
  await new Promise(r => setTimeout(r, 500));

  const outputPath = path.resolve(__dirname, 'ipad-screenshots', `ipad-${pageName}.png`);
  await page.screenshot({
    path: outputPath,
    type: 'png'
  });

  console.log(`Screenshot saved: ${outputPath}`);
  
  // Verify dimensions
  const sharp = require('sharp');
  const meta = await sharp(outputPath).metadata();
  console.log(`Dimensions: ${meta.width}x${meta.height}`);

  await browser.close();
}

async function main() {
  const pages = [
    ['sos-home', 'sos-home.html'],
    ['home', 'home.html'],
    ['settings', 'settings.html'],
  ];

  for (const [name, file] of pages) {
    await takeScreenshot(name, file);
  }
  console.log('Done!');
}

main().catch(console.error);
