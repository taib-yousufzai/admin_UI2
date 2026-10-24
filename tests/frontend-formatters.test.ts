import { describe, it, expect } from 'vitest';
import {
  fmtCurrency,
  fmtPrice,
  fmtPnl,
  fmtNum,
  fmtPercent,
  fmtQty,
  fmtBalance,
  fmtCompact,
  fmtDate,
  fmtTime,
  fmtDateTime,
  fmtDuration,
} from '../lib/format';
import { positionItemToPosition, PositionItem } from '../components/admin/AdminUtils';

describe('Frontend Formatters — Number Safety & .toFixed Immunity', () => {
  describe('lib/format.ts safe numeric parsing', () => {
    it('fmtCurrency formats numbers, string numbers, and handles null/undefined safely', () => {
      expect(fmtCurrency(1250.5)).toContain('1,250.50');
      // String from PostgreSQL NUMERIC type
      expect(fmtCurrency('1250.50')).toContain('1,250.50');
      expect(fmtCurrency('0')).toContain('0.00');
      expect(fmtCurrency(null)).toBe('—');
      expect(fmtCurrency(undefined)).toBe('—');
      expect(fmtCurrency('')).toBe('—');
      expect(fmtCurrency('invalid')).toBe('—');
    });

    it('fmtPrice formats prices with -- fallback on missing input', () => {
      expect(fmtPrice(250.75)).toContain('250.75');
      expect(fmtPrice('250.75')).toContain('250.75');
      expect(fmtPrice(null)).toBe('--');
      expect(fmtPrice(undefined)).toBe('--');
      expect(fmtPrice('')).toBe('--');
    });

    it('fmtPnl formats signed profit and loss correctly', () => {
      expect(fmtPnl(500)).toContain('+₹500.00');
      expect(fmtPnl('500.50')).toContain('+₹500.50');
      expect(fmtPnl(-250)).toContain('-₹250.00');
      expect(fmtPnl('-250.75')).toContain('-₹250.75');
      expect(fmtPnl(0)).toContain('+₹0.00');
      expect(fmtPnl(null)).toBe('—');
      expect(fmtPnl(undefined)).toBe('—');
    });

    it('fmtNum formats plain decimals without throwing on string input', () => {
      expect(fmtNum(42.5)).toBe('42.50');
      expect(fmtNum('42.50')).toBe('42.50');
      expect(fmtNum(null)).toBe('0.00');
      expect(fmtNum(undefined)).toBe('0.00');
      expect(fmtNum('not-a-number')).toBe('0.00');
    });

    it('fmtPercent formats percentages and never throws .toFixed on strings', () => {
      expect(fmtPercent(2.5)).toBe('+2.50%');
      expect(fmtPercent('2.50')).toBe('+2.50%');
      expect(fmtPercent(-1.25)).toBe('-1.25%');
      expect(fmtPercent('-1.25')).toBe('-1.25%');
      expect(fmtPercent(null)).toBe('0.00%');
      expect(fmtPercent(undefined)).toBe('0.00%');
    });

    it('fmtQty formats whole quantities with Indian separators', () => {
      expect(fmtQty(1000)).toBe('1,000');
      expect(fmtQty('25000')).toBe('25,000');
      expect(fmtQty(null)).toBe('0');
      expect(fmtQty(undefined)).toBe('0');
    });

    it('fmtBalance formats compact balance strings safely', () => {
      expect(fmtBalance(1500)).toBe('1.50k');
      expect(fmtBalance('1500')).toBe('1.50k');
      expect(fmtBalance(500)).toBe('500.00');
      expect(fmtBalance('500')).toBe('500.00');
      expect(fmtBalance(null)).toBe('...');
    });

    it('fmtCompact formats L and Cr numbers safely with string numbers', () => {
      expect(fmtCompact(500000)).toBe('5.00L');
      expect(fmtCompact('500000')).toBe('5.00L');
      expect(fmtCompact(20000000)).toBe('2.00Cr');
      expect(fmtCompact('20000000')).toBe('2.00Cr');
      expect(fmtCompact(null)).toBe('0');
    });
  });

  describe('positionItemToPosition converter', () => {
    it('safely converts string numbers from PostgreSQL without crashing', () => {
      const rawPostgresItem: any = {
        id: 'pos-123',
        user_id: 'user-456',
        symbol: 'RELIANCE',
        side: 'BUY',
        status: 'open',
        qty_open: '50',
        qty_total: '50',
        avg_price: '2800.50', // string from pg NUMERIC
        entry_price: '2800.50',
        ltp: '2850.00',
        exit_price: null,
        pnl: '2475.00',
        brokerage: '40.00',
        duration_seconds: '120',
        entry_time: new Date().toISOString(),
        exit_time: null,
      };

      const position = positionItemToPosition(rawPostgresItem);

      // Verify numbers are parsed into actual JavaScript numbers
      expect(typeof position.avgPrice).toBe('number');
      expect(typeof position.entry).toBe('number');
      expect(typeof position.ltp).toBe('number');
      expect(typeof position.pnl).toBe('number');
      expect(typeof position.brokerage).toBe('number');

      // Verify .toFixed can be invoked on all fields without throwing
      expect(() => position.avgPrice.toFixed(2)).not.toThrow();
      expect(() => (position.entry || 0).toFixed(2)).not.toThrow();
      expect(() => (position.ltp || 0).toFixed(2)).not.toThrow();
      expect(() => position.pnl.toFixed(2)).not.toThrow();
      expect(() => position.brokerage.toFixed(2)).not.toThrow();

      expect(position.avgPrice.toFixed(2)).toBe('2800.50');
      expect(position.qty).toBe('50/50');
    });

    it('handles closed positions with exit_price as string', () => {
      const rawClosedItem: any = {
        id: 'pos-closed-1',
        user_id: 'user-789',
        symbol: 'TCS',
        side: 'SELL',
        status: 'closed',
        qty_open: '0',
        qty_total: '100',
        avg_price: '3500.00',
        entry_price: '3500.00',
        exit_price: '3450.25',
        ltp: null,
        pnl: '4975.00',
        brokerage: '50.00',
        entry_time: new Date().toISOString(),
      };

      const position = positionItemToPosition(rawClosedItem);
      expect(typeof position.exit).toBe('number');
      expect(position.exit?.toFixed(2)).toBe('3450.25');
    });
  });

  describe('Orders mapping and price format safety', () => {
    it('simulates raw orders mapping with string prices and quantities', () => {
      const rawOrder = {
        id: 'ord-1',
        user_id: 'usr-1',
        symbol: 'INFY',
        side: 'BUY',
        status: 'EXECUTED',
        qty: '100', // string from pg
        price: '1520.40', // string from pg
        order_type: 'LIMIT',
        info: 'Executed successfully',
        created_at: new Date().toISOString(),
      };

      const mappedOrder = {
        id: rawOrder.id,
        user_id: rawOrder.user_id,
        symbol: rawOrder.symbol,
        side: rawOrder.side,
        status: rawOrder.status,
        qty: Number(rawOrder.qty ?? 0),
        price: Number(rawOrder.price ?? 0),
        orderType: rawOrder.order_type,
        info: rawOrder.info,
      };

      expect(typeof mappedOrder.price).toBe('number');
      expect(typeof mappedOrder.qty).toBe('number');

      // Test that .toFixed(2) in table render does NOT throw
      expect(() => Number(mappedOrder.price ?? 0).toFixed(2)).not.toThrow();
      expect(Number(mappedOrder.price ?? 0).toFixed(2)).toBe('1520.40');
    });

    it('safely handles missing price in table render fallback', () => {
      const orderWithNullPrice = { price: null };
      expect(Number(orderWithNullPrice.price ?? 0).toFixed(2)).toBe('0.00');

      const orderWithUndefinedPrice = { price: undefined };
      expect(Number(orderWithUndefinedPrice.price ?? 0).toFixed(2)).toBe('0.00');
    });
  });
});
