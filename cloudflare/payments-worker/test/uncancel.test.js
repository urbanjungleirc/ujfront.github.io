import { describe, it, expect } from 'vitest';
import { rpcErrorParts } from '../src/index.js';

describe('rpcErrorParts — restore codes', () => {
  it('maps VOUCHER_NOT_CANCELLED with the current status', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_NOT_CANCELLED', detail: { status: 'active' } }))
      .toEqual({ status: 400, message: 'Cannot restore voucher with status: active' });
  });

  it('still maps the cancel-side codes unchanged', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_ALREADY_CANCELLED' }))
      .toEqual({ status: 400, message: 'Voucher is already cancelled' });
    expect(rpcErrorParts({ error: 'REASON_REQUIRED' }))
      .toEqual({ status: 400, message: 'reason is required' });
  });

  it('leaves the undo guard mapping intact', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_CANCELLED' }))
      .toEqual({ status: 400, message: 'Voucher is cancelled' });
  });
});
