const { test, expect } = require('@playwright/test');
const path = require('path');

const SLIDESHOW = 'file://' + path.resolve(__dirname, '../slideshow/index.html').replace(/\\/g, '/');

test('slideshow page loads', async ({ page }) => {
  await page.goto(SLIDESHOW);
  await expect(page).toHaveTitle(/slideshow/i);
});
