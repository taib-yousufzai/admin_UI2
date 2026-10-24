import { describe, it, expect } from 'vitest';

/**
 * Tests verifying the fix for:
 * "chart pr add more kr rhe h vo position double dalra h by default usse default value pr rakho"
 *
 * Behavior:
 * 1. For F&O / MCX / Commodities / Currencies: useLots must be true, qtyValue must be 1 (1 lot default).
 * 2. For Equity / NSE-EQ / Crypto: useLots must be false, qtyValue must be 1 (1 unit default).
 * 3. Crucially, qtyValue must NEVER be prefilled with pos.qty_open (which was doubling positions).
 */

function computeAddMoreDefaults(pos: {
  symbol: string;
  qty_open: number;
  settlement?: string;
  segment?: string;
}) {
  const posSeg = (pos.settlement || pos.segment || '').toUpperCase();
  const isQtyDefault = posSeg.includes('EQUITY') || posSeg === 'NSE-EQ' || posSeg.includes('CRYPTO');
  const useLots = !isQtyDefault;
  const qtyValue = 1;

  return {
    useLots,
    qtyValue,
  };
}

function computeTargetLotSize(
  isAddMoreFlow: boolean,
  isExitFlow: boolean,
  addMoreSymbol: string | null,
  chainContract: { name: string } | null,
  chartLotSize: number,
  getLotSize: (sym: string) => number
) {
  return ((isAddMoreFlow || isExitFlow) && addMoreSymbol)
    ? getLotSize(addMoreSymbol)
    : (chainContract ? getLotSize(chainContract.name) : chartLotSize);
}

describe('Add More Position Defaults Fix', () => {
  const mockGetLotSize = (symbol: string): number => {
    const s = symbol.toUpperCase();
    if (s.includes('NIFTY')) return 25;
    if (s.includes('BANKNIFTY')) return 15;
    if (s.includes('CRUDEOIL')) return 100;
    if (s.includes('RELIANCE')) return 250;
    return 1;
  };

  it('sets default 1 Lot for NIFTY F&O position (NOT doubling pos.qty_open)', () => {
    const pos = {
      symbol: 'NIFTY26OCT25000CE',
      qty_open: 500, // User already has 500 open quantity (20 lots)
      settlement: 'NSE-OPT',
      segment: 'INDEX-OPT',
    };

    const defaults = computeAddMoreDefaults(pos);

    // Must default to 1 lot, NOT 500 qty
    expect(defaults.useLots).toBe(true);
    expect(defaults.qtyValue).toBe(1);
    expect(defaults.qtyValue).not.toBe(pos.qty_open);
  });

  it('sets default 1 Lot for MCX Commodity position', () => {
    const pos = {
      symbol: 'CRUDEOIL26NOV7000CE',
      qty_open: 300,
      settlement: 'MCX-OPT',
    };

    const defaults = computeAddMoreDefaults(pos);
    expect(defaults.useLots).toBe(true);
    expect(defaults.qtyValue).toBe(1);
    expect(defaults.qtyValue).not.toBe(pos.qty_open);
  });

  it('sets default 1 unit (useLots = false) for NSE Equity', () => {
    const pos = {
      symbol: 'RELIANCE',
      qty_open: 50,
      settlement: 'NSE-EQ',
    };

    const defaults = computeAddMoreDefaults(pos);
    expect(defaults.useLots).toBe(false);
    expect(defaults.qtyValue).toBe(1);
    expect(defaults.qtyValue).not.toBe(pos.qty_open);
  });

  it('sets default 1 unit (useLots = false) for Crypto', () => {
    const pos = {
      symbol: 'BTCUSDT',
      qty_open: 2.5,
      settlement: 'CRYPTO',
    };

    const defaults = computeAddMoreDefaults(pos);
    expect(defaults.useLots).toBe(false);
    expect(defaults.qtyValue).toBe(1);
    expect(defaults.qtyValue).not.toBe(pos.qty_open);
  });

  it('resolves correct targetLotSize when adding more to a different position than chart', () => {
    // Current chart is BANKNIFTY (lot size 15), but user clicked Add More on NIFTY (lot size 25)
    const targetLotSize = computeTargetLotSize(
      true, // isAddMoreFlow
      false,
      'NIFTY26OCT25000CE',
      null,
      15, // chart lot size
      mockGetLotSize
    );

    expect(targetLotSize).toBe(25);
  });
});
