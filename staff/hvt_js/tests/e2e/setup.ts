import { test as base } from '@playwright/test'

/**
 * E2E test fixtures and setup
 * Extends Playwright's base test with custom fixtures
 */

export const test = base.extend({
  // Add custom fixtures here as needed
  // Example: authenticated user session, test data, etc.
})

export { expect } from '@playwright/test'
