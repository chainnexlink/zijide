const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_ICON = path.join(__dirname, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/Icon-1024.png');
const SOURCE_SPLASH = path.join(__dirname, 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png');
const ANDROID_RES = path.join(__dirname, 'android/app/src/main/res');

// Android mipmap icon sizes
const ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Adaptive icon foreground sizes (with padding - 108dp)
const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

// Splash screen sizes for common Android devices
const SPLASH_SIZES = {
  'drawable': { w: 480, h: 800 },
  'drawable-land': { w: 800, h: 480 },
  'drawable-hdpi': { w: 720, h: 1280 },
  'drawable-land-hdpi': { w: 1280, h: 720 },
  'drawable-xhdpi': { w: 1080, h: 1920 },
  'drawable-land-xhdpi': { w: 1920, h: 1080 },
  'drawable-xxhdpi': { w: 1440, h: 2560 },
  'drawable-land-xxhdpi': { w: 2560, h: 1440 },
  'drawable-xxxhdpi': { w: 1440, h: 2560 },
  'drawable-land-xxxhdpi': { w: 2560, h: 1440 },
};

async function generateIcons() {
  console.log('Generating Android icons...');

  for (const [folder, size] of Object.entries(ICON_SIZES)) {
    const outDir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(outDir, { recursive: true });

    // Standard icon
    await sharp(SOURCE_ICON)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, 'ic_launcher.png'));

    // Round icon
    const roundedMask = Buffer.from(
      `<svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
      </svg>`
    );
    const iconBuffer = await sharp(SOURCE_ICON).resize(size, size).png().toBuffer();
    await sharp(iconBuffer)
      .composite([{ input: roundedMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(outDir, 'ic_launcher_round.png'));

    console.log(`  ${folder}: ${size}x${size} - done`);
  }

  // Generate adaptive icon foreground
  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const outDir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(outDir, { recursive: true });

    // Create foreground with padding (icon at 66% of total size, centered)
    const iconSize = Math.round(size * 0.66);
    const padding = Math.round((size - iconSize) / 2);

    const resizedIcon = await sharp(SOURCE_ICON).resize(iconSize, iconSize).png().toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: resizedIcon, left: padding, top: padding }])
      .png()
      .toFile(path.join(outDir, 'ic_launcher_foreground.png'));
  }
  console.log('  Adaptive foreground icons - done');

  // Generate splash screens
  console.log('Generating splash screens...');
  for (const [folder, dims] of Object.entries(SPLASH_SIZES)) {
    const outDir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(outDir, { recursive: true });

    await sharp(SOURCE_SPLASH)
      .resize(dims.w, dims.h, { fit: 'cover' })
      .png()
      .toFile(path.join(outDir, 'splash.png'));

    console.log(`  ${folder}: ${dims.w}x${dims.h} - done`);
  }

  console.log('\nAll Android assets generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
