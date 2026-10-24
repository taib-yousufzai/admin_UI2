import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth as NextResponse;

  const { adminClient, callerUser, role } = auth;
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  const { searchParams } = new URL(request.url);

  const tab = (searchParams.get('tab') || 'open').toLowerCase();
  const isDemo = searchParams.get('demo') === 'true';
  const startDate = searchParams.get('start_date') || searchParams.get('startDate');
  const endDate = searchParams.get('end_date') || searchParams.get('endDate');
  const rows = Math.min(100000, Math.max(1, parseInt(searchParams.get('rows') || '1000', 10)));

  try {
    const { getDescendantUserIds } = await import('@/lib/hierarchy');
    const allowedUserIds = await getDescendantUserIds(adminClient, callerUser.id, role);

    if (allowedUserIds !== null && allowedUserIds.length === 0) {
      return NextResponse.json([]);
    }

    let query = adminClient
      .from('positions')
      .select('id, user_id, symbol, side, status, product_type, qty_open, qty_total, avg_price, entry_price, exit_price, ltp, pnl, brokerage, duration_seconds, sl, tp, entry_time, exit_time, settlement, created_at');

    if (allowedUserIds !== null) {
      if (id && id !== 'all') {
        if (!allowedUserIds.includes(id)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        query = query.eq('user_id', id);
      } else {
        query = query.in('user_id', allowedUserIds);
      }
    } else if (id && id !== 'all') {
      query = query.eq('user_id', id);
    }

    if (tab === 'closed') {
      query = query.or('status.in.(closed,CLOSED),qty_open.lte.0');
    } else if (tab === 'active') {
      query = query.in('status', ['active', 'ACTIVE']).gt('qty_open', 0);
    } else if (tab === 'open') {
      query = query.in('status', ['open', 'OPEN']).gt('qty_open', 0);
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

    const { data: rawPositions, error } = await query
      .order(tab === 'closed' ? 'exit_time' : 'created_at', { ascending: false })
      .limit(rows);

    if (error) {
      console.error('[GET /api/admin/users/[id]/positions] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let posList = rawPositions ?? [];

    // Strict in-memory partitioning:
    if (tab === 'closed') {
      posList = posList.filter((p: any) => {
        const s = String(p.status || '').toLowerCase();
        const q = Number(p.qty_open || 0);
        return s === 'closed' || q <= 0;
      });
    } else if (tab === 'active') {
      posList = posList.filter((p: any) => {
        const s = String(p.status || '').toLowerCase();
        const q = Number(p.qty_open || 0);
        return s === 'active' && q > 0;
      });
    } else if (tab === 'open') {
      posList = posList.filter((p: any) => {
        const s = String(p.status || '').toLowerCase();
        const q = Number(p.qty_open || 0);
        return s === 'open' && q > 0;
      });
    } else {
      posList = posList.filter((p: any) => {
        const s = String(p.status || '').toLowerCase();
        const q = Number(p.qty_open || 0);
        return (s === 'open' || s === 'active') && q > 0;
      });
    }
    const userIds = Array.from(new Set(posList.map((p: any) => p.user_id).filter(Boolean)));

    let profilesMap: Record<string, any> = {};
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

    let positions = posList.map((p: any) => {
      const prof = profilesMap[p.user_id];
      const isClosed = ['closed', 'CLOSED'].includes(p.status) || Number(p.qty_open || 0) <= 0;
      const rawStatus = String(p.status || '').toLowerCase();
      const status = isClosed ? 'closed' : (rawStatus === 'active' ? 'active' : 'open');
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
        duration_seconds: Number(p.duration_seconds || 0),
        sl: p.sl != null ? Number(p.sl) : null,
        tp: p.tp != null ? Number(p.tp) : null,
        entry_time: p.entry_time || p.created_at,
        exit_time: p.exit_time,
        settlement: p.settlement || 'NSE',
        profiles: prof ? {
          client_id: prof.client_id || '',
          full_name: prof.full_name || '',
          email: prof.email || '',
          demo_user: Boolean(prof?.demo_user || prof?.email?.toLowerCase().includes('demo')),
        } : undefined,
      };
    });

    // Demo filtering
    if (isDemo) {
      positions = positions.filter((p: any) => p.profiles?.demo_user || p.profiles?.email?.toLowerCase().includes('demo'));
    } else if (Object.keys(profilesMap).length > 0) {
      positions = positions.filter((p: any) => !p.profiles?.demo_user && !p.profiles?.email?.toLowerCase().includes('demo'));
    }

    return NextResponse.json(positions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[GET /api/admin/users/[id]/positions] Fatal error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
