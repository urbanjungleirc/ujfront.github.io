// ════════════════════════════════════════════════════════════════════════════
// Voucher email rendering
//
// Two-section layout:
//   1. Acknowledgement — a friendly message to the purchaser. Driven by the
//      voucher type's `email_body` (Markdown) when set, otherwise a default
//      thank-you. This is where a credits voucher (F4) gets its own wording.
//   2. The voucher — styled like a physical gift voucher / ticket: from/to/
//      message, value, code, expiry, and a smaller QR for redemption.
//
// QR is rendered via api.qrserver.com (an <img>), which survives Gmail/Outlook
// SVG stripping. The voucher code string (not a URL) is encoded so staff can
// scan it during redemption.
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_ACCENT = '#ae222a';

export function safeColor(input) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(input || '')) ? input : DEFAULT_ACCENT;
}

export function renderVoucherEmail({
  customerName,
  voucherCode,
  value,
  expiryDate,
  typeName,
  itemName,
  emailBody,
  termsConditions,
  giftFrom,
  giftTo,
  giftMessage,
  accentColor,
  voucherLabel,
  redemptionInstructions,
  usageInfo,
  showQr = true,
  showValue = true,
}) {
  const accent = safeColor(accentColor);
  const label = voucherLabel || 'Your Voucher';
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(voucherCode)}`;
  const formattedValue = `$${Number(value).toFixed(2)}`;
  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'No expiry';

  // Token values for {{...}} substitution in the per-type free-text fields.
  const tokenValues = {
    name: customerName,
    voucher_id: voucherCode,
    value: formattedValue,
    expiry_date: formattedExpiry,
    item_name: itemName || typeName,
    message: giftMessage,
  };
  const instructions = substituteTokens(redemptionInstructions || 'Scan at the front desk to redeem', tokenValues);

  // ── Section 1: acknowledgement / message to the purchaser ──────────────────
  const greeting = customerName ? `<p style="margin:0 0 12px;font-size:16px;color:#1C121B;font-weight:600;">Hi ${escHtml(customerName)},</p>` : '';
  const ackBody = emailBody
    ? renderBodyMdEmail(substituteTokens(emailBody, tokenValues))
    : `<p style="margin:0;font-size:15px;color:#444;line-height:1.6;">Thank you for your purchase! Your ${escHtml(typeName)} is ready to use. The voucher is below — present this email (printed or on your phone) at the Urban Jungle front desk.</p>`;

  // ── Section 2: the voucher itself ───────────────────────────────────────────
  // Render whatever gift fields the staff member filled in — independently, so a
  // lone "From", lone "To", or lone message all still show.
  const giftFromToRows = (giftFrom || giftTo) ? `
        <table role="presentation" width="100%" style="margin:0 0 16px;border-collapse:collapse;">
          ${giftFrom ? `<tr>
            <td style="padding:2px 0;font-size:13px;color:#777;width:48px;">From</td>
            <td style="padding:2px 0;font-size:14px;color:#1C121B;font-weight:600;">${escHtml(giftFrom)}</td>
          </tr>` : ''}
          ${giftTo ? `<tr>
            <td style="padding:2px 0;font-size:13px;color:#777;width:48px;">To</td>
            <td style="padding:2px 0;font-size:14px;color:#1C121B;font-weight:600;">${escHtml(giftTo)}</td>
          </tr>` : ''}
        </table>` : '';
  const giftMessageBlock = giftMessage ? `<p style="margin:0 0 16px;padding:10px 14px;background:#fff;border-radius:6px;font-size:14px;color:#444;font-style:italic;line-height:1.5;">&ldquo;${escHtml(giftMessage)}&rdquo;</p>` : '';
  const giftRows = `${giftFromToRows}${giftMessageBlock}`;

  const termsSection = termsConditions ? `
      <div style="margin:20px 0 0;padding-top:16px;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#777;margin:0 0 8px;font-weight:600;">Terms &amp; Conditions</p>
        <div style="font-size:12px;color:#999;line-height:1.5;">${renderTCMdEmail(substituteTokens(termsConditions, tokenValues))}</div>
      </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(typeName)}</title>
<style>
  @media print {
    body { margin: 0; background: #fff; }
    .no-print { display: none !important; }
    .voucher-ticket { box-shadow: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<div class="no-print" style="background:${accent};padding:12px 24px;text-align:center;">
  <p style="margin:0;color:#fff;font-size:13px;">Forward or print this email to use your voucher at Urban Jungle.</p>
</div>

<div style="max-width:520px;margin:32px auto;padding:0 16px 32px;">

  <div style="background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);overflow:hidden;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1C121B,${accent},#c24657);padding:24px;text-align:center;">
      <p style="margin:0 0 4px;color:#fff;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Urban Jungle Indoor Rock Climbing</p>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">${escHtml(typeName)}</h1>
    </div>

    <!-- Section 1: acknowledgement -->
    <div style="padding:24px 24px 8px;">
      ${greeting}
      ${ackBody}
    </div>

    <!-- Section 2: the voucher -->
    <div style="padding:8px 24px 24px;">
      <div class="voucher-ticket" style="background:#fffaf7;border:2px dashed ${accent};border-radius:10px;padding:22px;text-align:center;box-shadow:0 1px 4px rgba(174,34,42,.08);">

        <p style="margin:0 0 14px;font-size:12px;color:${accent};letter-spacing:2px;text-transform:uppercase;font-weight:700;">${escHtml(label)}</p>

        ${giftRows}

        ${usageInfo ? `<div style="margin:0 0 16px;padding:12px 14px;background:#fff;border:1px solid #f0e0db;border-radius:6px;text-align:left;">${renderBodyMdEmail(substituteTokens(usageInfo, tokenValues))}</div>` : ''}

        <p style="margin:0 0 4px;font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">Voucher Code</p>
        <p style="margin:0 0 16px;font-size:26px;font-weight:700;color:${accent};letter-spacing:3px;font-family:'Courier New',monospace;">${escHtml(voucherCode)}</p>

        ${showValue ? `<table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid #f0e0db;border-bottom:1px solid #f0e0db;margin:0 0 16px;">
          <tr>
            <td style="text-align:center;padding:12px 4px;width:50%;">
              <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px;">Value</p>
              <p style="margin:0;font-size:24px;font-weight:700;color:#1C121B;">${formattedValue}</p>
            </td>
            <td style="text-align:center;padding:12px 4px;width:50%;border-left:1px solid #f0e0db;">
              <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.5px;">Expires</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1C121B;">${formattedExpiry}</p>
            </td>
          </tr>
        </table>` : ''}

        ${showQr ? `<div style="margin:0 auto;width:100px;height:100px;">
          <img src="${qrImgUrl}" width="100" height="100" alt="Voucher QR code" style="display:block;border:6px solid #fff;border-radius:4px;background:#fff;">
        </div>
        <p style="margin:8px 0 0;font-size:11px;color:#999;">${escHtml(instructions)}</p>`
        : (instructions ? `<p style="margin:4px 0 0;font-size:12px;color:#666;">${escHtml(instructions)}</p>` : '')}

      </div>

      ${termsSection}
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;padding:12px 24px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">Urban Jungle Indoor Rock Climbing &bull; frontdesk@urbanjungleirc.com</p>
    </div>

  </div>
</div>

</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════════
// Markdown → inline-styled HTML for email (email-client safe)
// ════════════════════════════════════════════════════════════════════════════

// Inline formatting for the email Markdown: bold, italic, and links. The caller
// passes HTML-escaped text, so the markers (** _ [ ] ( )) survive escaping and
// these regexes still match.
function _inlineEmail(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])_([^_\n]+)_(?![\w*])/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:inherit;text-decoration:underline;">$1</a>');
}

// Body Markdown for the acknowledgement section — larger, darker text than the
// fine-print terms renderer below.
function renderBodyMdEmail(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '', inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#1C121B;">${escHtml(line.slice(2))}</p>`;
    } else if (line.startsWith('## ') || line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      const text = line.replace(/^#{2,3}\s+/, '');
      html += `<p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#333;">${escHtml(text)}</p>`;
    } else if (line.startsWith('- ')) {
      if (!inList) { html += '<ul style="margin:6px 0;padding-left:18px;">'; inList = true; }
      html += `<li style="font-size:15px;color:#444;margin:3px 0;line-height:1.6;">${_inlineEmail(escHtml(line.slice(2)))}</li>`;
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p style="margin:0 0 10px;font-size:15px;color:#444;line-height:1.6;">${_inlineEmail(escHtml(line))}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

// Fine-print Markdown for the Terms & Conditions block.
function renderMdEmail(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '', inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p style="margin:4px 0;font-size:12px;font-weight:700;color:#555;">${escHtml(line.slice(2))}</p>`;
    } else if (line.startsWith('## ') || line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      const text = line.replace(/^#{2,3}\s+/, '');
      html += `<p style="margin:4px 0;font-size:12px;font-weight:600;color:#666;">${escHtml(text)}</p>`;
    } else if (line.startsWith('- ')) {
      if (!inList) { html += '<ul style="margin:4px 0;padding-left:16px;">'; inList = true; }
      html += `<li style="font-size:12px;color:#999;margin:2px 0;line-height:1.5;">${_inlineEmail(escHtml(line.slice(2)))}</li>`;
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p style="margin:4px 0;font-size:12px;color:#999;line-height:1.5;">${_inlineEmail(escHtml(line))}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function renderTCMdEmail(md) {
  if (!md) return '<p style="font-size:12px;color:#999;margin:0;line-height:1.5;">Standard terms and conditions apply.</p>';
  const stripped = md.replace(/^#\s+terms\s+and\s+conditions\s*[\r\n]*/i, '').trimStart();
  return renderMdEmail(stripped) || '<p style="font-size:12px;color:#999;margin:0;line-height:1.5;">Standard terms and conditions apply.</p>';
}

// Replace {{token}} placeholders (tolerating inner whitespace) with values.
// Unrecognised tokens and null/undefined values render empty, so no {{...}}
// ever survives. Returns RAW text — the caller's render path escapes it.
export function substituteTokens(text, values) {
  if (text == null) return '';
  return String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = values && values[key];
    return v == null ? '' : String(v);
  });
}

export function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
