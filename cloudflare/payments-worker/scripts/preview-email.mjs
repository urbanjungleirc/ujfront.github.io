// Local preview harness for the voucher email template.
// Renders sample voucher emails to standalone HTML files so the design can be
// reviewed in a browser without deploying the Worker or sending real email.
//
//   node scripts/preview-email.mjs
//
// Output: <tmp>/voucher-email-preview/*.html  (path printed on run)

import { renderVoucherEmail } from '../src/email.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const outDir = join(tmpdir(), 'voucher-email-preview');
mkdirSync(outDir, { recursive: true });

const SAMPLE_TERMS = `# Terms and Conditions
- Valid for 36 months from the date of issue.
- Not redeemable for cash and no change given.
- Present this voucher (printed or on a phone) at the front desk.
- **Lost or stolen vouchers cannot be replaced.**`;

const scenarios = [
  {
    file: 'gift-voucher.html',
    label: 'Gift voucher (from/to/message, default acknowledgement)',
    data: {
      customerName: 'Sarah Chen',
      voucherCode: 'UJ-7K4M-9XQP',
      value: 100,
      expiryDate: '2027-06-22',
      typeName: 'Gift Certificate',
      emailBody: null,
      termsConditions: SAMPLE_TERMS,
      giftFrom: 'Sarah',
      giftTo: 'Dad',
      giftMessage: 'Happy birthday! Time to finally try that overhang. Love you x',
    },
  },
  {
    file: 'self-purchase.html',
    label: 'Self purchase (no gift, default acknowledgement)',
    data: {
      customerName: 'Marcus Webb',
      voucherCode: 'UJ-2H8T-PR5N',
      value: 50,
      expiryDate: '2027-06-22',
      typeName: 'Gift Certificate',
      emailBody: null,
      termsConditions: SAMPLE_TERMS,
      giftFrom: null,
      giftTo: null,
      giftMessage: null,
    },
  },
  {
    file: 'custom-body.html',
    label: 'Per-type acknowledgement via email_body (Markdown) — the F4 credits pattern',
    data: {
      customerName: 'Priya Nair',
      voucherCode: 'UJ-QW3E-RT6Y',
      value: 80,
      expiryDate: null,
      typeName: 'Open Pass',
      emailBody: `Thanks for grabbing an **Open Pass**, Priya!

This pass covers entry for the group below. A few things to know:
- Bring closed-toe shoes — we hire out climbing shoes at the desk.
- First-timers complete a quick safety briefing on arrival.

See you on the wall!`,
      termsConditions: SAMPLE_TERMS,
      giftFrom: null,
      giftTo: null,
      giftMessage: null,
    },
  },
  {
    file: 'account-credit.html',
    label: 'Account credit (data-driven branding, usage info, no gift)',
    data: {
      customerName: 'Jordan Lee',
      voucherCode: 'UJ-CR3D-1T00',
      value: 60,
      expiryDate: '2027-06-22',
      typeName: 'Account Credit',
      emailBody: 'This credit has been added to your Urban Jungle account. Quote the code below at the front desk to use it.',
      termsConditions: '# Terms and Conditions\n- Valid for 12 months from issue.\n- Not redeemable for cash.',
      giftFrom: null,
      giftTo: null,
      giftMessage: null,
      accentColor: '#2f6f4f',
      voucherLabel: 'Account Credit',
      redemptionInstructions: 'Quote this code at the front desk',
      usageInfo: 'Usable towards entry, gear hire, and retail. Not valid for cafe or membership dues.',
      showQr: true,
      showValue: true,
    },
  },
];

const index = ['<!doctype html><meta charset=utf-8><title>Voucher email previews</title>',
  '<body style="font-family:Arial;padding:24px;background:#fff;">',
  '<h1>Voucher email previews</h1><ul>'];

for (const s of scenarios) {
  const html = renderVoucherEmail(s.data);
  writeFileSync(join(outDir, s.file), html);
  index.push(`<li><a href="./${s.file}">${s.label}</a></li>`);
  console.log(`✓ ${s.file}  —  ${s.label}`);
}

index.push('</ul></body>');
writeFileSync(join(outDir, 'index.html'), index.join('\n'));

console.log(`\nPreviews written to: ${outDir}`);
console.log(`Open: ${join(outDir, 'index.html')}`);
