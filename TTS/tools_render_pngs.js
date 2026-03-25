const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');

const DEFAULT_SVG_DIR = path.resolve(__dirname, 'assets/svg');
const DEFAULT_PNG_DIR = path.resolve(__dirname, 'assets/png');

function parseDimensions(svgText, fileName) {
  const widthMatch = svgText.match(/\bwidth="([\d.]+)"/i);
  const heightMatch = svgText.match(/\bheight="([\d.]+)"/i);

  if (widthMatch && heightMatch) {
    return {
      width: Math.round(Number(widthMatch[1])),
      height: Math.round(Number(heightMatch[1])),
    };
  }

  const viewBoxMatch = svgText.match(/\bviewBox="[^"]*?([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)"/i);
  if (viewBoxMatch) {
    return {
      width: Math.round(Number(viewBoxMatch[3])),
      height: Math.round(Number(viewBoxMatch[4])),
    };
  }

  throw new Error(`Could not determine dimensions for ${fileName}`);
}

async function renderSvg(browser, inputPath, outputPath) {
  const svgText = await fs.readFile(inputPath, 'utf8');
  const { width, height } = parseDimensions(svgText, inputPath);
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  try {
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svgText}</body></html>`,
      { waitUntil: 'load' },
    );
    const svg = await page.locator('svg').first();
    await svg.screenshot({
      path: outputPath,
      omitBackground: false,
    });
  } finally {
    await page.close();
  }
}

async function main() {
  const svgDir = path.resolve(process.argv[2] || DEFAULT_SVG_DIR);
  const pngDir = path.resolve(process.argv[3] || DEFAULT_PNG_DIR);

  await fs.mkdir(pngDir, { recursive: true });

  const entries = await fs.readdir(svgDir, { withFileTypes: true });
  const svgFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
    .map((entry) => entry.name)
    .sort();

  const browser = await chromium.launch({ headless: true });
  try {
    for (const fileName of svgFiles) {
      const inputPath = path.join(svgDir, fileName);
      const outputPath = path.join(pngDir, fileName.replace(/\.svg$/i, '.png'));
      await renderSvg(browser, inputPath, outputPath);
      process.stdout.write(`rendered ${path.basename(outputPath)}\n`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
