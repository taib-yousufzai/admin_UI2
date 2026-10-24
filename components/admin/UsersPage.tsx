'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { apiCall, Toast, ToastState, ConfirmDialog, downloadCSV, UserListItem } from './AdminUtils';

type UserRow = {
  id: string; client_id?: string; fullName: string; role: string; active: boolean;
  ledgerBal: number; mAvailable: number; openPnl: number; m2m: number;
  weeklyPnl: number; marginUsed: number;
  broker: string; mobile: string; scheduled_delete_at: string | null;
  segments: string[]; read_only: boolean; demo_user: boolean;
  intraday_sq_off: boolean; auto_sqoff: number; showcase_auto_sqoff: number; sqoff_method: string;
  settlementAmount: number;
};

function mapUserListItem(u: UserListItem): UserRow {
  const balance = Number(u.balance || 0);
  const openPnl = Number(u.openPnl || 0);
  const m2m = Number(u.m2m || 0);
  const weeklyPnl = Number(u.weeklyPnl || 0);
  const marginUsed = Number(u.marginUsed || 0);
  const settlementAmount = Number(u.settlement_amount || 0);
  return {
    id: u.id,
    client_id: u.client_id,
    fullName: u.full_name ?? u.email,
    role: (u.role || '').toLowerCase(),
    active: u.active,
    ledgerBal: balance,
    mAvailable: (balance + openPnl) - marginUsed,
    openPnl,
    m2m,
    weeklyPnl,
    marginUsed,
    broker: u.parent_id ?? 'DIRECT',
    mobile: u.phone ?? 'N/A',
    scheduled_delete_at: u.scheduled_delete_at,
    segments: u.segments ?? [],
    read_only: u.read_only,
    demo_user: Boolean(u.demo_user || (u.email && u.email.toLowerCase().includes('demo'))),
    intraday_sq_off: u.intraday_sq_off,
    auto_sqoff: u.auto_sqoff,
    showcase_auto_sqoff: (u as any).showcase_auto_sqoff ?? 85,
    sqoff_method: u.sqoff_method,
    settlementAmount,
  };
}

export default function UsersPage({ selectedUser: _selectedUser, onSelectUser, onNavigate, isDemoMode }: {
  selectedUser: { id: string; role: string };
  onSelectUser: (u: { id: string; role: string }) => void;
  onNavigate: (page: string) => void;
  isDemoMode: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rows, setRows] = useState('50');
  const [page, setPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{ userId: string } | null>(null);
  const [deletedUsers, setDeletedUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUsers = useCallback((silent = false) => {
    if (!silent) setUsersLoading(true);
    apiCall(`/api/admin/users?demo=${isDemoMode}`, { method: 'GET' }).then(({ ok, status, data }) => {
      if (ok) {
        setUsers((data as UserListItem[]).map(mapUserListItem));
      } else if (status === 401) {
        signOut();
        router.replace('/login');
      } else if (status === 403) {
        if (!silent) setToast({ message: 'Access Denied', type: 'error' });
      } else {
        if (!silent) setToast({ message: 'Server Error', type: 'error' });
      }
      if (!silent) setUsersLoading(false);
    });
  }, [router, isDemoMode]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsers(true); // silent refresh every 5 seconds
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const handleDelete = () => {
    if (!confirmDialog) return;
    setLoading(true);
    apiCall(`/api/admin/users/${confirmDialog.userId}`, { method: 'DELETE' })
      .then(({ ok, status, data }) => {
        if (status === 401) { signOut(); return; }
        if (status === 403) { setToast({ message: 'Access Denied', type: 'error' }); return; }
        if (!ok) { setToast({ message: 'Server Error', type: 'error' }); return; }
        const { scheduled_at } = data as { scheduled_at: string };
        setDeletedUsers(prev => ({ ...prev, [confirmDialog.userId]: scheduled_at }));
        setToast({ message: 'User scheduled for deletion', type: 'success' });
        setConfirmDialog(null);
      })
      .catch((err: unknown) => {
        setToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' });
      })
      .finally(() => setLoading(false));
  };

  const handleDownloadExcel = () => {
    const exportData = filtered.map(u => ({
      ID: u.id,
      Name: u.fullName,
      Role: u.role,
      Status: u.active ? 'Active' : 'Inactive',
      'Ledger Balance': u.ledgerBal,
      'Open PnL': u.openPnl,
      M2M: u.m2m,
      'Weekly PnL': u.weeklyPnl,
      Broker: u.broker,
      Mobile: u.mobile,
      Segments: u.segments.join(', '),
      'Read Only': u.read_only ? 'Yes' : 'No',
      'Demo User': u.demo_user ? 'Yes' : 'No',
      'Intraday SQ Off': u.intraday_sq_off ? 'Yes' : 'No',
      'Auto SQ Off %': u.auto_sqoff,
      'Showcase SQ Off %': u.showcase_auto_sqoff,
      'SQ Off Method': u.sqoff_method,
    }));
    downloadCSV(exportData, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    setExportOpen(false);
    setToast({ message: 'Export completed', type: 'success' });
  };

  const filtered = users.filter(u => {
    const matchSearch = u.id.toLowerCase().includes(search.toLowerCase()) ||
      (u.client_id && u.client_id.toLowerCase().includes(search.toLowerCase())) ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.broker.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.active : !u.active);
    return matchSearch && matchRole && matchStatus;
  });

  const active = users.filter(u => u.active).length;
  const inactive = users.filter(u => !u.active).length;

  const rowsNum = Number(rows);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsNum));
  const displayed = filtered.slice((page - 1) * rowsNum, page * rowsNum);

  const fmt = (n: number | string | null | undefined) => (Number(n ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="usr-root">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      {confirmDialog && (
        <ConfirmDialog
          message={`Delete user ${confirmDialog.userId}? This will schedule deletion after 30 days.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDialog(null)}
          loading={loading}
        />
      )}

      {/* Header */}
      <div className="usr-header">
        <h1>User <span>·</span> Management</h1>
        <div className="usr-super-admin-icon">
          <span className="usr-icon-wrapper">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', fill: 'white', opacity: 0.9 }}>
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 2.18l7 3.12v4.7c0 4.83-3.13 9.37-7 10.63-3.87-1.26-7-5.8-7-10.63V6.3l7-3.12z"/>
              <path d="M12 5.5L9.5 8.5 12 11.5 14.5 8.5 12 5.5z"/>
              <circle cx="12" cy="14" r="2"/>
              <path d="M12 16.5c-1.5 0-3 .5-3 1.5v1h6v-1c0-1-1.5-1.5-3-1.5z"/>
            </svg>
          </span>
          <span className="usr-label-text">
            {_selectedUser.role.toUpperCase()}
            <span className="usr-role-sub">{_selectedUser.id.slice(0,8)}</span>
          </span>
        </div>
      </div>

      {/* 4 Stats Grid */}
      <div className="usr-stats-grid">
        <div className="usr-stat-block highlight">
          <div className="usr-stat-left">
            <span className="usr-label"><i className="fas fa-user-check" /> Active</span>
            <span className="usr-value">{active}</span>
          </div>
          <span className="usr-stat-icon green"><i className="fas fa-check" /></span>
        </div>
        <div className="usr-stat-block highlight">
          <div className="usr-stat-left">
            <span className="usr-label"><i className="fas fa-user-slash" /> Inactive</span>
            <span className="usr-value">{inactive}</span>
          </div>
          <span className="usr-stat-icon red"><i className="fas fa-times" /></span>
        </div>
        <div className="usr-stat-block highlight">
          <div className="usr-stat-left">
            <span className="usr-label"><i className="fas fa-users" /> Total</span>
            <span className="usr-value">{users.length}</span>
          </div>
          <span className="usr-stat-icon blue"><i className="fas fa-users" /></span>
        </div>
        <div className="usr-stat-block referral-block">
          <div className="usr-stat-left">
            <span className="usr-label"><i className="fas fa-id-card" /> Referral ID</span>
            <span className="usr-value">0</span>
            <span className="usr-sub">Top: <span>N/A</span></span>
          </div>
          <span className="usr-stat-icon gold"><i className="fas fa-star" /></span>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="usr-search-actions-row">
        <div className="usr-search-wrapper">
          <i className="fas fa-search" />
          <input type="text" placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        
        <div className="usr-divider" />

        <div className="usr-dropdown-wrapper">
          <select className="usr-dropdown-btn" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="broker">Broker</option>
            <option value="sub_broker">Sub Broker</option>
            <option value="user">User</option>
          </select>
        </div>

        <div className="usr-divider" />

        <div className="usr-dropdown-wrapper">
          <select className="usr-dropdown-btn" value={rows} onChange={e => { setRows(e.target.value); setPage(1); }}>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="150">150</option>
          </select>
        </div>

        <div className="usr-action-buttons" style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <div className="usr-export-wrapper" ref={exportRef}>
            <button className="usr-btn-export" onClick={() => setExportOpen(o => !o)}>
              <i className="fas fa-download" /> Export
            </button>
            {exportOpen && (
              <div className="usr-export-dropdown">
                <div className="usr-export-item" onClick={handleDownloadExcel}>
                  <i className="fas fa-file-excel" /> Excel Spreadsheet
                </div>
                <div className="usr-export-item" onClick={() => setExportOpen(false)}>
                  <i className="fas fa-file-pdf" /> PDF Document
                </div>
                <div className="usr-export-item" onClick={() => setExportOpen(false)}>
                  <i className="fas fa-file-word" /> Word Document
                </div>
              </div>
            )}
          </div>
          <button className="usr-btn-add" onClick={() => onNavigate('create')}>+ Add</button>
        </div>
      </div>

      {/* Table */}
      <div className="usr-table-wrapper">
        <table className="usr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Edit</th>
              <th>User ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Pos</th>
              <th>Led</th>
              <th>Ledger</th>
              <th>Open P&amp;L</th>
              <th>M2M</th>
              <th>Ledger Btn</th>
              <th>Margin Used</th>
              <th>Holding Margin</th>
              <th>Req Holding</th>
              <th>Margin Avail</th>
              <th>Daily P&amp;L</th>
              <th>Weekly P&amp;L</th>
              <th>All Time P&amp;L</th>
              <th>Admin</th>
              <th>Broker</th>
              <th>Sub Broker</th>
              <th>SL %</th>
              <th>Demo</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              <tr>
                <td colSpan={25} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="usr-spinner" /> Loading users...
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={25} style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                  No users found matching your criteria
                </td>
              </tr>
            ) : (
              displayed.map((u, idx) => {
                const isScheduledForDeletion = deletedUsers[u.id] || u.scheduled_delete_at;
                const rowNum = (page - 1) * rowsNum + idx + 1;
                return (
                  <tr key={u.id} className={!u.active || isScheduledForDeletion ? 'usr-inactive-row' : ''}>
                    <td>{rowNum}</td>
                    <td><button className="usr-btn-sm usr-btn-edit" onClick={() => { onSelectUser({ id: u.id, role: u.role }); onNavigate('update'); }} title="Edit User">E</button></td>
                    <td><span style={{ fontWeight: 600 }}>{(u.client_id || u.id.slice(0, 8)).toUpperCase()}</span></td>
                    <td><span style={{ fontWeight: 500 }}>{u.fullName}</span></td>
                    <td>{u.mobile}</td>
                    <td><button className="usr-btn-sm usr-btn-pos" onClick={() => { onSelectUser({ id: u.id, role: u.role }); onNavigate('position'); }} title="View Position">P</button></td>
                    <td><button className="usr-btn-sm usr-btn-led" onClick={() => { onSelectUser({ id: u.id, role: u.role }); onNavigate('actledger'); }} title="View Ledger">L</button></td>
                    <td>{fmt(u.ledgerBal)}</td>
                    <td className={u.openPnl > 0 ? 'usr-amount-green' : u.openPnl < 0 ? 'usr-amount-red' : ''}>{u.openPnl > 0 ? '+' : ''}{fmt(u.openPnl)}</td>
                    <td className={u.m2m > 0 ? 'usr-amount-green' : u.m2m < 0 ? 'usr-amount-red' : ''}>{u.m2m > 0 ? '+' : ''}{fmt(u.m2m)}</td>
                    <td><button className="usr-link-btn" onClick={() => { onSelectUser({ id: u.id, role: u.role }); onNavigate('actledger'); }}>View</button></td>
                    <td>{fmt(u.marginUsed)}</td>
                    <td>0.00</td>
                    <td>0.00</td>
                    <td>{fmt(u.mAvailable)}</td>
                    <td className={u.openPnl > 0 ? 'usr-amount-green' : u.openPnl < 0 ? 'usr-amount-red' : ''}>{u.openPnl > 0 ? '+' : ''}{fmt(u.openPnl)}</td> {/* Mock Daily = Open PnL for now */}
                    <td className={u.weeklyPnl > 0 ? 'usr-amount-green' : u.weeklyPnl < 0 ? 'usr-amount-red' : ''}>{u.weeklyPnl > 0 ? '+' : ''}{fmt(u.weeklyPnl)}</td>
                    <td>0.00</td>
                    <td>—</td>
                    <td>{u.broker}</td>
                    <td>—</td>
                    <td>{u.auto_sqoff}%</td>
                    <td>{u.demo_user ? 'Yes' : 'No'}</td>
                    <td>
                      <span className={`usr-status-badge ${u.active ? 'active' : 'inactive'}`}>
                        {isScheduledForDeletion ? 'Pending' : u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="usr-btn-delete" onClick={() => setConfirmDialog({ userId: u.id })} title="Delete User">D</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="usr-table-footer">
        <div className="usr-records-count"><span>{filtered.length}</span> records</div>
        <div className="usr-pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><i className="fas fa-chevron-left" /></button>
          <button className="usr-active-page">{page}</button>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><i className="fas fa-chevron-right" /></button>
        </div>
      </div>
      
      <div className="usr-footer-note">Updated: {new Date().toLocaleString('en-IN', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})} IST &nbsp;|&nbsp; All values in INR</div>
    </div>
  );
}
