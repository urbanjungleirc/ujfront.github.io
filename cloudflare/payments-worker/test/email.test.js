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

describe('renderVoucherEmail token substitution', () => {
  it('substitutes tokens in email_body and leaves no braces', () => {
    const html = renderVoucherEmail({ ...base, emailBody: 'Code {{voucher_id}}, value {{value}}' });
    expect(html).toContain('UJ-AAAA-BBBB');
    expect(html).toContain('$100.00');
    expect(html).not.toContain('{{');
    expect(html).not.toContain('}}');
  });

  it('falls back {{item_name}} to the type name when itemName is absent', () => {
    const html = renderVoucherEmail({ ...base, emailBody: 'Deal: {{item_name}}' });
    expect(html).toContain('Deal: Gift Certificate');
  });

  it('uses itemName for {{item_name}} when provided', () => {
    const html = renderVoucherEmail({ ...base, itemName: '2 adults, 2 children', emailBody: 'Deal: {{item_name}}' });
    expect(html).toContain('2 adults, 2 children');
  });

  it('escapes a token value containing HTML characters', () => {
    const html = renderVoucherEmail({ ...base, customerName: 'A<b>&', emailBody: 'Hi {{name}}' });
    expect(html).toContain('A&lt;b&gt;&amp;');
    expect(html).not.toContain('A<b>&');
  });

  it('strips an unrecognised token in email_body', () => {
    const html = renderVoucherEmail({ ...base, emailBody: 'x{{bogus}}y' });
    expect(html).toContain('xy');
    expect(html).not.toContain('{{bogus}}');
  });

  it('substitutes tokens in usage_info', () => {
    const html = renderVoucherEmail({ ...base, usageInfo: 'Worth {{value}}.' });
    expect(html).toContain('Worth $100.00.');
  });

  it('substitutes tokens in terms_conditions and leaves no braces', () => {
    const html = renderVoucherEmail({ ...base, termsConditions: 'Valid for {{value}} until {{expiry_date}}.' });
    expect(html).toContain('$100.00');
    expect(html).not.toContain('{{');
    expect(html).not.toContain('}}');
  });

  it('substitutes tokens in redemption_instructions', () => {
    const html = renderVoucherEmail({ ...base, redemptionInstructions: 'Quote {{voucher_id}} at the desk' });
    expect(html).toContain('UJ-AAAA-BBBB');
    expect(html).not.toContain('{{');
    expect(html).not.toContain('}}');
  });

  it('redemption_instructions escapes an HTML-special substituted value', () => {
    const html = renderVoucherEmail({ ...base, customerName: 'A<b>&', redemptionInstructions: 'Hi {{name}}' });
    expect(html).toContain('A&lt;b&gt;&amp;');
    expect(html).not.toContain('A<b>&');
  });
});
