import { describe, it, expect } from 'vitest';
import { rpcErrorParts } from '../src/index.js';

describe('rpcErrorParts', () => {
  it('returns null for success results', () => {
    expect(rpcErrorParts({ voucher: { voucher_id: 'UJ-TEST-CODE' } })).toBeNull();
    expect(rpcErrorParts(null)).toBeNull();
  });

  it('maps VOUCHER_NOT_FOUND to 404', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_NOT_FOUND' }))
      .toEqual({ status: 404, message: 'Voucher not found' });
  });

  it('maps VOUCHER_NOT_ACTIVE with status detail', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_NOT_ACTIVE', detail: { status: 'cancelled' } }))
      .toEqual({ status: 400, message: 'Cannot redeem voucher with status: cancelled' });
  });

  it('maps VOUCHER_EXPIRED with expiry date', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_EXPIRED', detail: { expiry_date: '2026-01-31' } }))
      .toEqual({ status: 400, message: 'Voucher expired on 2026-01-31' });
  });

  it('maps INVALID_AMOUNT', () => {
    expect(rpcErrorParts({ error: 'INVALID_AMOUNT' }))
      .toEqual({ status: 400, message: 'amount must be a positive number' });
  });

  it('maps INSUFFICIENT_BALANCE with amounts', () => {
    expect(rpcErrorParts({ error: 'INSUFFICIENT_BALANCE', detail: { amount: 60, balance: 42.5 } }))
      .toEqual({ status: 400, message: 'Amount 60 exceeds balance 42.5' });
  });

  it('maps NOTHING_TO_UNDO', () => {
    expect(rpcErrorParts({ error: 'NOTHING_TO_UNDO' }))
      .toEqual({ status: 400, message: 'No redemption to undo' });
  });

  it('maps unknown codes to a generic 400', () => {
    expect(rpcErrorParts({ error: 'SOMETHING_NEW' }))
      .toEqual({ status: 400, message: 'Redemption failed: SOMETHING_NEW' });
  });
});
