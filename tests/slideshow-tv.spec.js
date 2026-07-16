const { test, expect } = require('@playwright/test');
const path = require('path');

const SLIDESHOW = 'file://' + path.resolve(__dirname, '../slideshow/index.html').replace(/\\/g, '/');

test('slideshow page loads', async ({ page }) => {
  await page.goto(SLIDESHOW);
  await expect(page).toHaveTitle(/slideshow/i);
  // Staff path (no ?folder): the head gate must still emit the GSI script tag.
  await expect(page.locator('script[src*="accounts.google.com/gsi/client"]')).toHaveCount(1);
});

const fs = require('fs');
const PNG = fs.readFileSync(path.resolve(__dirname, 'fixtures/tv-slide.png'));
const TEST_FOLDER = 'TESTFOLDERID';

// Mock Drive so the test is hermetic (no network, no live folder).
async function mockDrive(page) {
  await page.route('**/www.googleapis.com/drive/v3/files**', (route) => {
    const url = route.request().url();
    // settings.txt probe -> empty; folder listing -> one image file
    const body = url.includes("settings.txt")
      ? { files: [] }
      : { files: [{ id: 'IMG1', name: '01_test.png', mimeType: 'image/png', description: '' }] };
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/drive.google.com/thumbnail**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  // Fail the test loudly if Google sign-in is ever requested in TV mode.
  await page.route('**/accounts.google.com/**', (route) =>
    route.fulfill({ status: 500, body: 'SIGN-IN SHOULD NOT HAPPEN IN TV MODE' }));
}

test('TV mode renders a public folder with no Google sign-in', async ({ page }) => {
  const gsiHits = [];
  page.on('request', (r) => { if (r.url().includes('accounts.google.com')) gsiHits.push(r.url()); });
  await mockDrive(page);
  await page.goto(`${SLIDESHOW}?folder=${TEST_FOLDER}&autostart=1`);
  // A slide becomes active without any interaction.
  await expect(page.locator('.slide-content.active')).toBeVisible({ timeout: 8000 });
  expect(gsiHits, 'no accounts.google.com requests in TV mode').toHaveLength(0);
});

// Mock a folder that contains a single, multi-table leaderboard slide. The live
// data endpoint is stubbed empty so the app uses its built-in fallback rows —
// keeps the test hermetic and gives content tall/wide enough to overflow a
// cast-sized viewport if the leaderboard is NOT scaled to fit.
async function mockDriveLeaderboard(page) {
  await page.route('**/www.googleapis.com/drive/v3/files**', (route) => {
    const url = route.request().url();
    if (url.includes('settings.txt') || url.includes('config.txt')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: [] }) });
    }
    const description = ['title: Test Speed', 'table: Male Opens', 'table: Female Opens'].join('\n');
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ files: [{ id: 'LB1', name: '01_leaderboard_speed.md', mimeType: 'text/markdown', description }] }),
    });
  });
  // Live leaderboard data: 14 'Official Speed' records -> each table shows the top 12
  // rows (default limit), giving the same tall layout the real gym folder produced.
  const records = Array.from({ length: 14 }, (_, i) => ({
    Name: `Climber ${i + 1}`, Time: (3 + i * 0.4).toFixed(3), Route: 'Official Speed', Gender: '',
  }));
  await page.route('**/script.google.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: records }) }));
  await page.route('**/accounts.google.com/**', (route) =>
    route.fulfill({ status: 500, body: 'SIGN-IN SHOULD NOT HAPPEN IN TV MODE' }));
}

// Regression: leaderboard slides are authored on a fixed 1920x1080 canvas. On a
// cast receiver's smaller logical viewport (e.g. 1280x720) the un-scaled content
// overflowed and looked "way too big" / clipped on the gym TVs. The leaderboard
// must scale to fit whatever viewport it renders in.
test('TV mode leaderboard scales to fit a small (cast) viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await mockDriveLeaderboard(page);
  await page.goto(`${SLIDESHOW}?folder=${TEST_FOLDER}&autostart=1`);
  await expect(page.locator('.leaderboard-container')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600); // let live-data fallback + layout settle

  const box = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.leaderboard-title, .leaderboard-category')];
    if (!els.length) return null;
    let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      top = Math.min(top, r.top); left = Math.min(left, r.left);
      right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
    }
    return { top, left, right, bottom, vw: window.innerWidth, vh: window.innerHeight };
  });

  expect(box, 'leaderboard content rendered').not.toBeNull();
  const tol = 2; // sub-pixel rounding
  expect(box.top, 'top edge within viewport').toBeGreaterThanOrEqual(-tol);
  expect(box.left, 'left edge within viewport').toBeGreaterThanOrEqual(-tol);
  expect(box.bottom, 'bottom edge within viewport').toBeLessThanOrEqual(box.vh + tol);
  expect(box.right, 'right edge within viewport').toBeLessThanOrEqual(box.vw + tol);
});
