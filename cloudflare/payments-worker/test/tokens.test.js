import { describe, it, expect } from 'vitest';
import { substituteTokens } from '../src/email.js';

const vals = {
  name: 'Jordan',
  voucher_id: 'UJ-AAAA-BBBB',
  value: '$60.00',
  expiry_date: '1 January 2027',
  item_name: '2 adults, 2 children',
  message: 'Enjoy!',
};

describe('substituteTokens', () => {
  it('replaces a known token', () => {
    expect(substituteTokens('Hi {{name}}', vals)).toBe('Hi Jordan');
  });
  it('replaces multiple tokens in one string', () => {
    expect(substituteTokens('{{name}} — {{value}}', vals)).toBe('Jordan — $60.00');
  });
  it('tolerates inner whitespace', () => {
    expect(substituteTokens('{{ name }}', vals)).toBe('Jordan');
  });
  it('strips an unrecognised token', () => {
    expect(substituteTokens('a{{nope}}b', vals)).toBe('ab');
  });
  it('renders a recognised-but-empty token as empty', () => {
    expect(substituteTokens('x{{message}}y', { message: null })).toBe('xy');
  });
  it('leaves text without tokens untouched', () => {
    expect(substituteTokens('plain text, no tokens', vals)).toBe('plain text, no tokens');
  });
  it('returns empty string for null/undefined input', () => {
    expect(substituteTokens(null, vals)).toBe('');
    expect(substituteTokens(undefined, vals)).toBe('');
  });
  it('does not HTML-escape — escaping is the renderer\'s job', () => {
    expect(substituteTokens('{{name}}', { name: '<b>' })).toBe('<b>');
  });
});
