import { describe, it, expect } from 'vitest';
import { sanitizeOrderInfo } from '../lib/trading/orderSanitizer';
import { aggregatePositions } from '../app/api/admin/accounts/route';
import { isUserInHierarchy } from '../lib/hierarchy';

describe('Admin Data Fetching & Business Logic', () => {
  describe('Order Sanitization', () => {
    it('strips internal routing prefixes and system tags', () => {
      expect(sanitizeOrderInfo('EXIT - USER')).toBeNull();
      expect(sanitizeOrderInfo('EXIT - BROKER')).toBeNull();
      expect(sanitizeOrderInfo('FIFO_EXIT')).toBeNull();
      expect(sanitizeOrderInfo('POS-SL-TRIGGERED')).toBeNull();
      expect(sanitizeOrderInfo('SYSTEM_CANCEL')).toBeNull();
    });

    it('strips internal UUIDs from info strings', () => {
      expect(sanitizeOrderInfo('0b01cd90-1878-4c86-a17f-6af9cf5d9027')).toBeNull();
      expect(sanitizeOrderInfo('Order rejected: 0b01cd90-1878-4c86-a17f-6af9cf5d9027 (Modified to SLM)')).toBeNull();
    });

    it('preserves user-facing informational messages', () => {
      expect(sanitizeOrderInfo('Insufficient funds')).toBe('Insufficient funds');
      expect(sanitizeOrderInfo('Circuit limit hit')).toBe('Circuit limit hit');
      expect(sanitizeOrderInfo('Exchange closed')).toBe('Exchange closed');
    });

    it('handles empty, null, or undefined values safely', () => {
      expect(sanitizeOrderInfo(null)).toBeNull();
      expect(sanitizeOrderInfo(undefined)).toBeNull();
      expect(sanitizeOrderInfo('')).toBeNull();
      expect(sanitizeOrderInfo('   ')).toBeNull();
    });
  });

  describe('Accounts Route — aggregatePositions Invariant', () => {
    it('Property 13: pnl_bkg MUST always equal net_pnl + brokerage', () => {
      const positions = [
        { pnl: 1500.50, brokerage: 50.00, settlement: 0 },
        { pnl: -300.25, brokerage: 25.00, settlement: 0 },
        { pnl: 200.00, brokerage: 20.00, settlement: 100 },
      ];

      const res = aggregatePositions(positions);
      expect(res.net_pnl).toBeCloseTo(1400.25, 2);
      expect(res.brokerage).toBeCloseTo(95.00, 2);
      expect(res.pnl_bkg).toBeCloseTo(res.net_pnl + res.brokerage, 2);
      expect(res.settlement).toBe(100);
    });

    it('handles PostgreSQL string numeric values properly in aggregation', () => {
      const positionsWithStrings: any[] = [
        { pnl: '2000.50', brokerage: '40.00', settlement: '0' },
        { pnl: '-500.25', brokerage: '20.00', settlement: '50.00' },
      ];

      const res = aggregatePositions(positionsWithStrings);
      expect(typeof res.net_pnl).toBe('number');
      expect(typeof res.brokerage).toBe('number');
      expect(typeof res.pnl_bkg).toBe('number');
      expect(res.net_pnl).toBeCloseTo(1500.25, 2);
      expect(res.brokerage).toBeCloseTo(60.00, 2);
      expect(res.pnl_bkg).toBeCloseTo(1560.25, 2);
    });

    it('handles empty position arrays gracefully', () => {
      const res = aggregatePositions([]);
      expect(res).toEqual({ net_pnl: 0, brokerage: 0, pnl_bkg: 0, settlement: 0 });
    });
  });

  describe('Multi-tenant Hierarchy Access Rules', () => {
    it('super_admin has visibility over anyone', async () => {
      const mockSupabase = {};
      const canAccess = await isUserInHierarchy(mockSupabase, 'super-admin-id', 'any-user-id', 'super_admin');
      expect(canAccess).toBe(true);
    });

    it('actor can always access themselves', async () => {
      const mockSupabase = {};
      const canAccess = await isUserInHierarchy(mockSupabase, 'user-1', 'user-1', 'user');
      expect(canAccess).toBe(true);
    });

    it('regular user cannot access other users', async () => {
      const mockSupabase = {};
      const canAccess = await isUserInHierarchy(mockSupabase, 'user-1', 'user-2', 'user');
      expect(canAccess).toBe(false);
    });

    it('non-super-admin can NEVER access a super_admin', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'super-admin-1', role: 'super_admin', parent_id: null },
                error: null,
              }),
            }),
          }),
        }),
      };
      const canAccess = await isUserInHierarchy(mockSupabase, 'admin-1', 'super-admin-1', 'admin');
      expect(canAccess).toBe(false);
    });
  });

  describe('Demo Mode Partitioning Logic', () => {
    const isDemoProfile = (p: any) => Boolean(p.demo_user || (p.email && p.email.toLowerCase().includes('demo')));

    const profiles = [
      { id: '1', email: 'john@example.com', demo_user: false },
      { id: '2', email: 'alice@example.com', demo_user: null }, // Null in PostgreSQL
      { id: '3', email: 'demo_user1@example.com', demo_user: true },
      { id: '4', email: 'testdemo@margin.com', demo_user: null }, // demo by email
      { id: '5', email: 'bob@example.com', demo_user: undefined },
    ];

    it('live mode includes profiles where demo_user is false, null, or undefined and email has no demo', () => {
      const liveProfiles = profiles.filter(p => !isDemoProfile(p));
      expect(liveProfiles.map(p => p.id)).toEqual(['1', '2', '5']);
    });

    it('demo mode strictly matches profiles flagged demo_user=true or containing demo in email', () => {
      const demoProfiles = profiles.filter(p => isDemoProfile(p));
      expect(demoProfiles.map(p => p.id)).toEqual(['3', '4']);
    });
  });
});
