import { describe, it, expect } from 'vitest';
import { renderVoucherEmail, safeColor } from '../src/email.js';

const base = {
  customerName: 'Test User',
  voucherCode: 'UJ-AAAA-BBBB',
  value: 100,
  expiryDate: '2027-01-01',
  typeName: 'Gift Certificate',
  emailBody: null,
  termsConditions: null,
  giftFrom: null, giftTo: null, giftMessage: null,
};

describe('safeColor', () => {
  it('accepts a 6-digit hex', () => expect(safeColor('#12ab34')).toBe('#12ab34'));
  it('accepts a 3-digit hex', () => expect(safeColor('#1a2')).toBe('#1a2'));
  it('rejects junk and falls back to brand red', () => {
    expect(safeColor('red; } <script>')).toBe('#ae222a');
    expect(safeColor(null)).toBe('#ae222a');
    expect(safeColor('')).toBe('#ae222a');
  });
});

describe('renderVoucherEmail data-driven fields', () => {
  it('uses a custom voucher_label', () => {
    const html = renderVoucherEmail({ ...base, voucherLabel: 'Account Credit' });
    expect(html).toContain('Account Credit');
    expect(html).not.toContain('>Your Voucher<');
  });

  it('uses a validated accent colour and ignores an invalid one', () => {
    expect(renderVoucherEmail({ ...base, accentColor: '#123456' })).toContain('#123456');
    expect(renderVoucherEmail({ ...base, accentColor: 'evil;}' })).toContain('#ae222a');
  });

  it('renders the usage_info block only when provided', () => {
    expect(renderVoucherEmail({ ...base, usageInfo: 'Pool entry only.' })).toContain('Pool entry only.');
    expect(renderVoucherEmail({ ...base })).not.toContain('Pool entry only.');
  });

  it('honours the custom redemption_instructions', () => {
    expect(renderVoucherEmail({ ...base, redemptionInstructions: 'Show at the bar' })).toContain('Show at the bar');
  });

  it('hides the QR block when show_qr is false', () => {
    expect(renderVoucherEmail({ ...base, showQr: false })).not.toContain('api.qrserver.com');
    expect(renderVoucherEmail({ ...base, showQr: true })).toContain('api.qrserver.com');
  });

  it('hides the value block when show_value is false', () => {
    const hidden = renderVoucherEmail({ ...base, showValue: false });
    expect(hidden).not.toContain('>Value<');
  });
});
