'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { signOut } from '@/lib/auth';
import { apiCall, Toast, ToastState } from './AdminUtils';
import AnimatedLoader from '@/components/AnimatedLoader';

export type DashboardMetrics = {
  ledger_balance: number;
  net_balance?: number;
  mark_to_market: number;
  net_pnl?: number;
  total_brokerage?: number;
  margin_used?: number;
  net: number;
  total_deposits: number;
  total_withdrawals: number;
  avg_deposit: number;
  avg_withdrawal: number;
  avg_profit: number;
  avg_loss: number;
  profitable_clients: number;
  loss_making_clients: number;
  buy_position_count: number;
  sell_position_count: number;
  registered: number;
  added_funds: number;
  conversion: string;
};

type UserEntry = { id: string; role: string; parent_id: string; full_name?: string; is_active?: boolean };

const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtShort = (n: number | null | undefined) => {
  if (n === null || n === undefined || isNaN(n)) return '₹ 0';
  return '₹ ' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

function getRoleLabel(role: string) {
  if (role === 'broker') return 'Broker';
  if (role === 'sub_broker') return 'Sub Broker';
  if (role === 'admin') return 'Admin';
  if (role === 'super_admin') return 'Super Admin';
  return 'Client';
}

function getRoleTagClass(role: string) {
  if (role === 'broker') return 'db-role-tag db-role-broker';
  if (role === 'sub_broker') return 'db-role-tag db-role-subbroker';
  if (role === 'admin') return 'db-role-tag db-role-admin';
  return 'db-role-tag db-role-client';
}

export default function DashboardPage({ selectedUser, onOpenUserPanel, isDemoMode }: {
  selectedUser?: { id: string; role: string };
  onOpenUserPanel?: () => void;
  isDemoMode: boolean;
}) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [brokerId, setBrokerId] = useState('');
  const [subBrokerId, setSubBrokerId] = useState('');
  const [clientId, setClientId] = useState('');
  const [usersList, setUsersList] = useState<UserEntry[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [excludedUsers, setExcludedUsers] = useState<Set<string>>(new Set());
  const [collapsedRoles, setCollapsedRoles] = useState<Record<string, boolean>>({});
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    apiCall(`/api/admin/users?demo=${isDemoMode}`, { method: 'GET' }).then(({ ok, data }) => {
      if (ok) setUsersList(data as UserEntry[]);
    });
  }, [isDemoMode]);

  useEffect(() => {
    if (selectedUser?.id) {
      setTimeout(() => {
        const u = usersList.find(x => x.id === selectedUser.id);
        if (u) {
          if (u.role === 'broker') { setBrokerId(u.id); setSubBrokerId(''); setClientId(''); }
          else if (u.role === 'sub_broker') { setBrokerId(u.parent_id || ''); setSubBrokerId(u.id); setClientId(''); }
          else {
            setClientId(u.id);
            const parent = usersList.find(x => x.id === u.parent_id);
            if (parent?.role === 'sub_broker') { setSubBrokerId(parent.id); setBrokerId(parent.parent_id || ''); }
            else if (parent?.role === 'broker') { setBrokerId(parent.id); setSubBrokerId(''); }
          }
        } else {
          setClientId(selectedUser.id);
        }
      }, 0);
    }
  }, [selectedUser, usersList, isDemoMode]);

  const fetchMetrics = useCallback((manual = false, silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (brokerId) params.set('broker_id', brokerId);
    if (subBrokerId) params.set('sub_broker_id', subBrokerId);
    if (clientId) params.set('client_id', clientId);
    params.set('demo', String(isDemoMode));
    const query = params.toString() ? `?${params.toString()}` : '';
    apiCall(`/api/admin/dashboard${query}`, { method: 'GET' })
      .then(({ ok, status, data }) => {
        if (status === 401) { signOut(); return; }
        if (status === 403) { setToast({ message: 'Access Denied', type: 'error' }); return; }
        if (!ok) { setToast({ message: 'Server Error', type: 'error' }); return; }
        setMetrics(data as DashboardMetrics);
        setLastUpdated(new Date().toLocaleTimeString('en-IN'));
        if (manual) setToast({ message: 'Dashboard updated', type: 'success' });
      })
      .catch((err: unknown) => {
        setToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' });
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, brokerId, subBrokerId, clientId, isDemoMode]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => fetchMetrics(false, true), 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const brokers = usersList.filter(u => u.role === 'broker');
  const subBrokers = usersList.filter(u => u.role === 'sub_broker' && (!brokerId || u.parent_id === brokerId));
  const clients = usersList.filter(u => (u.role === 'user' || u.role === 'client') && (!subBrokerId ? (!brokerId || u.parent_id === brokerId) : u.parent_id === subBrokerId));
  const admins = usersList.filter(u => u.role === 'admin');

  // Filtered client list
  const allUsers = usersList.filter(u => u.role !== 'super_admin');
  const filteredUsers = allUsers.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter || (roleFilter === 'sub_broker' && u.role === 'sub_broker');
    const matchSearch = !searchQuery || u.id.toLowerCase().includes(searchQuery.toLowerCase()) || (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  // Role groups for ledger summary
  const roleGroups = [
    { key: 'admin', label: 'Admin', users: admins },
    { key: 'broker', label: 'Broker', users: brokers },
    { key: 'sub_broker', label: 'Sub Broker', users: usersList.filter(u => u.role === 'sub_broker') },
  ];

  const toggleRole = (key: string) => {
    setCollapsedRoles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExclude = (userId: string) => {
    setExcludedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const excludeAll = () => setExcludedUsers(new Set(allUsers.map(u => u.id)));
  const includeAll = () => setExcludedUsers(new Set());

  const m2m = metrics?.mark_to_market ?? 0;
  const netPnl = metrics?.net_pnl ?? 0;
  const ledger = metrics?.ledger_balance ?? 0;
  const totalDeposits = metrics?.total_deposits ?? 0;
  const totalWithdrawals = metrics?.total_withdrawals ?? 0;

  const roleCounts: Record<string, number> = {
    all: allUsers.length,
    broker: brokers.length,
    sub_broker: usersList.filter(u => u.role === 'sub_broker').length,
    admin: admins.length,
    client: usersList.filter(u => u.role === 'user' || u.role === 'client').length,
  };

  return (
    <div className="db-root">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header */}
      <div className="db-header">
        <div className="db-header-left">
          <h1 className="db-title">Dashboard</h1>
          {isDemoMode && <span className="db-demo-badge">DEMO</span>}
        </div>
        <div className="db-header-right">
          <div className="db-date-group">
            <span className="db-date-label">DATE RANGE</span>
            <div className="db-date-pair">
              <input type="date" className="db-date-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="db-date-sep">to</span>
              <input type="date" className="db-date-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <button className="db-apply-btn" onClick={() => fetchMetrics(true)} disabled={loading}>
            {loading ? <AnimatedLoader size="small" /> : 'Apply'}
          </button>
          <button className="db-clear-btn" onClick={() => { setDateFrom(''); setDateTo(''); setBrokerId(''); setSubBrokerId(''); setClientId(''); }} title="Clear filters">
            Clear
          </button>
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="db-filter-row">
        <select className="db-select" value={brokerId} onChange={e => { setBrokerId(e.target.value); setSubBrokerId(''); setClientId(''); }}>
          <option value="">All Brokers</option>
          {brokers.map(b => <option key={b.id} value={b.id}>{b.full_name || b.id}</option>)}
        </select>
        <select className="db-select" value={subBrokerId} onChange={e => { setSubBrokerId(e.target.value); setClientId(''); }}>
          <option value="">All Sub-Brokers</option>
          {subBrokers.map(b => <option key={b.id} value={b.id}>{b.full_name || b.id}</option>)}
        </select>
        <select className="db-select" value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.id}</option>)}
        </select>
      </div>

      {/* Summary Result Cards */}
      <div className="db-summary-cards">
        <div className="db-summary-card">
          <span className="db-summary-card-label">Ledger Total</span>
          <span className="db-summary-card-value db-blue">₹{fmt(ledger)}</span>
        </div>
        <div className="db-summary-card">
          <span className="db-summary-card-label">Net Deposits</span>
          <span className="db-summary-card-value db-green">₹{fmt(totalDeposits)}</span>
        </div>
        <div className="db-summary-card">
          <span className="db-summary-card-label">Net Withdrawals</span>
          <span className="db-summary-card-value db-red">₹{fmt(totalWithdrawals)}</span>
        </div>
        <div className="db-summary-card">
          <span className="db-summary-card-label">Mark-to-Market</span>
          <span className={`db-summary-card-value ${m2m >= 0 ? 'db-green' : 'db-red'}`}>{m2m >= 0 ? '+' : ''}₹{fmt(m2m)}</span>
        </div>
        <div className="db-summary-card">
          <span className="db-summary-card-label">Net P&L</span>
          <span className={`db-summary-card-value ${netPnl >= 0 ? 'db-green' : 'db-red'}`}>{netPnl >= 0 ? '+' : ''}₹{fmt(netPnl)}</span>
        </div>
        <div className="db-summary-card">
          <span className="db-summary-card-label">Total Brokerage</span>
          <span className="db-summary-card-value db-dark">₹{fmt(metrics?.total_brokerage ?? 0)}</span>
        </div>
      </div>

      {/* Exclusion Controls */}
      <div className="db-control-box">
        <div className="db-control-box-header">
          Exclusion Controls
          <span className="db-badge-count">{excludedUsers.size} excluded</span>
        </div>
        <div className="db-exclusion-pills">
          {allUsers.slice(0, 20).map(u => (
            <button
              key={u.id}
              className={`db-exclusion-pill${excludedUsers.has(u.id) ? ' excluded' : ''}`}
              onClick={() => toggleExclude(u.id)}
            >
              <span className={`db-pill-dot ${excludedUsers.has(u.id) ? 'excluded' : 'included'}`} />
              {u.full_name || u.id}
            </button>
          ))}
        </div>
        <div className="db-exclusion-actions">
          <button className="db-action-btn" onClick={excludeAll}>Exclude All</button>
          <button className="db-action-btn" onClick={includeAll}>Include All</button>
          <span className="db-exclusion-status">
            <span className="db-exclusion-count">{excludedUsers.size}</span> users excluded
          </span>
        </div>
      </div>

      {/* Main Two-Column Panel */}
      <div className="db-main-row">

        {/* LEFT: Ledger Summary */}
        <div className="db-panel">
          <div className="db-panel-header">
            <h2 className="db-panel-title">Ledger Summary</h2>
            <span className="db-live-badge">live</span>
          </div>

          {loading && !metrics ? (
            <div className="db-loading-wrap">
              <AnimatedLoader size="small" />
            </div>
          ) : (
            <>
              {roleGroups.map(group => (
                <div key={group.key} className="db-role-section">
                  <div className="db-role-header" onClick={() => toggleRole(group.key)}>
                    <span className="db-role-label">
                      {group.label}
                      <span className="db-count-badge">{group.users.length}</span>
                    </span>
                    <span className="db-role-summary">
                      <span className="db-ledger-amount">{fmtShort(ledger / Math.max(roleGroups.length, 1))}</span>
                      <span className={`db-toggle-icon${collapsedRoles[group.key] ? '' : ' expanded'}`}>▾</span>
                    </span>
                  </div>
                  {!collapsedRoles[group.key] && (
                    <div className="db-role-children">
                      {group.users.length === 0 ? (
                        <div className="db-no-results">No {group.label}s found</div>
                      ) : group.users.map(u => (
                        <div key={u.id} className={`db-child-item${excludedUsers.has(u.id) ? ' excluded' : ''}`}>
                          <div className="db-child-main">
                            <span className="db-child-name">
                              {u.full_name || u.id}
                              <span className="db-client-id-tag">#{u.id.slice(0, 8)}</span>
                            </span>
                            <span className="db-child-ledger">{fmtShort(0)}</span>
                            <span className="db-child-actions">
                              <span className={`db-status-dot${u.is_active !== false ? ' active' : ' inactive'}`} />
                              <button
                                className="db-exclude-mini-btn"
                                onClick={() => toggleExclude(u.id)}
                                title={excludedUsers.has(u.id) ? 'Include' : 'Exclude'}
                              >
                                {excludedUsers.has(u.id) ? 'Include' : 'Exclude'}
                              </button>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="db-summary-total">
                <span>Total Ledger (All Roles)</span>
                <span>₹{fmt(ledger)}</span>
              </div>
              <div className="db-summary-footer">
                <span>Click role to expand / collapse</span>
                {lastUpdated && <span>Updated: {lastUpdated}</span>}
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Client List */}
        <div className="db-panel">
          <div className="db-panel-header">
            <h2 className="db-panel-title">Client List</h2>
            <span className="db-live-badge">live</span>
          </div>

          {/* Role filter buttons */}
          <div className="db-filter-section">
            <span className="db-filter-label">Role:</span>
            <div className="db-filter-btn-group">
              {[
                { key: 'all', label: 'All' },
                { key: 'broker', label: 'Broker' },
                { key: 'admin', label: 'Admin' },
                { key: 'sub_broker', label: 'Sub Broker' },
                { key: 'client', label: 'Client' },
              ].map(f => (
                <button
                  key={f.key}
                  className={`db-filter-btn${roleFilter === f.key ? ' active' : ''}`}
                  onClick={() => setRoleFilter(f.key)}
                >
                  {f.label} <span className="db-filter-count">{roleCounts[f.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="db-search-bar">
            <i className="fas fa-search db-search-icon" />
            <input
              type="text"
              className="db-search-input"
              placeholder="Search by name or User ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="db-search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          {/* Table */}
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="db-no-results-cell">No users found</td>
                  </tr>
                ) : filteredUsers.map(u => (
                  <tr key={u.id} className={excludedUsers.has(u.id) ? 'db-excluded-row' : ''}>
                    <td className="db-user-id-cell">{u.id.slice(0, 12)}</td>
                    <td>{u.full_name || u.id}</td>
                    <td><span className={getRoleTagClass(u.role)}>{getRoleLabel(u.role)}</span></td>
                    <td>
                      <span className={`db-status-dot${u.is_active !== false ? ' active' : ' inactive'}`} />
                      <span className={`db-status-label${u.is_active !== false ? ' active' : ' inactive'}`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="db-table-footer">
            Showing <strong>{filteredUsers.length}</strong> users
          </div>
        </div>
      </div>

      {/* Performance Stats Row */}
      <div className="db-stats-row">
        <div className="db-stat-card">
          <span className="db-stat-label">Profitable Clients</span>
          <span className="db-stat-value db-green">{metrics?.profitable_clients ?? 0}</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-label">Loss-Making Clients</span>
          <span className="db-stat-value db-red">{metrics?.loss_making_clients ?? 0}</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-label">Buy Positions</span>
          <span className="db-stat-value db-green">{metrics?.buy_position_count ?? 0}</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-label">Sell Positions</span>
          <span className="db-stat-value db-red">{metrics?.sell_position_count ?? 0}</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-label">Avg. Profit</span>
          <span className="db-stat-value db-green">₹{fmt(metrics?.avg_profit ?? 0)}</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-label">Avg. Loss</span>
          <span className="db-stat-value db-red">₹{fmt(metrics?.avg_loss ?? 0)}</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-label">Margin Used</span>
          <span className="db-stat-value db-dark">₹{fmt(metrics?.margin_used ?? 0)}</span>
        </div>
        <div className="db-stat-card">
          <span className="db-stat-label">Conversion Rate</span>
          <span className="db-stat-value db-dark">{metrics?.conversion ?? '0%'}</span>
        </div>
      </div>

      <div className="db-footer-note">
        All values in INR · Ledger = Net Deposits − Net Withdrawals
        {lastUpdated && <> · Updated {lastUpdated}</>}
      </div>
    </div>
  );
}
