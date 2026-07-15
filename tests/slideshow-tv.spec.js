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
