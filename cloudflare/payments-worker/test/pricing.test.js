import { describe, it, expect } from 'vitest';
import { chargeAmountCents } from '../src/index.js';

describe('chargeAmountCents', () => {
  it('charges value when no sale price', () => {
    expect(chargeAmountCents({ value: 100, price: null })).toBe(10000);
  });
  it('charges the sale price when present', () => {
    expect(chargeAmountCents({ value: 100, price: 80 })).toBe(8000);
  });
  it('treats price 0 as a real (free) charge, not a fallback', () => {
    expect(chargeAmountCents({ value: 100, price: 0 })).toBe(0);
  });
  it('rounds to whole cents', () => {
    expect(chargeAmountCents({ value: 19.99, price: null })).toBe(1999);
  });
});
