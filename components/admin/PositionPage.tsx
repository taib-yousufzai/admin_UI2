'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { signOut } from '@/lib/auth';
import { apiCall, Toast, ToastState, ConfirmDialog, SkeletonLine, Position, PositionItem, positionItemToPosition } from './AdminUtils';
import { useMarketQuotes } from '@/hooks/useMarketQuotes';
import { useComexQuotes } from '@/hooks/useComexQuotes';

export default function PositionPage({ selectedUser, onOpenUserPanel, isDemoMode }: { selectedUser: { id: string; role: string; client_id?: string }, onOpenUserPanel?: () => void, isDemoMode: boolean }) {
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeframe, setTimeframe] = useState<'daily'|'weekly'|'monthly'|'custom'>('daily');
  const [rows, setRows] = useState('50');
  const [page, setPage] = useState(1);
  const [positions, setPositions] = useState<Position[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editPos, setEditPos] = useState<Position | null>(null);
  
  // Edit states
  const [editSl, setEditSl] = useState('');
  const [editTp, setEditTp] = useState('');
  const [editQtyOpen, setEditQtyOpen] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');
  const [editExitPrice, setEditExitPrice] = useState('');
  const [editQtyTotal, setEditQtyTotal] = useState('');
  const [editBrokerage, setEditBrokerage] = useState('');
  const [editSettlement, setEditSettlement] = useState('');
  const [editStatus, setEditStatus] = useState<'open' | 'active' | 'closed'>('open');
  const [editSide, setEditSide] = useState<'BUY' | 'SELL'>('BUY');
  
  const [weeklyPnl, setWeeklyPnl] = useState<number>(0);
  
  // View states
  const [viewMode, setViewMode] = useState<'user' | 'global'>('user');
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [usersList, setUsersList] = useState<{ id: string; role: string; full_name?: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [collapsedUsers, setCollapsedUsers] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Multi-select bulk state
  const [selectedPosIds, setSelectedPosIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelectPosition = (id: string) => {
    setSelectedPosIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPosIds.size === displayed.length) {
      setSelectedPosIds(new Set());
    } else {
      setSelectedPosIds(new Set(displayed.map(p => p.id)));
    }
  };

  const exportRef = useRef<HTMLDivElement>(null);
  const uid = selectedUser.id;
  const isGlobal = viewMode === 'global';

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch users for filter overlay
  useEffect(() => {
    apiCall(`/api/admin/users?demo=${isDemoMode}`, { method: 'GET' }).then(({ ok, data }) => {
      if (ok && Array.isArray(data)) {
        setUsersList(data as { id: string; role: string; full_name?: string; weeklyPnl?: number }[]);
        if (!uid) {
          setWeeklyPnl(data.reduce((sum, u) => sum + (u.weeklyPnl || 0), 0));
        } else {
          const u = data.find(x => x.id === uid);
          if (u && typeof u.weeklyPnl === 'number') setWeeklyPnl(u.weeklyPnl);
        }
      }
    });
  }, [uid, isDemoMode]);

  const fetchPositions = useCallback((silent = false) => {
    const endpointId = isGlobal ? 'all' : (uid || 'all');
    if (!silent) setPosLoading(true);
    let url = `/api/admin/users/${endpointId}/positions?tab=${encodeURIComponent(tab)}&rows=100000&demo=${isDemoMode}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    
    apiCall(url, { method: 'GET' })
      .then(({ ok, status, data }) => {
        if (status === 401) { signOut(); return; }
        if (status === 403) { setToast({ message: 'Access Denied', type: 'error' }); return; }
        if (!ok) { setToast({ message: 'Server Error', type: 'error' }); return; }
        const items = data as PositionItem[];
        setPositions(items.map(positionItemToPosition));
      })
      .catch((err: unknown) => {
        if (!silent) setToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' });
      })
      .finally(() => {
        if (!silent) setPosLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, tab, isDemoMode, startDate, endDate, isGlobal, refreshKey]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPositions(true); // silent refresh
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // Smartly resolve Kite instrument prefixes if they are missing
  const resolveKitePrefix = useCallback((key: string, settlementType: string) => {
    let baseKey = key;
    if (baseKey.includes(':')) {
      baseKey = baseKey.split(':').slice(1).join(':'); // Strip existing prefix
    }
    const seg = (settlementType || '').toUpperCase();
    let prefix = 'NSE:';
    if (baseKey.startsWith('SENSEX') || baseKey.startsWith('BANKEX')) prefix = 'BFO:';
    else if (seg.includes('MCX') || baseKey.match(/^(CRUDEOIL|NATGAS|SILVER|GOLD|COPPER|ZINC|ALUMINIUM|LEAD|MENTHAOIL)/)) prefix = 'MCX:';
    else if (seg.includes('NCO')) prefix = 'NCO:';
    else if (seg.includes('CDS') || seg.includes('FOREX') || baseKey.match(/^(USDINR|EURINR|GBPINR|JPYINR)/)) prefix = 'CDS:';
    else if (seg.includes('BSE') || seg.includes('BFO')) prefix = 'BFO:';
    else if (seg.includes('OPT') || seg.includes('FUT') || seg.includes('NFO')) prefix = 'NFO:';

    if (prefix === 'BFO:' && !baseKey.match(/\d/)) prefix = 'BSE:';
    if (prefix === 'NFO:' && !baseKey.match(/\d/)) prefix = 'NSE:';

    return `${prefix}${baseKey}`;
  }, []);

  // Group instrument keys to subscribe to quotes
  const { kiteKeys, binanceKeys, comexKeys } = useMemo(() => {
    const kite: string[] = [];
    const binance: string[] = [];
    const comex: string[] = [];

    positions.filter(p => p.status === 'open' || p.status === 'active').forEach(p => {
      const seg = (p.settlement || '').toUpperCase();
      if (seg.includes('CRYPTO') || seg === 'USDT' || (p.symbol && p.symbol.endsWith('USDT'))) {
        let sym = (p.symbol || '').replace('/', '');
        if (!sym.endsWith('USDT')) sym = sym + 'USDT';
        binance.push(sym);
      } else if (seg.includes('COMEX') || (p.symbol && p.symbol.endsWith('=F'))) {
        comex.push(p.symbol);
      } else {
        kite.push(resolveKitePrefix(p.symbol, p.settlement || ''));
      }
    });
    return { kiteKeys: kite, binanceKeys: binance, comexKeys: comex };
  }, [positions, resolveKitePrefix]);

  const marketSymbols = useMemo(() => [...kiteKeys, ...binanceKeys], [kiteKeys, binanceKeys]);
  const { quotes: marketQuotes } = useMarketQuotes(marketSymbols);
  const { quotes: comexQuotes } = useComexQuotes(comexKeys);

  const enrichedPositions = useMemo(() => {
    return positions.map(p => {
      if (p.status !== 'open' && p.status !== 'active') return p;
      const seg = (p.settlement || '').toUpperCase();
      let liveLtp = p.ltp || p.entry;

      if (seg.includes('CRYPTO') || seg === 'USDT' || (p.symbol && p.symbol.endsWith('USDT'))) {
        let binanceKey = (p.symbol || '').replace('/', '');
        if (!binanceKey.endsWith('USDT')) binanceKey = binanceKey + 'USDT';
        liveLtp = marketQuotes[binanceKey]?.lastPrice ?? liveLtp;
      } else if (seg.includes('COMEX') || (p.symbol && p.symbol.endsWith('=F'))) {
        liveLtp = comexQuotes[p.symbol]?.lastPrice ?? liveLtp;
      } else {
        const kiteKey = resolveKitePrefix(p.symbol, p.settlement || '');
        liveLtp = marketQuotes[kiteKey]?.lastPrice ?? liveLtp;
      }

      const qtyOpen = Number(p.qty.split('/')[0]) || 0;
      let livePnl = p.pnl;
      if (qtyOpen > 0) {
        if (p.side === 'BUY') livePnl = (liveLtp - p.avgPrice) * qtyOpen;
        else livePnl = (p.avgPrice - liveLtp) * qtyOpen;
      }
      return { ...p, ltp: liveLtp, pnl: livePnl };
    });
  }, [positions, marketQuotes, comexQuotes, resolveKitePrefix]);

  // Derived calculations
  const filtered = enrichedPositions.filter(p =>
    p.symbol.toLowerCase().includes(search.toLowerCase()) ||
    (p.client_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.user_id || '').toLowerCase().includes(search.toLowerCase())
  );

  const openPnl = filtered.reduce((s, p) => s + (p.status === 'open' || p.status === 'active' ? (p.pnl || 0) : 0), 0);
  const closedPnl = filtered.reduce((s, p) => s + (p.status === 'closed' ? (p.pnl || 0) : 0), 0);
  const ledger = filtered.reduce((s, p) => s + (p.pnl || 0), 0);

  const rowsNum = Number(rows);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsNum));
  const displayed = filtered.slice((page - 1) * rowsNum, page * rowsNum);

  // Users Filter logic
  const filteredUsers = usersList.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !userSearch || u.id.toLowerCase().includes(userSearch.toLowerCase()) || (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  // Grouped user view
  const groupedByUser: Record<string, Position[]> = {};
  displayed.forEach(p => {
    const key = p.user_name || p.user_id || 'Unknown';
    if (!groupedByUser[key]) groupedByUser[key] = [];
    groupedByUser[key].push(p);
  });

  // Export
  const exportToCsv = () => {
    const headers = ['Symbol', 'User', 'Side', 'Status', 'Qty', 'Entry', 'LTP/Exit', 'P&L', 'Time'];
    const r = filtered.map(o => [
      o.symbol, o.user_id, o.side, o.status, o.qty, o.avgPrice.toFixed(2), 
      o.status === 'closed' ? (o.exit || 0).toFixed(2) : (o.ltp || 0).toFixed(2),
      (o.pnl || 0).toFixed(2), o.created_at || ''
    ]);
    const csv = [headers, ...r].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `positions-${tab}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  // Actions
  const handleSqoff = (posId: string) => {
    apiCall(`/api/admin/positions/${posId}/sqoff`, { method: 'POST' })
      .then(({ ok, status }) => {
        if (status === 401) { signOut(); return; }
        if (status === 403) { setToast({ message: 'Access Denied', type: 'error' }); return; }
        if (!ok) { setToast({ message: 'Server Error', type: 'error' }); return; }
        setToast({ message: 'Square off successful', type: 'success' });
        fetchPositions();
      })
      .catch((err: unknown) => setToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' }));
  };

  const handleBulkSqoff = async () => {
    if (selectedPosIds.size === 0) return;
    setBulkLoading(true);
    let successCount = 0;
    const ids = Array.from(selectedPosIds);
    for (const id of ids) {
      try {
        const { ok } = await apiCall(`/api/admin/positions/${id}/sqoff`, { method: 'POST' });
        if (ok) successCount++;
      } catch {
        // continue with other positions
      }
    }
    setBulkLoading(false);
    setSelectedPosIds(new Set());
    setToast({ message: `Successfully squared off ${successCount} of ${ids.length} positions`, type: 'success' });
    fetchPositions();
  };

  const handleBulkExport = () => {
    const selectedPositions = filtered.filter(p => selectedPosIds.has(p.id));
    if (selectedPositions.length === 0) return;
    const headers = ['Symbol', 'User', 'Side', 'Status', 'Qty', 'Avg Price', 'LTP/Exit', 'P&L'];
    const rows = selectedPositions.map(p => [
      p.symbol,
      p.user_name || p.user_id,
      p.side,
      p.status,
      p.qty,
      p.avgPrice.toFixed(2),
      p.status === 'closed' ? (p.exit || 0).toFixed(2) : (p.ltp || 0).toFixed(2),
      (p.pnl || 0).toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-positions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    setDeleteLoading(true);
    apiCall(`/api/admin/positions/${confirmDeleteId}`, { method: 'DELETE' })
      .then(({ ok, status }) => {
        if (status === 401) { signOut(); return; }
        if (status === 403) { setToast({ message: 'Access Denied', type: 'error' }); return; }
        if (!ok) { setToast({ message: 'Failed to delete position', type: 'error' }); return; }
        setToast({ message: 'Position deleted successfully', type: 'success' });
        fetchPositions();
      })
      .catch(() => setToast({ message: 'Network error', type: 'error' }))
      .finally(() => {
        setDeleteLoading(false);
        setConfirmDeleteId(null);
      });
  };

  const saveEdit = () => {
    if (!editPos) return;
    apiCall(`/api/admin/positions/${editPos.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        sl: editSl, tp: editTp,
        qtyOpen: editQtyOpen, qtyTotal: editQtyTotal,
        avgPrice: editAvgPrice, exitPrice: editExitPrice,
        brokerage: editBrokerage, settlement: editSettlement,
        status: editStatus, side: editSide
      })
    }).then(({ ok, status }) => {
      if (status === 401) { signOut(); return; }
      if (status === 403) { setToast({ message: 'Access Denied', type: 'error' }); return; }
      if (!ok) { setToast({ message: 'Failed to update position', type: 'error' }); return; }
      setToast({ message: 'Position updated successfully', type: 'success' });
      setEditPos(null);
      fetchPositions();
    }).catch(() => setToast({ message: 'Network error', type: 'error' }));
  };

  const openEdit = (p: Position) => {
    setEditPos(p);
    setEditSl(p.slTp.split(' / ')[0] === '–' ? '' : p.slTp.split(' / ')[0]);
    setEditTp(p.slTp.split(' / ')[1] === '–' ? '' : p.slTp.split(' / ')[1]);
    setEditQtyOpen(p.qty.split('/')[0]);
    setEditAvgPrice(String(p.avgPrice || 0));
    setEditExitPrice(p.exit !== undefined ? String(p.exit) : '');
    setEditQtyTotal(p.qty.split('/')[1] || p.qty.split('/')[0] || '0');
    setEditBrokerage(String(p.brokerage || 0));
    setEditSettlement(p.settlement || '');
    setEditStatus(p.status);
    setEditSide(p.side as 'BUY' | 'SELL');
  };

  const getRoleTag = (role: string) => {
    const map: Record<string, string> = { super_admin: 'super', admin: 'admin', broker: 'broker', sub_broker: 'subbroker', user: 'user', client: 'user' };
    return map[role] ?? 'user';
  };

  const contextLabel = isGlobal ? 'All Platform' : (uid ? `${selectedUser.client_id || uid.slice(0, 8).toUpperCase()}` : 'Select User');

  return (
    <div className="pos-root">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Dialogs */}
      {confirmDeleteId && (
        <ConfirmDialog
          message="Are you sure you want to delete this position? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deleteLoading}
        />
      )}

      {/* Edit Modal */}
      {editPos && (
        <div className="pos-modal-overlay">
          <div className="pos-modal-box">
            <h3>Edit Trade <span className="pos-modal-sym">{editPos.symbol}</span></h3>
            <div className="pos-modal-grid">
              <div className="pos-form-group">
                <label>Side</label>
                <select value={editSide} onChange={e => setEditSide(e.target.value as 'BUY'|'SELL')}>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div className="pos-form-group">
                <label>Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)}>
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="pos-form-group">
                <label>Qty (Open)</label>
                <input type="number" value={editQtyOpen} onChange={e => setEditQtyOpen(e.target.value)} />
              </div>
              <div className="pos-form-group">
                <label>Qty (Total)</label>
                <input type="number" value={editQtyTotal} onChange={e => setEditQtyTotal(e.target.value)} />
              </div>
              <div className="pos-form-group">
                <label>Avg Price (Entry)</label>
                <input type="number" step="0.01" value={editAvgPrice} onChange={e => setEditAvgPrice(e.target.value)} />
              </div>
              <div className="pos-form-group">
                <label>Exit Price</label>
                <input type="number" step="0.01" value={editExitPrice} onChange={e => setEditExitPrice(e.target.value)} disabled={editStatus !== 'closed'} />
              </div>
              <div className="pos-form-group">
                <label>Stop Loss (SL)</label>
                <input type="number" step="0.01" value={editSl} onChange={e => setEditSl(e.target.value)} />
              </div>
              <div className="pos-form-group">
                <label>Take Profit (TP)</label>
                <input type="number" step="0.01" value={editTp} onChange={e => setEditTp(e.target.value)} />
              </div>
              <div className="pos-form-group">
                <label>Brokerage</label>
                <input type="number" step="0.01" value={editBrokerage} onChange={e => setEditBrokerage(e.target.value)} />
              </div>
              <div className="pos-form-group">
                <label>Settlement Segment</label>
                <input type="text" value={editSettlement} onChange={e => setEditSettlement(e.target.value)} />
              </div>
            </div>
            <div className="pos-modal-actions">
              <button className="pos-btn-cancel" onClick={() => setEditPos(null)}>Cancel</button>
              <button className="pos-btn-save" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Overlay */}
      {filterOpen && (
        <div className="pos-filter-overlay" onClick={() => setFilterOpen(false)}>
          <div className="pos-filter-panel" onClick={e => e.stopPropagation()}>
            <div className="pos-filter-header">
              <h3>Select User</h3>
              <button className="pos-close-btn" onClick={() => setFilterOpen(false)}>✕</button>
            </div>
            <div className="pos-filter-grid">
              <div className="pos-filter-group">
                <label>Role</label>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="broker">Broker</option>
                  <option value="sub_broker">Sub Broker</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div className="pos-filter-group">
                <label>Search User</label>
                <input type="text" placeholder="Name or ID..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
            </div>
            <div className="pos-users-list-section">
              <div className="pos-users-list-title">
                <span>All Users</span>
                <span className="pos-count-badge">{filteredUsers.length} users</span>
              </div>
              <div className="pos-users-list">
                <div className="pos-user-list-item" onClick={() => { setViewMode('global'); setFilterOpen(false); }}>
                  <div className="pos-user-info">
                    <span className="pos-user-name">All Platform</span>
                    <span className="pos-user-id">View all positions</span>
                  </div>
                  <span className="pos-role-tag super">super</span>
                </div>
                {filteredUsers.map(u => (
                  <div key={u.id} className="pos-user-list-item" onClick={() => { setViewMode('user'); setFilterOpen(false); }}>
                    <div className="pos-user-info">
                      <span className="pos-user-name">{u.full_name || u.id}</span>
                      <span className="pos-user-id">{u.id}</span>
                    </div>
                    <span className={`pos-role-tag ${getRoleTag(u.role)}`}>{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pos-filter-actions">
              <button className="pos-btn-refresh" onClick={() => { setRefreshKey(k => k + 1); setFilterOpen(false); }}>Refresh Data</button>
              <button className="pos-btn-primary" onClick={() => setFilterOpen(false)}>Apply &amp; Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="pos-panel">
        
        {/* Trades Header */}
        <div className="pos-trades-header">
          <div className="pos-title-section">
            <h2>Positions</h2>
          </div>
          <div className="pos-header-actions">
            <div className="pos-user-context" onClick={() => setFilterOpen(true)}>
              <span className="pos-context-label">Viewing:</span>
              <span className="pos-context-name">{contextLabel}</span>
              <span className="pos-context-role">{isGlobal ? 'all' : selectedUser.role}</span>
              <span className="pos-context-arrow">▾</span>
            </div>
            {onOpenUserPanel && !isGlobal && (
              <button className="pos-change-user-btn" onClick={() => onOpenUserPanel()}>Change User</button>
            )}
          </div>
        </div>

        {/* Summary Top (Ledger & Timeframe) */}
        <div className="pos-summary-top">
          <span className="pos-summary-label">Ledger</span>
          <div className="pos-pl-timeframe">
            <button className={`pos-tf-btn ${timeframe === 'daily' ? 'active' : ''}`} onClick={() => { setTimeframe('daily'); setStartDate(''); setEndDate(''); }}>Daily</button>
            <button className={`pos-tf-btn ${timeframe === 'weekly' ? 'active' : ''}`} onClick={() => { setTimeframe('weekly'); setStartDate(''); setEndDate(''); }}>Weekly</button>
            <button className={`pos-tf-btn ${timeframe === 'monthly' ? 'active' : ''}`} onClick={() => { setTimeframe('monthly'); setStartDate(''); setEndDate(''); }}>Monthly</button>
            <div className="pos-custom-tf-wrap">
              <input type="date" className="pos-date-input" value={startDate} onChange={e => { setStartDate(e.target.value); setTimeframe('custom'); }} />
              <span className="pos-date-sep">–</span>
              <input type="date" className="pos-date-input" value={endDate} onChange={e => { setEndDate(e.target.value); setTimeframe('custom'); }} />
              {(startDate || endDate) && <button className="pos-date-clear" onClick={() => { setStartDate(''); setEndDate(''); }}>✕</button>}
            </div>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="pos-summary-cards">
          <div className="pos-summary-card">
            <div className="pos-card-label">Total Users</div>
            <div className="pos-card-value">{isGlobal ? usersList.length : 1}</div>
            <div className="pos-card-sub">active</div>
          </div>
          <div className="pos-summary-card">
            <div className="pos-card-label">Open P&amp;L</div>
            <div className={`pos-card-value ${openPnl >= 0 ? 'pos-green' : 'pos-red'}`}>
              ₹{openPnl.toFixed(2)}
            </div>
            <div className="pos-card-sub">unrealized</div>
          </div>
          <div className="pos-summary-card">
            <div className="pos-card-label">Ledger</div>
            <div className={`pos-card-value ${ledger >= 0 ? 'pos-green' : 'pos-red'}`}>
              ₹{ledger.toFixed(2)}
            </div>
            <div className="pos-card-sub">{timeframe}</div>
          </div>
          <div className="pos-summary-card">
            <div className="pos-card-label">Closed P&amp;L</div>
            <div className={`pos-card-value ${closedPnl >= 0 ? 'pos-green' : 'pos-red'}`}>
              ₹{closedPnl.toFixed(2)}
            </div>
            <div className="pos-card-sub">realized</div>
          </div>
        </div>

        {/* Segment Tabs */}
        <div className="pos-segment-tabs">
          <button className={`pos-tab-btn ${tab === 'open' ? 'active' : ''}`} onClick={() => { setTab('open'); setPage(1); }}>
            Open <span className="pos-badge-count">{tab === 'open' ? filtered.length : 0}</span>
          </button>
          <button className={`pos-tab-btn ${tab === 'closed' ? 'active' : ''}`} onClick={() => { setTab('closed'); setPage(1); }}>
            Closed <span className="pos-badge-count">{tab === 'closed' ? filtered.length : 0}</span>
          </button>

          <div className="pos-tab-search-group">
            <input className="pos-search-input" placeholder="Search symbol..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="pos-rows-select" value={rows} onChange={e => { setRows(e.target.value); setPage(1); }}>
              <option value="10">10 rows</option>
              <option value="25">25 rows</option>
              <option value="50">50 rows</option>
              <option value="100">100 rows</option>
            </select>
            <button className="pos-refresh-btn" onClick={() => setRefreshKey(k => k + 1)} title="Refresh"><i className="fas fa-sync-alt" /></button>
          </div>

          <div className="pos-export-wrapper" ref={exportRef}>
            <button className="pos-export-btn" onClick={() => setExportOpen(v => !v)}>⬇ Export</button>
            {exportOpen && (
              <div className="pos-export-dropdown">
                <button className="pos-dropdown-item" onClick={exportToCsv}>Spreadsheet (.csv)</button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {posLoading ? (
          <div className="pos-loading-state">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pos-skeleton-card">
                <div className="pos-skeleton-header" />
                <div className="pos-skeleton-rows">
                  {Array.from({ length: 3 }).map((__, j) => <div key={j} className="pos-skeleton-row" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pos-empty-state">
            <i className="fas fa-inbox" style={{ fontSize: '2rem', opacity: 0.25, display: 'block', marginBottom: 10 }} />
            No positions found
          </div>
        ) : isGlobal ? (
          /* User-grouped trade cards */
          <div className="pos-user-cards">
            {Object.entries(groupedByUser).map(([userKey, userPos]) => {
              const first = userPos[0];
              const isCollapsed = collapsedUsers[userKey];
              const userOpenPnl = userPos.reduce((s, p) => s + (p.status === 'open' ? (p.pnl || 0) : 0), 0);
              const userClosedPnl = userPos.reduce((s, p) => s + (p.status === 'closed' ? (p.pnl || 0) : 0), 0);
              
              return (
                <div key={userKey} className="pos-user-trade-card">
                  <div className="pos-user-header" onClick={() => setCollapsedUsers(prev => ({ ...prev, [userKey]: !prev[userKey] }))}>
                    <div className="pos-user-info">
                      <span className="pos-user-name">{first.user_name || userKey}</span>
                      {first.user_client_id && <span className="pos-user-id">{first.user_client_id}</span>}
                    </div>
                    <div className="pos-user-counts">
                      <div className="pos-count-item">
                        <span className="pos-count-label">POSITIONS</span>
                        <span className="pos-count-value">{userPos.length}</span>
                      </div>
                    </div>
                    <div className="pos-user-stats">
                      <div className="pos-stat-item">
                        <span className="pos-stat-label">Open P&amp;L</span>
                        <span className={`pos-stat-value ${userOpenPnl >= 0 ? 'pos-green' : 'pos-red'}`}>
                          ₹{userOpenPnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="pos-stat-item">
                        <span className="pos-stat-label">Closed P&amp;L</span>
                        <span className={`pos-stat-value ${userClosedPnl >= 0 ? 'pos-green' : 'pos-red'}`}>
                          ₹{userClosedPnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <span className="pos-collapse-icon">{isCollapsed ? '▸' : '▾'}</span>
                  </div>
                  {!isCollapsed && (
                    <div className="pos-trade-content">
                      <PositionTable 
                        positions={userPos} 
                        showUser={false} 
                        onEdit={openEdit} 
                        onDelete={id => setConfirmDeleteId(id)} 
                        onSqoff={handleSqoff} 
                        onReopen={handleReopen} 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Single user flat table */
          <div className="pos-user-trade-card">
            <div className="pos-user-header" style={{ cursor: 'default' }}>
              <div className="pos-user-info">
                <span className="pos-user-name">{selectedUser.client_id || uid.slice(0, 12)}</span>
                <span className="pos-user-id">{selectedUser.role}</span>
              </div>
              <div className="pos-user-counts">
                <div className="pos-count-item">
                  <span className="pos-count-label">TOTAL POSITIONS</span>
                  <span className="pos-count-value">{filtered.length}</span>
                </div>
              </div>
            </div>
            <div className="pos-trade-content">
              <PositionTable 
                positions={displayed} 
                showUser={false} 
                onEdit={openEdit} 
                onDelete={id => setConfirmDeleteId(id)} 
                onSqoff={handleSqoff} 
                onReopen={handleReopen} 
                selectedIds={selectedPosIds}
                onToggleSelect={toggleSelectPosition}
                onToggleSelectAll={toggleSelectAll}
              />
            </div>
          </div>
        )}

        {/* Floating Bulk Action Toolbar */}
        {selectedPosIds.size > 0 && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '10px',
            padding: '10px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            zIndex: 900,
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3' }}>
              <span style={{ color: '#58a6ff', fontWeight: 700 }}>{selectedPosIds.size}</span> Positions Selected
            </span>
            <button
              onClick={handleBulkSqoff}
              disabled={bulkLoading}
              style={{
                padding: '6px 14px',
                background: '#da3633',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {bulkLoading ? 'Squaring Off...' : 'Bulk Square Off'}
            </button>
            <button
              onClick={handleBulkExport}
              style={{
                padding: '6px 14px',
                background: '#21262d',
                color: '#c9d1d9',
                border: '1px solid #30363d',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Export Selected
            </button>
            <button
              onClick={() => setSelectedPosIds(new Set())}
              style={{
                padding: '6px 10px',
                background: 'transparent',
                color: '#8b949e',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ✕ Clear
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pos-pagination">
            <button className="pos-page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="pos-page-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
            <span className="pos-page-info">Page {page} of {totalPages}</span>
            <button className="pos-page-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
            <button className="pos-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        )}

        <div className="pos-footer-note">
          Super Admin · Real-time view · {new Date().toLocaleTimeString('en-IN')}
        </div>
      </div>
    </div>
  );
}

// ─── Position Table Subcomponent ──────────────────────────────────────────────

function PositionTable({ positions, showUser, onEdit, onDelete, onSqoff, onReopen, selectedIds, onToggleSelect, onToggleSelectAll }: { 
  positions: Position[]; 
  showUser: boolean; 
  onEdit: (p: Position) => void;
  onDelete: (id: string) => void;
  onSqoff: (id: string) => void;
  onReopen: (p: Position) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}) {
  const allSelected = positions.length > 0 && selectedIds && positions.every(p => selectedIds.has(p.id));

  return (
    <div className="pos-table-wrap">
      <table className="pos-table">
        <thead>
          <tr>
            {onToggleSelect && (
              <th style={{ width: '36px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  onChange={onToggleSelectAll}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
              </th>
            )}
            <th>P&amp;L</th>
            <th>Symbol</th>
            {showUser && <th>User</th>}
            <th>Side</th>
            <th>Qty</th>
            <th>Avg Price</th>
            <th>LTP / Exit</th>
            <th>Brok / Settlem.</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(p => {
            const pnl = p.pnl || 0;
            const isSelected = selectedIds?.has(p.id);
            return (
              <tr key={p.id} style={{ background: isSelected ? 'rgba(56, 139, 253, 0.08)' : undefined }}>
                {onToggleSelect && (
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => onToggleSelect(p.id)}
                      style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                  </td>
                )}
                <td data-label="P&L">
                  <span className={`pos-pl-val ${pnl >= 0 ? 'pos-green' : 'pos-red'}`}>
                    ₹{pnl.toFixed(2)}
                  </span>
                </td>
                <td data-label="Symbol">
                  <span className="pos-sym-badge">{p.symbol}</span>
                  <div className="pos-sub-text">{p.created_at ? new Date(p.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                </td>
                {showUser && (
                  <td data-label="User">
                    <span className="pos-user-badge">{p.user_name || p.user_id?.slice(0,8)}</span>
                    <div className="pos-sub-text">{p.client_id}</div>
                  </td>
                )}
                <td data-label="Side">
                  <span className={`pos-side ${p.side.toLowerCase()}`}>{p.side}</span>
                  <div className="pos-sub-text">{p.status}</div>
                </td>
                <td data-label="Qty">{p.qty}</td>
                <td data-label="Avg Price">{p.avgPrice.toFixed(2)}</td>
                <td data-label="LTP / Exit">
                  <span className="pos-val-badge">
                    {p.status === 'closed' ? (p.exit ?? 0).toFixed(2) : (p.ltp ?? 0).toFixed(2)}
                  </span>
                </td>
                <td data-label="Brok / Settlem.">
                  <span className="pos-sub-text">B: {p.brokerage || 0}</span><br />
                  <span className="pos-sub-text">S: {p.settlement || '—'}</span>
                </td>
                <td data-label="Actions">
                  <div className="pos-trade-actions">
                    {p.status === 'open' && (
                      <button className="pos-action-btn sqoff" onClick={() => onSqoff(p.id)}>Sq. Off</button>
                    )}
                    {p.status === 'closed' && (
                      <button className="pos-action-btn reopen" onClick={() => onReopen(p)}>Reopen</button>
                    )}
                    <button className="pos-action-btn edit" onClick={() => onEdit(p)}>Edit</button>
                    <button className="pos-action-btn delete" onClick={() => onDelete(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

