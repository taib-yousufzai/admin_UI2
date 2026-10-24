import { NextResponse } from 'next/server';
import { requireAdmin } from '../_auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth as NextResponse;

  const { adminClient, callerUser, role } = auth;
  const { searchParams } = new URL(request.url);
  const isDemo = searchParams.get('demo') === 'true';
  const brokerId = searchParams.get('broker_id') || '';
  const subBrokerId = searchParams.get('sub_broker_id') || '';
  const clientId = searchParams.get('client_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const emptyResponse = {
    ledger_balance: 0,
    net_balance: 0,
    mark_to_market: 0,
    net_pnl: 0,
    total_brokerage: 0,
    margin_used: 0,
    net: 0,
    total_deposits: 0,
    total_withdrawals: 0,
    avg_deposit: 0,
    avg_withdrawal: 0,
    avg_profit: 0,
    avg_loss: 0,
    profitable_clients: 0,
    loss_making_clients: 0,
    buy_position_count: 0,
    sell_position_count: 0,
    registered: 0,
    added_funds: 0,
    conversion: '0%',
    stats: {
      total_users: 0,
      active_users: 0,
      open_positions: 0,
      pending_orders: 0,
      total_balance: 0,
      total_pnl_today: 0,
      total_brokerage_today: 0,
      pending_deposits: 0,
      pending_withdrawals: 0,
    },
  };

  try {
    const { getDescendantUserIds } = await import('@/lib/hierarchy');
    const allowedUserIds = await getDescendantUserIds(adminClient, callerUser.id, role);

    if (allowedUserIds !== null && allowedUserIds.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    // Step 1: Query all profiles within caller hierarchy
    let profilesQuery = adminClient
      .from('profiles')
      .select('id, client_id, email, full_name, role, active, balance, demo_user, parent_id, created_at');

    if (allowedUserIds !== null) {
      profilesQuery = profilesQuery.in('id', allowedUserIds);
    }

    const { data: rawProfiles, error: profErr } = await profilesQuery;
    if (profErr) {
      console.error('[GET /api/admin/dashboard] Profiles error:', profErr);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    const allProfiles = rawProfiles ?? [];

    // Helper: determine whether a profile is demo
    const isDemoProfile = (p: any) => Boolean(p.demo_user || (p.email && p.email.toLowerCase().includes('demo')));

    // Step 2: Strictly partition demo vs live profiles
    let scopedProfiles = allProfiles.filter((p: any) => {
      const demo = isDemoProfile(p);
      return isDemo ? demo : !demo;
    });

    // Step 3: Apply hierarchy dropdown filters if supplied
    if (clientId) {
      scopedProfiles = scopedProfiles.filter((p: any) => p.id === clientId);
    } else if (subBrokerId) {
      const getChildren = (parentId: string): string[] => {
        const direct = allProfiles.filter((p: any) => p.parent_id === parentId).map((p: any) => p.id);
        return [...direct, ...direct.flatMap(getChildren)];
      };
      const subDescendantIds = new Set([subBrokerId, ...getChildren(subBrokerId)]);
      scopedProfiles = scopedProfiles.filter((p: any) => subDescendantIds.has(p.id));
    } else if (brokerId) {
      const getChildren = (parentId: string): string[] => {
        const direct = allProfiles.filter((p: any) => p.parent_id === parentId).map((p: any) => p.id);
        return [...direct, ...direct.flatMap(getChildren)];
      };
      const brokerDescendantIds = new Set([brokerId, ...getChildren(brokerId)]);
      scopedProfiles = scopedProfiles.filter((p: any) => brokerDescendantIds.has(p.id));
    }

    const targetUserIds = scopedProfiles.map((p: any) => p.id);

    if (targetUserIds.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    // Step 4: Query positions, orders, and fund requests strictly scoped to targetUserIds
    let openPosQuery = adminClient
      .from('positions')
      .select('id, user_id, side, qty_open, pnl, brokerage, status, locked_margin, created_at')
      .in('status', ['open', 'active', 'OPEN', 'ACTIVE'])
      .gt('qty_open', 0)
      .in('user_id', targetUserIds);

    let closedPosQuery = adminClient
      .from('positions')
      .select('id, user_id, side, pnl, brokerage, status, created_at')
      .in('status', ['closed', 'CLOSED'])
      .in('user_id', targetUserIds);

    let pendingOrdersQuery = adminClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['PENDING', 'TRIGGER_PENDING', 'OPEN', 'SUBMITTING'])
      .in('user_id', targetUserIds);

    let todayPosQuery = adminClient
      .from('positions')
      .select('id, user_id, pnl, brokerage, status, created_at')
      .gte('created_at', todayIso)
      .in('user_id', targetUserIds);

    let payQuery = adminClient
      .from('pay_requests')
      .select('id, user_id, amount, type, status, created_at')
      .in('user_id', targetUserIds);

    if (dateFrom) {
      const fromIso = new Date(dateFrom).toISOString();
      closedPosQuery = closedPosQuery.gte('created_at', fromIso);
      payQuery = payQuery.gte('created_at', fromIso);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      const toIso = toDate.toISOString();
      closedPosQuery = closedPosQuery.lte('created_at', toIso);
      payQuery = payQuery.lte('created_at', toIso);
    }

    const [
      openPosRes,
      closedPosRes,
      pendingOrdersRes,
      todayPosRes,
      payRes,
    ] = await Promise.all([
      openPosQuery,
      closedPosQuery,
      pendingOrdersQuery,
      todayPosQuery,
      payQuery,
    ]);

    const totalUsers = scopedProfiles.length;
    const activeUsers = scopedProfiles.filter((p: any) => p.active !== false).length;
    const totalBalance = scopedProfiles.reduce((sum: number, p: any) => sum + (Number(p.balance) || 0), 0);
    const usersAddedFunds = scopedProfiles.filter((p: any) => (Number(p.balance) || 0) > 0).length;
    const conversionRate = totalUsers > 0 ? ((usersAddedFunds / totalUsers) * 100).toFixed(1) : '0';

    const openPositions = openPosRes.data ?? [];
    const closedPositions = closedPosRes.data ?? [];
    const pendingOrders = pendingOrdersRes.count ?? 0;

    const buyPositions = openPositions.filter((p: any) => (p.side || '').toUpperCase() === 'BUY').length;
    const sellPositions = openPositions.filter((p: any) => (p.side || '').toUpperCase() === 'SELL').length;

    const m2m = openPositions.reduce((sum: number, p: any) => sum + (Number(p.pnl) || 0), 0);
    const closedPnl = closedPositions.reduce((sum: number, p: any) => sum + (Number(p.pnl) || 0), 0);
    const netPnl = m2m + closedPnl;

    const openBrokerage = openPositions.reduce((sum: number, p: any) => sum + (Number(p.brokerage) || 0), 0);
    const closedBrokerage = closedPositions.reduce((sum: number, p: any) => sum + (Number(p.brokerage) || 0), 0);
    const totalBrokerage = openBrokerage + closedBrokerage;
    const marginUsed = openPositions.reduce((sum: number, p: any) => sum + (Number(p.locked_margin) || 0), 0);

    const allPositions = [...openPositions, ...closedPositions];
    const winning = allPositions.filter((p: any) => Number(p.pnl) > 0);
    const losing = allPositions.filter((p: any) => Number(p.pnl) < 0);
    const avgProfit = winning.length ? winning.reduce((s: number, p: any) => s + Number(p.pnl), 0) / winning.length : 0;
    const avgLoss = losing.length ? Math.abs(losing.reduce((s: number, p: any) => s + Number(p.pnl), 0) / losing.length) : 0;

    // Client profitability
    const pnlByUser = new Map<string, number>();
    allPositions.forEach((p: any) => {
      if (p.user_id) {
        pnlByUser.set(p.user_id, (pnlByUser.get(p.user_id) || 0) + (Number(p.pnl) || 0));
      }
    });
    let profitableClients = 0;
    let lossMakingClients = 0;
    pnlByUser.forEach((userPnl) => {
      if (userPnl > 0) profitableClients++;
      else if (userPnl < 0) lossMakingClients++;
    });

    const payRequests = payRes.data ?? [];
    const approvedDeposits = payRequests.filter((p: any) => p.type === 'DEPOSIT' && String(p.status || '').toUpperCase() === 'APPROVED');
    const approvedWithdrawals = payRequests.filter((p: any) => p.type === 'WITHDRAWAL' && String(p.status || '').toUpperCase() === 'APPROVED');
    const totalDeposits = approvedDeposits.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const totalWithdrawals = approvedWithdrawals.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const avgDeposit = approvedDeposits.length ? totalDeposits / approvedDeposits.length : 0;
    const avgWithdrawal = approvedWithdrawals.length ? totalWithdrawals / approvedWithdrawals.length : 0;

    const pendingPay = payRequests.filter((p: any) => String(p.status || '').toUpperCase() === 'PENDING');
    const pendingDeposits = pendingPay.filter((p: any) => p.type === 'DEPOSIT').length;
    const pendingWithdrawals = pendingPay.filter((p: any) => p.type === 'WITHDRAWAL').length;

    const todayPositions = todayPosRes.data ?? [];
    const totalPnlToday = todayPositions.reduce((sum: number, p: any) => sum + (Number(p.pnl) || 0), 0);
    const totalBrokerageToday = todayPositions.reduce((sum: number, p: any) => sum + (Number(p.brokerage) || 0), 0);

    const metrics = {
      ledger_balance: totalBalance,
      net_balance: totalBalance,
      mark_to_market: m2m,
      net_pnl: netPnl,
      total_brokerage: totalBrokerage,
      margin_used: marginUsed,
      net: totalDeposits - totalWithdrawals,
      total_deposits: totalDeposits,
      total_withdrawals: totalWithdrawals,
      avg_deposit: avgDeposit,
      avg_withdrawal: avgWithdrawal,
      avg_profit: avgProfit,
      avg_loss: avgLoss,
      profitable_clients: profitableClients,
      loss_making_clients: lossMakingClients,
      buy_position_count: buyPositions,
      sell_position_count: sellPositions,
      registered: totalUsers,
      added_funds: usersAddedFunds,
      conversion: `${conversionRate}%`,
    };

    return NextResponse.json({
      ...metrics,
      stats: {
        total_users: totalUsers,
        active_users: activeUsers,
        open_positions: openPositions.length,
        pending_orders: pendingOrders,
        total_balance: totalBalance,
        total_pnl_today: totalPnlToday,
        total_brokerage_today: totalBrokerageToday,
        pending_deposits: pendingDeposits,
        pending_withdrawals: pendingWithdrawals,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/admin/dashboard] Error:', err);
    return NextResponse.json({ error: 'Failed to compute dashboard stats' }, { status: 500 });
  }
}
