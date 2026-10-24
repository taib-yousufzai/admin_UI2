'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import { apiCall, Toast, ToastState, SkeletonLine } from './AdminUtils';
import AnimatedLoader from '@/components/AnimatedLoader';
import { toCsvPayRequests } from '@/lib/csvExport';
import type { PayRequest } from '@/lib/csvExport';

export default function PayinOutPage({ isDemoMode }: { isDemoMode: boolean }) {
  const [tab, setTab] = useState<'deposit' | 'withdrawal' | 'rules'>('deposit');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [rows, setRows] = useState(25);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // Rules state
  const [withdrawEnabled, setWithdrawEnabled] = useState(true);
  const [allowedDays, setAllowedDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('16:00');
  const [minWithdraw, setMinWithdraw] = useState('100');
  const [minDeposit, setMinDeposit] = useState('1000');
  const [rulesText, setRulesText] = useState('');

  const [requests, setRequests] = useState<PayRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [txUser, setTxUser] = useState('');
  const [txType, setTxType] = useState('payin');
  const [txAmount, setTxAmount] = useState('');
  const [txStatus, setTxStatus] = useState('completed');

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const toggleDay = (d: string) => setAllowedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const stats = {
    todayDeposits: requests.filter(r => r.status === 'APPROVED' && r.type === 'DEPOSIT').reduce((a, r) => a + r.amount, 0),
    completed: requests.filter(r => r.status === 'APPROVED').length,
    activeUsers: new Set(requests.map(r => r.user_id)).size,
  };

  useEffect(() => {
    if (tab === 'rules') return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('type', tab === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL');
    if (status !== 'All Status') params.set('status', status);
    if (dateFilter) params.set('date_from', dateFilter);
    if (search) params.set('search', search);
    params.set('demo', String(isDemoMode));
    setPage(1);

    apiCall(`/api/admin/payinout?${params.toString()}`, { method: 'GET' })
      .then(({ ok, status: httpStatus, data }) => {
        if (httpStatus === 401) { signOut(); return; }
        const list = Array.isArray(data) ? (data as PayRequest[]) : Array.isArray((data as any)?.requests) ? ((data as any).requests as PayRequest[]) : [];
        setRequests(list);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Network error'))
      .finally(() => setLoading(false));
  }, [tab, dateFilter, status, search, refreshKey, isDemoMode]);

  useEffect(() => {
    const channel = supabase.channel('admin_pay_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pay_requests' },
        () => setRefreshKey(prev => prev + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (tab !== 'rules') return;
    setRulesLoading(true);
    apiCall('/api/admin/payinout/rules', { method: 'GET' })
      .then(({ ok, status: httpStatus, data }) => {
        if (httpStatus === 401) { signOut(); return; }
        if (!ok) { setToast({ message: (data as any)?.error ?? 'Failed to load rules', type: 'error' }); return; }
        const r = data as any;
        if (r.withdraw_enabled !== undefined) setWithdrawEnabled(r.withdraw_enabled);
        if (r.allowed_days) setAllowedDays(r.allowed_days);
        if (r.start_time) setStartTime(r.start_time);
        if (r.end_time) setEndTime(r.end_time);
        if (r.min_withdraw) setMinWithdraw(String(r.min_withdraw));
        if (r.min_deposit) setMinDeposit(String(r.min_deposit));
        if (r.rules_text) setRulesText(r.rules_text);
      })
      .finally(() => setRulesLoading(false));
  }, [tab]);

  const handleAccept = async (r: PayRequest) => {
    setActionLoading(p => ({ ...p, [r.id]: true }));
    const { ok, status: httpStatus, data } = await apiCall(`/api/admin/payinout/${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    if (httpStatus === 401) { signOut(); return; }
    if (!ok) setToast({ message: (data as any)?.error ?? 'Failed to approve', type: 'error' });
    else { setToast({ message: 'Request approved', type: 'success' }); setRefreshKey(p => p + 1); }
    setActionLoading(p => ({ ...p, [r.id]: false }));
  };

  const handleReject = async (r: PayRequest) => {
    setActionLoading(p => ({ ...p, [r.id]: true }));
    const { ok, status: httpStatus, data } = await apiCall(`/api/admin/payinout/${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject' }),
    });
    if (httpStatus === 401) { signOut(); return; }
    if (!ok) setToast({ message: (data as any)?.error ?? 'Failed to reject', type: 'error' });
    else { setToast({ message: 'Request rejected', type: 'success' }); setRefreshKey(p => p + 1); }
    setActionLoading(p => ({ ...p, [r.id]: false }));
  };

  const handleDelete = async (r: PayRequest) => {
    if (!window.confirm(`Are you sure you want to delete this ${r.type.toLowerCase()} request for ₹${r.amount.toLocaleString()}?`)) return;
    setActionLoading(p => ({ ...p, [r.id]: true }));
    const { ok, status: httpStatus, data } = await apiCall(`/api/admin/payinout/${r.id}`, {
      method: 'DELETE',
    });
    if (httpStatus === 401) { signOut(); return; }
    if (!ok) setToast({ message: (data as any)?.error ?? 'Failed to delete', type: 'error' });
    else { setToast({ message: 'Request deleted successfully', type: 'success' }); setRefreshKey(p => p + 1); }
    setActionLoading(p => ({ ...p, [r.id]: false }));
  };

  const handleSaveRules = async () => {
    setRulesSaving(true);
    const { ok, status: httpStatus, data } = await apiCall('/api/admin/payinout/rules', {
      method: 'PUT',
      body: JSON.stringify({ withdraw_enabled: withdrawEnabled, allowed_days: allowedDays, start_time: startTime, end_time: endTime, min_withdraw: Number(minWithdraw), min_deposit: Number(minDeposit), rules_text: rulesText }),
    });
    if (httpStatus === 401) { signOut(); return; }
    if (!ok) setToast({ message: (data as any)?.error ?? 'Failed to save', type: 'error' });
    else setToast({ message: 'Rules saved successfully', type: 'success' });
    setRulesSaving(false);
  };

  const handleDownloadCsv = () => {
    const csv = toCsvPayRequests(requests);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payinout_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: `${label} copied!`, type: 'success' });
  };

  const resetFilters = () => { setSearch(''); setDateFilter(''); setStatus('All Status'); };

  const rowsNum = rows;
  const totalPages = Math.max(1, Math.ceil(requests.length / rowsNum));
  const displayed = requests.slice((page - 1) * rowsNum, page * rowsNum);

  return (
    <div className="pio-root">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* LIGHTBOX */}
      {lightboxImg && (
        <div className="pio-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="pio-lightbox" onClick={e => e.stopPropagation()}>
            <button className="pio-lightbox-close" onClick={() => setLightboxImg(null)}>✕</button>
            <img src={lightboxImg} alt="Payment proof" />
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="pio-header">
        <h1>Pay <span>·</span> In / Out</h1>
        <div className="pio-super-admin-icon">
          <span className="pio-icon-wrapper">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 2.18l7 3.12v4.7c0 4.83-3.13 9.37-7 10.63-3.87-1.26-7-5.8-7-10.63V6.3l7-3.12z"/>
              <path d="M12 5.5L9.5 8.5 12 11.5 14.5 8.5 12 5.5z"/>
              <circle cx="12" cy="14" r="2"/>
              <path d="M12 16.5c-1.5 0-3 .5-3 1.5v1h6v-1c0-1-1.5-1.5-3-1.5z"/>
            </svg>
          </span>
          <span className="pio-label-text">
            Super Admin
            <span className="pio-role-sub">Payments</span>
          </span>
        </div>
      </div>

      {/* PANEL */}
      <div className="pio-panel">
        <div className="pio-panel-header">
          <h2 id="pageTitle">
            Transaction Overview — {tab === 'deposit' ? 'Deposit' : tab === 'withdrawal' ? 'Withdrawal' : 'Rules'}
          </h2>
          <span className="pio-badge-role">all users</span>
        </div>

        {/* TOP ROW: Tabs + Actions */}
        <div className="pio-top-row">
          <div className="pio-nav-tabs">
            <button className={`pio-tab-btn ${tab === 'deposit' ? 'active' : ''}`} onClick={() => { setTab('deposit'); setPage(1); }}>Deposit</button>
            <button className={`pio-tab-btn ${tab === 'withdrawal' ? 'active' : ''}`} onClick={() => { setTab('withdrawal'); setPage(1); }}>Withdrawal</button>
            <button className={`pio-tab-btn ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>Rules</button>
          </div>
          <div className="pio-top-actions">
            <button className="pio-action-btn-sm" onClick={resetFilters}>Reset Filters</button>
            {tab !== 'rules' && (
              <button className="pio-action-btn-sm primary" onClick={() => setShowNewTxModal(true)}>+ New Transaction</button>
            )}
          </div>
        </div>

        {tab !== 'rules' && (
          <>
            {/* STATS */}
            <div className="pio-stats-row">
              <div className="pio-stat-card">
                <div className="pio-stat-label">{tab === 'deposit' ? "Today's Deposits" : "Today's Withdrawals"}</div>
                <div className="pio-stat-value positive">₹{stats.todayDeposits.toLocaleString()}</div>
              </div>
              <div className="pio-stat-card">
                <div className="pio-stat-label">Completed</div>
                <div className="pio-stat-value">{stats.completed}</div>
              </div>
              <div className="pio-stat-card">
                <div className="pio-stat-label">Active Users</div>
                <div className="pio-stat-value">{stats.activeUsers}</div>
              </div>
            </div>

            {/* BATCH ACTIONS */}
            <div className="pio-batch-actions">
              <select className="pio-batch-select" value={status} onChange={e => setStatus(e.target.value)}>
                {['All Status', 'APPROVED', 'PENDING', 'REJECTED', 'CANCELLED_BY_USER'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select className="pio-batch-select" value={String(rows)} onChange={e => { setRows(Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} rows</option>)}
              </select>
              <button className="pio-export-btn" onClick={handleDownloadCsv}>Export CSV</button>
            </div>

            {/* FILTER BAR */}
            <div className="pio-filter-bar">
              <span className="pio-filter-label">Filter:</span>
              <input
                type="text"
                placeholder="Search user, ID, reference..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              <input
                type="date"
                className="pio-date-input"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
            </div>

            {/* TABLE */}
            <div className="pio-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Under</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>View</th>
                    <th style={{ textAlign: 'center' }} className="pio-approve-col">Accept</th>
                    <th style={{ textAlign: 'center' }} className="pio-reject-col">Reject</th>
                    <th style={{ textAlign: 'center' }}>Del</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ padding: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {Array.from({ length: 5 }).map((_, i) => <SkeletonLine key={i} height={36} />)}
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#dc2626' }}>{error}</td></tr>
                  ) : displayed.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#888' }}>No {tab} requests found.</td></tr>
                  ) : displayed.map(r => {
                    const isPending = r.status === 'PENDING';
                    const statusClass = r.status === 'APPROVED' ? 'completed' : r.status === 'REJECTED' ? 'failed' : 'cancelled';
                    return (
                      <tr key={r.id}>
                        <td style={{ color: '#555', fontSize: 11 }}>{r.id.slice(0, 8)}…</td>
                        <td style={{ fontWeight: 500, color: '#1a1a1a' }}>
                          {(r as any).user_name || (r as any).user_client_id || r.user_id.slice(0, 8)}
                        </td>
                        <td style={{ color: '#888' }}>—</td>
                        <td style={{ fontWeight: 600, color: '#1a1a1a' }}>₹{r.amount.toLocaleString()}</td>
                        <td style={{ color: '#555' }}>
                          {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <span className={`pio-status-badge ${statusClass}`}>
                            {r.status === 'CANCELLED_BY_USER' ? 'Cancelled' : r.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {r.screenshot_url ? (
                            <button className="pio-view-btn" onClick={() => setLightboxImg(r.screenshot_url!)}>View</button>
                          ) : (
                            <span style={{ color: '#888', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }} className="pio-approve-col">
                          <button
                            className="pio-action-btn approve"
                            disabled={!isPending || !!actionLoading[r.id]}
                            onClick={() => handleAccept(r)}
                          >
                            {actionLoading[r.id] ? '…' : '✓'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }} className="pio-reject-col">
                          <button
                            className="pio-action-btn reject"
                            disabled={!isPending || !!actionLoading[r.id]}
                            onClick={() => handleReject(r)}
                          >
                            {actionLoading[r.id] ? '…' : '✕'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="pio-delete-btn" title="Delete" disabled={!!actionLoading[r.id]} onClick={() => handleDelete(r)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="pio-pagination">
                <button className="pio-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                <span className="pio-page-info">Page {page} of {totalPages}</span>
                <button className="pio-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
              </div>
            )}
          </>
        )}

        {tab === 'rules' && (
          <div className="pio-rules-section">
            {rulesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonLine key={i} height={40} />)}
              </div>
            ) : (
              <>
                {/* Global Toggle */}
                <div className="pio-rule-row">
                  <div>
                    <div className="pio-rule-label">Global Withdrawals</div>
                    <div className="pio-rule-sub">Enable or disable withdrawal requests platform-wide.</div>
                  </div>
                  <div className={`pio-toggle-switch ${withdrawEnabled ? 'active' : ''}`} onClick={() => setWithdrawEnabled(v => !v)} />
                </div>

                {/* Allowed Days */}
                <div className="pio-rule-field">
                  <label className="pio-rule-label">Allowed Days for Withdrawals</label>
                  <div className="pio-days-grid">
                    {allDays.map(d => (
                      <label key={d} className={`pio-day-chip ${allowedDays.includes(d) ? 'selected' : ''}`}>
                        <input type="checkbox" checked={allowedDays.includes(d)} onChange={() => toggleDay(d)} style={{ display: 'none' }} />
                        {d.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time Window */}
                <div className="pio-rule-grid2">
                  <div className="pio-rule-field">
                    <label className="pio-rule-label">Daily Window Start</label>
                    <input type="time" className="pio-rule-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="pio-rule-field">
                    <label className="pio-rule-label">Daily Window End</label>
                    <input type="time" className="pio-rule-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>

                {/* Min Amounts */}
                <div className="pio-rule-grid2">
                  <div className="pio-rule-field">
                    <label className="pio-rule-label">Min Withdrawal Amount (₹)</label>
                    <input type="number" className="pio-rule-input" value={minWithdraw} onChange={e => setMinWithdraw(e.target.value)} />
                  </div>
                  <div className="pio-rule-field">
                    <label className="pio-rule-label">Min Deposit Amount (₹)</label>
                    <input type="number" className="pio-rule-input" value={minDeposit} onChange={e => setMinDeposit(e.target.value)} />
                  </div>
                </div>

                {/* Rules Text */}
                <div className="pio-rule-field">
                  <label className="pio-rule-label">Rules / Notes</label>
                  <textarea
                    className="pio-rules-textarea"
                    rows={6}
                    value={rulesText}
                    onChange={e => setRulesText(e.target.value)}
                    placeholder="Enter payment rules, instructions or notes..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="pio-btn-primary" disabled={rulesSaving} onClick={handleSaveRules}>
                    {rulesSaving ? 'Saving…' : 'Update Wallet Rules'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="pio-footer-note">Super Admin · Pay-In / Pay-Out Management</div>

      {/* NEW TRANSACTION MODAL */}
      {showNewTxModal && (
        <div className="pio-modal-overlay active" onClick={() => setShowNewTxModal(false)}>
          <div className="pio-modal" onClick={e => e.stopPropagation()}>
            <h3>New Transaction</h3>
            <div className="pio-modal-sub">Record a pay-in or pay-out</div>
            <div className="pio-modal-field">
              <label>User</label>
              <input type="text" placeholder="User ID or name" value={txUser} onChange={e => setTxUser(e.target.value)} />
            </div>
            <div className="pio-modal-field">
              <label>Type</label>
              <select value={txType} onChange={e => setTxType(e.target.value)}>
                <option value="payin">Pay-In</option>
                <option value="payout">Pay-Out</option>
              </select>
            </div>
            <div className="pio-modal-field">
              <label>Amount (₹)</label>
              <input type="number" placeholder="Enter amount" min="1" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
            </div>
            <div className="pio-modal-field">
              <label>Status</label>
              <div className="pio-status-options">
                {[{ v: 'completed', label: 'Completed' }, { v: 'failed', label: 'Failed' }, { v: 'cancelled', label: 'Cancelled' }].map(({ v, label }) => (
                  <label key={v} className="pio-status-option">
                    <input type="radio" name="txStatus" value={v} checked={txStatus === v} onChange={() => setTxStatus(v)} />
                    <span className={`pio-dot ${v}`} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="pio-modal-actions">
              <button onClick={() => setShowNewTxModal(false)}>Cancel</button>
              <button className="pio-btn-primary" onClick={() => {
                setToast({ message: 'Transaction recorded (demo)', type: 'success' });
                setShowNewTxModal(false);
              }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
