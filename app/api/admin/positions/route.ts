import { NextResponse } from 'next/server';
import { requireAdmin } from '../_auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth as NextResponse;

  const { adminClient, callerUser, role } = auth;
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('rows') || searchParams.get('limit') || '50', 10)));
  const userId = searchParams.get('user_id') || searchParams.get('uid');
  const tab = (searchParams.get('tab') || 'open').toLowerCase();
  const isDemo = searchParams.get('demo') === 'true';
  const startDate = searchParams.get('start_date') || searchParams.get('startDate');
  const endDate = searchParams.get('end_date') || searchParams.get('endDate');

  const offset = (page - 1) * limit;

  try {
    const { getDescendantUserIds } = await import('@/lib/hierarchy');
    const allowedUserIds = await getDescendantUserIds(adminClient, callerUser.id, role);

    let query = adminClient
      .from('positions')
      .select('id, user_id, symbol, side, status, product_type, qty_open, qty_total, avg_price, entry_price, exit_price, ltp, pnl, brokerage, locked_margin, entry_time, exit_time, created_at', { count: 'exact' });

    if (allowedUserIds !== null) {
      if (allowedUserIds.length === 0) {
        return NextResponse.json({ positions: [], total: 0 });
      }
      query = query.in('user_id', allowedUserIds);
    }

    if (userId && userId !== 'all') query = query.eq('user_id', userId);

    if (tab === 'closed') {
      query = query.or('status.in.(closed,CLOSED),qty_open.lte.0');
    } else {
      query = query.in('status', ['open', 'active', 'OPEN', 'ACTIVE']).gt('qty_open', 0);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      const toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', toDate.toISOString());
    }

    const { data, count, error } = await query
      .order(tab === 'closed' ? 'exit_time' : 'created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rawData = data ?? [];

    if (tab === 'closed') {
      rawData = rawData.filter((p: any) => {
        const s = String(p.status || '').toLowerCase();
        const q = Number(p.qty_open || 0);
        return s === 'closed' || q <= 0;
      });
    } else {
      rawData = rawData.filter((p: any) => {
        const s = String(p.status || '').toLowerCase();
        const q = Number(p.qty_open || 0);
        return (s === 'open' || s === 'active') && q > 0;
      });
    }

    const userIds = [...new Set(rawData.map((p: any) => p.user_id).filter(Boolean))];
    const profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await adminClient
        .from('profiles')
        .select('id, client_id, full_name, email, demo_user')
        .in('id', userIds);
      if (profilesData) {
        for (const prof of profilesData) {
          profilesMap[prof.id] = prof;
        }
      }
    }

    let positions = rawData.map((p: any) => {
      const prof = profilesMap[p.user_id];
      const isClosed = ['closed', 'CLOSED'].includes(p.status) || Number(p.qty_open || 0) <= 0;
      const status = isClosed ? 'closed' : 'open';
      return {
        id: p.id,
        user_id: p.user_id,
        symbol: p.symbol,
        side: (p.side || 'BUY').toUpperCase(),
        status,
        product_type: p.product_type || 'INTRADAY',
        qty_open: isClosed ? 0 : Number(p.qty_open || 0),
        qty_total: Number(p.qty_total || p.qty_open || 0),
        avg_price: Number(p.avg_price || p.entry_price || 0),
        entry_price: Number(p.entry_price || p.avg_price || 0),
        exit_price: p.exit_price ? Number(p.exit_price) : undefined,
        ltp: p.ltp != null ? Number(p.ltp) : undefined,
        pnl: Number(p.pnl || 0),
        brokerage: Number(p.brokerage || 0),
        locked_margin: isClosed ? 0 : Number(p.locked_margin || 0),
        entry_time: p.entry_time || p.created_at,
        exit_time: p.exit_time,
        profiles: prof ? {
          client_id: prof.client_id || '',
          full_name: prof.full_name || '',
          email: prof.email || '',
          demo_user: Boolean(prof?.demo_user || prof?.email?.toLowerCase().includes('demo')),
        } : undefined,
      };
    });

    if (isDemo) {
      positions = positions.filter((p: any) => p.profiles?.demo_user || p.profiles?.email?.toLowerCase().includes('demo'));
    } else {
      positions = positions.filter((p: any) => !p.profiles?.demo_user && !p.profiles?.email?.toLowerCase().includes('demo'));
    }

    return NextResponse.json({
      positions,
      total: count ?? positions.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
