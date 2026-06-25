import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';

const ENV = { STAFF_SHARED_SECRET: 'test-secret' };

function previewReq(draft, { secret = 'test-secret' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (secret !== null) headers['X-Staff-Secret'] = secret;
  return new Request('https://worker.example.com/v1/staff/voucher-types/preview', {
    method: 'POST',
    headers,
    body: JSON.stringify(draft),
  });
}

describe('POST /v1/staff/voucher-types/preview', () => {
  it('returns rendered HTML for a draft type', async () => {
    const res = await worker.fetch(previewReq({
      display_name: 'Account Credit',
      voucher_label: 'Account Credit',
      email_body: 'Your credit is worth {{value}}.',
      usage_info: 'Covers entry and gear hire.',
      accent_color: '#2f6f4f',
      show_qr: true,
      show_value: true,
    }), ENV);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('Account Credit');        // voucher_label drives the ticket label
    expect(html).toContain('Covers entry and gear hire.'); // usage_info renders
    expect(html).toContain('$100.00');               // {{value}} resolves against SAMPLE value
    expect(html).not.toContain('{{');                // tokens substituted, none survive
    expect(html).not.toContain('}}');
  });

  it('overrides the sample per-voucher data with `_sample` (staff create-form preview)', async () => {
    const res = await worker.fetch(previewReq({
      display_name: 'Gift Voucher',
      email_body: 'Hi {{name}}, your voucher is worth {{value}}.',
      show_value: true,
      _sample: { customerName: 'Jordan Reyes', value: 250, giftFrom: 'Mum', giftTo: 'Jordan' },
    }), ENV);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Jordan Reyes');   // overridden name
    expect(html).toContain('$250.00');         // overridden value
    expect(html).toContain('Mum');             // gift rows render from override
    expect(html).not.toContain('Sarah Chen');  // built-in sample name is replaced
  });

  it('rejects a request with no staff secret (401)', async () => {
    const res = await worker.fetch(previewReq({ display_name: 'X' }, { secret: null }), ENV);
    expect(res.status).toBe(401);
  });

  it('rejects a request with a wrong staff secret (401)', async () => {
    const res = await worker.fetch(previewReq({ display_name: 'X' }, { secret: 'nope' }), ENV);
    expect(res.status).toBe(401);
  });
});
