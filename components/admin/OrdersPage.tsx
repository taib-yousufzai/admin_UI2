'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { signOut } from '@/lib/auth';
import { apiCall, Toast, ToastState, ConfirmDialog } from './AdminUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Order = {
  id: string;
  user_id: string;
  user_name?: string;
  user_client_id?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  status: 'EXECUTED' | 'CANCELLED' | 'REJECTED' | 'PENDING';
  qty: number;
  price: number;
  orderType: 'MARKET' | 'LIMIT';
  info: string;
  time: string;
};

type ViewMode = 'user' | 'global';
type TabKey = 'executed' | 'limit' | 'rejected' | 'pending';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return iso;
  }
}

function exportToCsv(orders: Order[], filename = 'orders.csv') {
  const headers = ['Symbol', 'User ID', 'Side', 'Status', 'Qty', 'Price', 'Type', 'Info', 'Time'];
  const rows = orders.map(o => [
    o.symbol, o.user_id, o.side, o.status, o.qty,
    o.price.toFixed(2), o.orderType,
    `"${o.info.replace(/"/g, "'")}"`, o.time,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function getRoleTag(role: string) {
  const map: Record<string, string> = {
    super_admin: 'super', admin: 'admin', broker: 'broker',
    sub_broker: 'subbroker', user: 'user', client: 'user',
  };
  return map[role] ?? 'user';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdersPage({ selectedUser, onOpenUserPanel, isDemoMode }: {
  selectedUser: { id: string; role: string; client_id?: string };
  onOpenUserPanel?: () => void;
  isDemoMode: boolean;
}) {
  const [tab, setTab] = useState<TabKey>('executed');
  const [viewMode, setViewMode] = useState<ViewMode>(selectedUser?.id ? 'user' : 'global');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState('50');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmDialog, setConfirmDialog] = useState<'squareOff' | 'cancelAll' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [usersList, setUsersList] = useState<{ id: string; role: string; full_name?: string }[]>([]);
  const [collapsedUsers, setCollapsedUsers] = useState<Record<string, boolean>>({});
  const exportRef = useRef<HTMLDivElement>(null);

  const uid = selectedUser?.id;
  const isGlobal = viewMode === 'global' || !uid;

  useEffect(() => {
    if (selectedUser?.id) {
      setViewMode('user');
    }
  }, [selectedUser?.id]);

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch users list for filter panel
  useEffect(() => {
    apiCall(`/api/admin/users?demo=${isDemoMode}`, { method: 'GET' }).then(({ ok, data }) => {
      if (ok) setUsersList(data as { id: string; role: string; full_name?: string }[]);
    });
  }, [isDemoMode]);

  // ── Fetch orders ─────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(() => {
    const query = `tab=${encodeURIComponent(tab)}&rows=${rows}&page=${page}${dateFrom ? `&dateFrom=${dateFrom}` : ''}${dateTo ? `&dateTo=${dateTo}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}&demo=${String(isDemoMode)}`;
    const endpoint = isGlobal
      ? `/api/admin/orders?${query}`
      : uid ? `/api/admin/users/${uid}/orders?${query}` : `/api/admin/orders?${query}`;
    if (!endpoint) return;

    setLoading(true);
    apiCall(endpoint, { method: 'GET' })
      .then(({ ok, status, data }) => {
        if (status === 401) { signOut(); return; }
        if (status === 403) { setToast({ message: 'Access Denied', type: 'error' }); return; }
        if (!ok) { setToast({ message: 'Failed to load orders', type: 'error' }); return; }

        const rawOrders = (data as { orders: Record<string, unknown>[]; total: number }).orders ?? [];
        const rawTotal = (data as { orders: Record<string, unknown>[]; total: number }).total ?? rawOrders.length;

        const items = (rawOrders as {
          id: string; user_id?: string; user_name?: string; user_client_id?: string;
          symbol: string; side: string; status: string; qty: number; price: number;
          order_type: string; info: string; created_at?: string; time?: string;
        }[]).map(r => ({
          id: r.id,
          user_id: r.user_id ?? uid,
          user_name: r.user_name ?? '',
          user_client_id: r.user_client_id ?? '',
          symbol: r.symbol,
          side: r.side as Order['side'],
          status: r.status as Order['status'],
          qty: r.qty,
          price: r.price,
          orderType: r.order_type as Order['orderType'],
          info: r.info ?? '',
          time: r.created_at ?? r.time ?? '',
        }));

        setOrders(items);
        setTotal(rawTotal);
      })
      .catch((err: unknown) => {
        setToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' });
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, tab, rows, page, dateFrom, dateTo, search, isGlobal, refreshKey, isDemoMode]);

  useEffect(() => { setTimeout(() => fetchOrders(), 0); }, [fetchOrders]);

  // ── Emergency actions ─────────────────────────────────────────────────────────

  const handleSquareOffAll = async () => {
    setActionLoading(true);
    try {
      const { ok, data } = await apiCall('/api/admin/orders/square-off-all', { method: 'POST' });
      if (!ok) { setToast({ message: 'Square-off failed', type: 'error' }); return; }
      const count = (data as { squaredOff: number })?.squaredOff ?? 0;
      setToast({ message: `${count} positions squared off`, type: 'success' });
      setRefreshKey(k => k + 1);
    } catch { setToast({ message: 'Network error', type: 'error' }); }
    finally { setActionLoading(false); setConfirmDialog(null); }
  };

  const handleCancelAll = async () => {
    setActionLoading(true);
    try {
      const { ok, data } = await apiCall('/api/admin/orders/cancel-all', { method: 'POST' });
      if (!ok) { setToast({ message: 'Cancel-all failed', type: 'error' }); return; }
      const count = (data as { cancelled: number })?.cancelled ?? 0;
      setToast({ message: `${count} orders cancelled`, type: 'success' });
      setRefreshKey(k => k + 1);
    } catch { setToast({ message: 'Network error', type: 'error' }); }
    finally { setActionLoading(false); setConfirmDialog(null); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const buyCount = orders.filter(o => o.side === 'BUY').length;
  const sellCount = orders.filter(o => o.side === 'SELL').length;
  const totalPages = Math.max(1, Math.ceil(total / Number(rows)));

  const tabs = [
    { key: 'executed' as TabKey, label: 'Executed', count: tab === 'executed' ? orders.length : 0 },
    { key: 'pending'  as TabKey, label: 'Pending',  count: tab === 'pending'  ? orders.length : 0 },
    { key: 'limit'    as TabKey, label: 'Limit / Cancelled', count: tab === 'limit' ? orders.length : 0 },
    { key: 'rejected' as TabKey, label: 'Rejected', count: tab === 'rejected' ? orders.length : 0 },
  ];

  // Group orders by user for user-grouped cards view
  const groupedByUser: Record<string, Order[]> = {};
  orders.forEach(o => {
    const key = o.user_name || o.user_id;
    if (!groupedByUser[key]) groupedByUser[key] = [];
    groupedByUser[key].push(o);
  });

  const filteredUsers = usersList.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !userSearch || u.id.toLowerCase().includes(userSearch.toLowerCase()) || (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  const contextLabel = isGlobal ? 'All Platform' : (uid ? `${selectedUser.client_id || uid.slice(0, 8).toUpperCase()}` : 'Select User');

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="ord-root">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {confirmDialog === 'squareOff' && (
        <ConfirmDialog
          message="SQUARE OFF ALL — This will force-close every open position across the entire platform. This action cannot be undone."
          onConfirm={handleSquareOffAll}
          onCancel={() => setConfirmDialog(null)}
          loading={actionLoading}
        />
      )}
      {confirmDialog === 'cancelAll' && (
        <ConfirmDialog
          message="CANCEL ALL — This will cancel every pending LIMIT order across the entire platform. This action cannot be undone."
          onConfirm={handleCancelAll}
          onCancel={() => setConfirmDialog(null)}
          loading={actionLoading}
        />
      )}

      {/* Filter Overlay */}
      {filterOpen && (
        <div className="ord-filter-overlay" onClick={() => setFilterOpen(false)}>
          <div className="ord-filter-panel" onClick={e => e.stopPropagation()}>
            <div className="ord-filter-header">
              <h3>Select User</h3>
              <button className="ord-close-btn" onClick={() => setFilterOpen(false)}>✕</button>
            </div>
            <div className="ord-filter-grid">
              <div className="ord-filter-group">
                <label>Role</label>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="broker">Broker</option>
                  <option value="sub_broker">Sub Broker</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div className="ord-filter-group">
                <label>Search User</label>
                <input
                  type="text"
                  placeholder="Name or ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="ord-users-list-section">
              <div className="ord-users-list-title">
                <span>All Users</span>
                <span className="ord-count-badge">{filteredUsers.length} users</span>
              </div>
              <div className="ord-users-list">
                <div
                  className="ord-user-list-item"
                  onClick={() => { setViewMode('global'); setFilterOpen(false); }}
                >
                  <div className="ord-user-info">
                    <span className="ord-user-name">All Platform</span>
                    <span className="ord-user-id">View all orders</span>
                  </div>
                  <span className={`ord-role-tag super`}>super</span>
                </div>
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    className="ord-user-list-item"
                    onClick={() => { setViewMode('user'); setFilterOpen(false); }}
                  >
                    <div className="ord-user-info">
                      <span className="ord-user-name">{u.full_name || u.id}</span>
                      <span className="ord-user-id">{u.id}</span>
                    </div>
                    <span className={`ord-role-tag ${getRoleTag(u.role)}`}>{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ord-filter-actions">
              <button className="ord-btn-refresh" onClick={() => { setRefreshKey(k => k + 1); setFilterOpen(false); }}>
                Refresh Data
              </button>
              <button className="ord-btn-primary" onClick={() => setFilterOpen(false)}>
                Apply &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="ord-panel">

        {/* Trades Header */}
        <div className="ord-trades-header">
          <div className="ord-title-section">
            <h2>All Orders</h2>
          </div>
          <div className="ord-header-actions">
            {/* User context pill */}
            <div className="ord-user-context" onClick={() => setFilterOpen(true)}>
              <span className="ord-context-label">Viewing:</span>
              <span className="ord-context-name">{contextLabel}</span>
              <span className="ord-context-role">{isGlobal ? 'all' : selectedUser.role}</span>
              <span className="ord-context-arrow">▾</span>
            </div>

            {/* Danger buttons */}
            <button className="ord-danger-btn" onClick={() => setConfirmDialog('squareOff')} title="Force-close all open positions">
              <i className="fas fa-times-circle" /> Square Off All
            </button>
            <button className="ord-warning-btn" onClick={() => setConfirmDialog('cancelAll')} title="Cancel all pending limit orders">
              <i className="fas fa-ban" /> Cancel All
            </button>

            {/* Export dropdown */}
            <div className="ord-export-wrapper" ref={exportRef}>
              <button className="ord-export-btn" onClick={() => setExportOpen(v => !v)}>
                <i className="fas fa-file-export" /> Export ▾
              </button>
              {exportOpen && (
                <div className="ord-export-dropdown">
                  <button className="ord-dropdown-item" onClick={() => { exportToCsv(orders, `orders-${tab}-${new Date().toISOString().slice(0,10)}.csv`); setExportOpen(false); }}>
                    <i className="fas fa-file-csv" /> Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="ord-summary-cards">
          <div className="ord-summary-card">
            <div className="ord-card-label">Total Orders</div>
            <div className="ord-card-value">{total || orders.length}</div>
            <div className="ord-card-sub">open + closed</div>
          </div>
          <div className="ord-summary-card">
            <div className="ord-card-label">Buy Orders</div>
            <div className="ord-card-value ord-green">{buyCount}</div>
            <div className="ord-card-sub">in current view</div>
          </div>
          <div className="ord-summary-card">
            <div className="ord-card-label">Sell Orders</div>
            <div className="ord-card-value ord-red">{sellCount}</div>
            <div className="ord-card-sub">in current view</div>
          </div>
          <div className="ord-summary-card">
            <div className="ord-card-label">Page</div>
            <div className="ord-card-value">{page} / {totalPages}</div>
            <div className="ord-card-sub">of results</div>
          </div>
        </div>

        {/* Segment Tabs */}
        <div className="ord-segment-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`ord-tab-btn${tab === t.key ? ' active' : ''}`}
              onClick={() => { setTab(t.key); setPage(1); }}
            >
              {t.label}
              {tab === t.key && <span className="ord-badge-count">{orders.length}</span>}
            </button>
          ))}

          {/* Date filters in tab row */}
          <div className="ord-tab-date-group">
            <input
              type="date"
              className="ord-date-input"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            />
            <span className="ord-date-sep">–</span>
            <input
              type="date"
              className="ord-date-input"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
            />
            {(dateFrom || dateTo) && (
              <button className="ord-date-clear" onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}>✕</button>
            )}
          </div>

          {/* Search + rows */}
          <div className="ord-tab-search-group">
            <input
              className="ord-search-input"
              placeholder="Search symbol…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <select className="ord-rows-select" value={rows} onChange={e => { setRows(e.target.value); setPage(1); }}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
            <button className="ord-refresh-btn" onClick={() => setRefreshKey(k => k + 1)} title="Refresh">
              <i className="fas fa-sync-alt" />
            </button>
          </div>
        </div>

        {/* Content: grouped user cards or flat table */}
        {loading ? (
          <div className="ord-loading-state">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ord-skeleton-card">
                <div className="ord-skeleton-header" />
                <div className="ord-skeleton-rows">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <div key={j} className="ord-skeleton-row" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="ord-empty-state">
            <i className="fas fa-inbox" style={{ fontSize: '2rem', opacity: 0.25, display: 'block', marginBottom: 10 }} />
            No orders found for this selection
          </div>
        ) : isGlobal ? (
          /* Grouped by user cards */
          <div className="ord-user-cards">
            {Object.entries(groupedByUser).map(([userKey, userOrders]) => {
              const first = userOrders[0];
              const isCollapsed = collapsedUsers[userKey];
              const userBuy = userOrders.filter(o => o.side === 'BUY').length;
              const userSell = userOrders.filter(o => o.side === 'SELL').length;
              return (
                <div key={userKey} className="ord-user-card">
                  <div className="ord-user-card-header" onClick={() => setCollapsedUsers(prev => ({ ...prev, [userKey]: !prev[userKey] }))}>
                    <div className="ord-user-info">
                      <span className="ord-user-name-big">{first.user_name || userKey}</span>
                      {first.user_client_id && <span className="ord-user-id-tag">{first.user_client_id}</span>}
                    </div>
                    <div className="ord-order-counts">
                      <div className="ord-count-item">
                        <span className="ord-count-label">BUY</span>
                        <span className="ord-count-value ord-green">{userBuy}</span>
                      </div>
                      <div className="ord-count-item">
                        <span className="ord-count-label">SELL</span>
                        <span className="ord-count-value ord-red">{userSell}</span>
                      </div>
                      <div className="ord-count-item">
                        <span className="ord-count-label">TOTAL</span>
                        <span className="ord-count-value">{userOrders.length}</span>
                      </div>
                    </div>
                    <span className="ord-collapse-icon">{isCollapsed ? '▸' : '▾'}</span>
                  </div>
                  {!isCollapsed && (
                    <div className="ord-card-content">
                      <OrderTable orders={userOrders} showUser={false} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Single user flat table */
          <div className="ord-user-card">
            <div className="ord-user-card-header" style={{ cursor: 'default' }}>
              <div className="ord-user-info">
                <span className="ord-user-name-big">{selectedUser.client_id || uid.slice(0, 12)}</span>
                <span className="ord-user-id-tag">{selectedUser.role}</span>
              </div>
              <div className="ord-order-counts">
                <div className="ord-count-item">
                  <span className="ord-count-label">BUY</span>
                  <span className="ord-count-value ord-green">{buyCount}</span>
                </div>
                <div className="ord-count-item">
                  <span className="ord-count-label">SELL</span>
                  <span className="ord-count-value ord-red">{sellCount}</span>
                </div>
                <div className="ord-count-item">
                  <span className="ord-count-label">TOTAL</span>
                  <span className="ord-count-value">{orders.length}</span>
                </div>
              </div>
              {onOpenUserPanel && (
                <button className="ord-change-user-btn" onClick={e => { e.stopPropagation(); onOpenUserPanel(); }}>
                  Change User
                </button>
              )}
            </div>
            <div className="ord-card-content">
              <OrderTable orders={orders} showUser={false} />
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="ord-pagination">
            <button className="ord-page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="ord-page-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
            <span className="ord-page-info">Page {page} of {totalPages}</span>
            <button className="ord-page-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
            <button className="ord-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        )}

        <div className="ord-footer-note">
          {orders.length} orders shown · {new Date().toLocaleTimeString('en-IN')}
        </div>
      </div>
    </div>
  );
}

// ─── Order Table Subcomponent ─────────────────────────────────────────────────

function OrderTable({ orders, showUser }: { orders: Order[]; showUser: boolean }) {
  return (
    <div className="ord-table-wrap">
      <table className="ord-table">
        <thead>
          <tr>
            <th>Symbol</th>
            {showUser && <th>User</th>}
            <th>Side</th>
            <th>Status</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Type</th>
            <th>Info</th>
            <th style={{ textAlign: 'right' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr key={o.id ?? i}>
              <td data-label="Symbol"><span className="ord-sym-badge">{o.symbol}</span></td>
              {showUser && (
                <td data-label="User">
                  <span className="ord-user-badge" title={o.user_id}>{o.user_name || o.user_id.slice(0, 8) + '…'}</span>
                  {o.user_client_id && <div className="ord-user-sub-id">{o.user_client_id}</div>}
                </td>
              )}
              <td data-label="Side"><span className={`ord-side ${o.side.toLowerCase()}`}>{o.side}</span></td>
              <td data-label="Status"><span className={`ord-status ${o.status.toLowerCase()}`}>{o.status}</span></td>
              <td data-label="Qty">{o.qty}</td>
              <td data-label="Price">{(o.price ?? 0).toFixed(2)}</td>
              <td data-label="Type"><span className="ord-type-badge">{o.orderType}</span></td>
              <td data-label="Info" className="ord-info-cell">{o.info || '—'}</td>
              <td data-label="Time" style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="ord-time-cell">
                {formatTime(o.time)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
