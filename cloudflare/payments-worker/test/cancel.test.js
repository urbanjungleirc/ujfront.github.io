import { describe, it, expect } from 'vitest';
import { rpcErrorParts, isManagerAuthed } from '../src/index.js';

function req(headers = {}) {
  return new Request('https://worker.test/v1/vouchers/UJ-TEST-CODE/cancel', {
    method: 'POST',
    headers,
  });
}

describe('isManagerAuthed', () => {
  const env = { MANAGER_SHARED_SECRET: 'manager-hunter2' };

  it('accepts the correct manager secret', async () => {
    expect(await isManagerAuthed(req({ 'X-Manager-Secret': 'manager-hunter2' }), env)).toBe(true);
  });

  it('rejects a wrong secret', async () => {
    expect(await isManagerAuthed(req({ 'X-Manager-Secret': 'manager-hunteR2' }), env)).toBe(false);
  });

  it('rejects a missing header', async () => {
    expect(await isManagerAuthed(req(), env)).toBe(false);
  });

  it('rejects everything when the env secret is unset', async () => {
    expect(await isManagerAuthed(req({ 'X-Manager-Secret': 'anything' }), {})).toBe(false);
    expect(await isManagerAuthed(req({ 'X-Manager-Secret': '' }), { MANAGER_SHARED_SECRET: '' })).toBe(false);
  });
});

describe('rpcErrorParts — cancel codes', () => {
  it('maps VOUCHER_ALREADY_CANCELLED', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_ALREADY_CANCELLED' }))
      .toEqual({ status: 400, message: 'Voucher is already cancelled' });
  });

  it('maps VOUCHER_CANCELLED', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_CANCELLED' }))
      .toEqual({ status: 400, message: 'Voucher is cancelled' });
  });

  it('maps REASON_REQUIRED', () => {
    expect(rpcErrorParts({ error: 'REASON_REQUIRED' }))
      .toEqual({ status: 400, message: 'reason is required' });
  });
});
