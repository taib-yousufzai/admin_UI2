import { NextResponse } from 'next/server';
import { requireAdmin } from '../_auth';
import { sanitizeOrderInfo } from '@/lib/trading/orderSanitizer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth as NextResponse;

  const { adminClient, callerUser, role } = auth;
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('rows') || searchParams.get('limit') || '50', 10)));
  const userId = searchParams.get('user_id') || searchParams.get('uid');
  const statusParam = searchParams.get('status');
  const tab = (searchParams.get('tab') || '').toLowerCase();
  const search = searchParams.get('search')?.trim();
  const dateFrom = searchParams.get('dateFrom') || searchParams.get('date_from');
  const dateTo = searchParams.get('dateTo') || searchParams.get('date_to');
  const isDemo = searchParams.get('demo') === 'true';

  const offset = (page - 1) * limit;

  try {
    const { getDescendantUserIds } = await import('@/lib/hierarchy');
    const allowedUserIds = await getDescendantUserIds(adminClient, callerUser.id, role);

    let query = adminClient
      .from('orders')
      .select('id, user_id, symbol, side, status, order_type, product_type, qty, lots, fill_price, price, brokerage, info, created_at', { count: 'exact' });

    if (allowedUserIds !== null) {
      if (allowedUserIds.length === 0) {
        return NextResponse.json({ orders: [], total: 0 });
      }
      query = query.in('user_id', allowedUserIds);
    }

    // Demo filtering: match reference admin behavior
    const { data: demoProfiles } = await adminClient
      .from('profiles')
      .select('id')
      .or('demo_user.eq.true,email.ilike.%demo%');
    const demoUserIds = (demoProfiles || []).map((p: any) => p.id);

    if (isDemo) {
      if (demoUserIds.length === 0) {
        return NextResponse.json({ orders: [], total: 0 });
      }
      query = query.in('user_id', demoUserIds);
    } else if (demoUserIds.length > 0) {
      query = query.not('user_id', 'in', demoUserIds);
    }

    if (userId && userId !== 'all') query = query.eq('user_id', userId);

    if (statusParam) {
      query = query.eq('status', statusParam);
    } else if (tab) {
      if (tab === 'pending') {
        query = query.in('status', ['PENDING', 'TRIGGER_PENDING', 'OPEN', 'SUBMITTING']);
      } else if (tab === 'executed') {
        query = query.in('status', ['EXECUTED', 'COMPLETE', 'FILLED']);
      } else if (tab === 'limit') {
        query = query.in('status', ['CANCELLED', 'CANCELED']);
      } else if (tab === 'rejected') {
        query = query.in('status', ['REJECTED']);
      }
    }

    if (search) {
      query = query.or(`symbol.ilike.%${search}%,id.ilike.%${search}%`);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', toDate.toISOString());
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[GET /api/admin/orders] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rawList = data ?? [];
    const uniqueUserIds = [...new Set(rawList.map((o: any) => o.user_id).filter(Boolean))];
    const profilesMap: Record<string, any> = {};
    if (uniqueUserIds.length > 0) {
      const { data: profs } = await adminClient
        .from('profiles')
        .select('id, client_id, full_name, email')
        .in('id', uniqueUserIds);
      if (profs) {
        for (const p of profs) {
          profilesMap[p.id] = p;
        }
      }
    }

    const orders = rawList.map((o: any) => {
      const prof = profilesMap[o.user_id];
      const sanitizedInfo = sanitizeOrderInfo(o.info);
      return {
        id: o.id,
        user_id: o.user_id,
        user_name: prof?.full_name || prof?.email || '',
        user_client_id: prof?.client_id || '',
        symbol: o.symbol,
        side: (o.side || 'BUY').toUpperCase(),
        status: (o.status || 'EXECUTED').toUpperCase(),
        orderType: o.order_type || 'MARKET',
        order_type: o.order_type || 'MARKET',
        product_type: o.product_type,
        qty: Number(o.qty || 1),
        lots: Number(o.lots || 1),
        price: Number(o.fill_price || o.price || 0),
        fill_price: Number(o.fill_price || o.price || 0),
        brokerage: Number(o.brokerage || 0),
        info: sanitizedInfo || o.info || '—',
        time: o.created_at,
        created_at: o.created_at,
      };
    });

    return NextResponse.json({
      orders,
      total: count ?? orders.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
