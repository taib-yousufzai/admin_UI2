'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import { apiCall, Toast, ToastState, SkeletonLine, SkeletonCard, ConfirmDialog } from './AdminUtils';

export type PaymentAccount = {
  id: string;
  account_holder: string;
  bank_name: string;
  account_no: string;
  ifsc: string;
  upi_id: string;
  qr_image_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Extra fields for UI mockup (not fully functional on backend)
  deposit_limit?: number;
  txn_limit?: number;
  rotation_mode?: string;
  roles?: string[];
};

export type PAFormState = {
  account_holder: string;
  bank_name: string;
  account_no: string;
  ifsc: string;
  upi_id: string;
  sort_order: string;
  is_active: boolean;
  qr_image: File | null;
  deposit_limit: string;
  txn_limit: string;
  rotation_mode: string;
  roles: string[];
};

export const emptyPAForm = (): PAFormState => ({
  account_holder: '',
  bank_name: '',
  account_no: '',
  ifsc: '',
  upi_id: '',
  sort_order: '0',
  is_active: true,
  qr_image: null,
  deposit_limit: '50000',
  txn_limit: '10',
  rotation_mode: 'after_txn',
  roles: ['super-admin', 'admin', 'broker', 'sub-broker', 'user'],
});

export function accountToForm(a: PaymentAccount): PAFormState {
  return {
    account_holder: a.account_holder,
    bank_name: a.bank_name,
    account_no: a.account_no,
    ifsc: a.ifsc,
    upi_id: a.upi_id,
    sort_order: String(a.sort_order),
    is_active: a.is_active,
    qr_image: null,
    deposit_limit: String(a.deposit_limit || 50000),
    txn_limit: String(a.txn_limit || 10),
    rotation_mode: a.rotation_mode || 'after_txn',
    roles: a.roles || ['super-admin', 'admin', 'broker', 'sub-broker', 'user'],
  };
}

export default function PaymentAccountsPage({ isBroker = false }: { isBroker?: boolean }) {
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [paLoading, setPaLoading] = useState(false);
  const [paError, setPaError] = useState<string | null>(null);
  const [paActionLoading, setPaActionLoading] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [paToast, setPaToast] = useState<ToastState>(null);
  const [filterRole, setFilterRole] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [txnSectionOpen, setTxnSectionOpen] = useState(false);

  // Form state
  const [form, setForm] = useState<PAFormState>(emptyPAForm());
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Confirm dialog state for delete
  const [deleteTarget, setDeleteTarget] = useState<PaymentAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAccounts = async () => {
    setPaLoading(true);
    setPaError(null);
    try {
      const { ok, status: httpStatus, data } = await apiCall(isBroker ? '/api/broker/payment-accounts' : '/api/admin/payment-accounts', { method: 'GET' });
      if (httpStatus === 401) { signOut(); return; }
      if (!ok) {
        setPaError((data as { error?: string })?.error ?? 'Failed to load accounts');
        return;
      }
      setPaymentAccounts(data as PaymentAccount[]);
    } catch (err: unknown) {
      setPaError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPaLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setForm(emptyPAForm());
    setShowAddForm(true);
  };

  const handleOpenEdit = (account: PaymentAccount) => {
    setShowAddForm(false);
    setEditingAccount(account);
    setForm(accountToForm(account));
    setShowAddForm(true); // Open modal with edit state
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingAccount(null);
    setForm(emptyPAForm());
  };

  const handleFormSubmit = async () => {
    setFormSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const fd = new FormData();
      fd.append('account_holder', form.account_holder);
      fd.append('bank_name', form.bank_name);
      fd.append('account_no', form.account_no);
      fd.append('ifsc', form.ifsc);
      fd.append('upi_id', form.upi_id);
      fd.append('sort_order', form.sort_order);
      fd.append('is_active', String(form.is_active));
      if (form.qr_image) {
        fd.append('qr_image', form.qr_image);
      }
      // Note: We are not sending deposit_limit, txn_limit, rotation_mode, roles 
      // as they are mock UI elements and the backend doesn't support them yet.

      if (editingAccount) {
        const res = await fetch(isBroker ? `/api/broker/payment-accounts/${editingAccount.id}` : `/api/admin/payment-accounts/${editingAccount.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (res.status === 401) { signOut(); return; }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setPaToast({ message: errData?.error ?? 'Failed to update', type: 'error' });
          return;
        }
        setPaToast({ message: 'Account updated successfully', type: 'success' });
      } else {
        const res = await fetch(isBroker ? '/api/broker/payment-accounts' : '/api/admin/payment-accounts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (res.status === 401) { signOut(); return; }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setPaToast({ message: errData?.error ?? 'Failed to create', type: 'error' });
          return;
        }
        setPaToast({ message: 'Account created successfully', type: 'success' });
      }
      setShowAddForm(false);
      setEditingAccount(null);
      setForm(emptyPAForm());
      await fetchAccounts();
    } catch (err: unknown) {
      setPaToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (account: PaymentAccount) => {
    setPaActionLoading(prev => ({ ...prev, [account.id]: true }));
    try {
      const { ok, status: httpStatus, data } = await apiCall(isBroker ? `/api/broker/payment-accounts/${account.id}` : `/api/admin/payment-accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !account.is_active }),
      });
      if (httpStatus === 401) { signOut(); return; }
      if (!ok) {
        setPaToast({ message: (data as any)?.error ?? 'Failed to update', type: 'error' });
        return;
      }
      setPaymentAccounts(prev =>
        prev.map(a => a.id === account.id ? { ...a, is_active: !account.is_active } : a),
      );
    } catch (err: unknown) {
      setPaToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' });
    } finally {
      setPaActionLoading(prev => ({ ...prev, [account.id]: false }));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { ok, status: httpStatus, data } = await apiCall(isBroker ? `/api/broker/payment-accounts/${deleteTarget.id}` : `/api/admin/payment-accounts/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (httpStatus === 401) { signOut(); return; }
      if (!ok) {
        setPaToast({ message: (data as any)?.error ?? 'Failed to delete', type: 'error' });
        return;
      }
      setPaymentAccounts(prev => prev.filter(a => a.id !== deleteTarget.id));
      setPaToast({ message: 'Account deleted', type: 'success' });
      setDeleteTarget(null);
    } catch (err: unknown) {
      setPaToast({ message: err instanceof Error ? err.message : 'Network error', type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleRole = (r: string) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(r) ? prev.roles.filter(x => x !== r) : [...prev.roles, r]
    }));
  };

  const filteredAccounts = filterRole === 'all' ? paymentAccounts : paymentAccounts.filter(a => (a.roles || []).includes(filterRole));

  return (
    <div className="bkm-dashboard">
      <Toast toast={paToast} onDismiss={() => setPaToast(null)} />

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete account "${deleteTarget.account_holder}" (${deleteTarget.bank_name})? This cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* HEADER */}
      <div className="bkm-header">
        <h1>Bank <span>·</span> Management</h1>
        <div className="bkm-super-admin-icon">
          <span className="bkm-icon-wrapper">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 2.18l7 3.12v4.7c0 4.83-3.13 9.37-7 10.63-3.87-1.26-7-5.8-7-10.63V6.3l7-3.12z"/>
              <path d="M12 5.5L9.5 8.5 12 11.5 14.5 8.5 12 5.5z"/>
              <circle cx="12" cy="14" r="2"/>
              <path d="M12 16.5c-1.5 0-3 .5-3 1.5v1h6v-1c0-1-1.5-1.5-3-1.5z"/>
            </svg>
          </span>
          <span className="bkm-label-text">
            Super Admin
            <span className="bkm-role-sub">Administrator</span>
          </span>
        </div>
      </div>

      {/* ACTION ROW */}
      <div className="bkm-action-row">
        <div className="left-group">
          <span className="bkm-filter-label">Filter:</span>
          <div className="bkm-dropdown-wrapper">
            <button className="bkm-dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <span className="selected-text">{filterRole === 'all' ? 'All Roles' : filterRole.replace('-', ' ').toUpperCase()}</span>
              <i className="fas fa-chevron-down"></i>
            </button>
            <div className={`bkm-dropdown-menu ${dropdownOpen ? 'open' : ''}`}>
              {['all', 'super-admin', 'admin', 'broker', 'sub-broker', 'user'].map(r => (
                <div key={r} className="item" onClick={() => { setFilterRole(r); setDropdownOpen(false); }}>
                  {r === 'all' ? 'All Roles' : r.replace('-', ' ').toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="right-group">
          <button className="bkm-btn-add" onClick={handleOpenAdd}>+ Add</button>
        </div>
      </div>

      {/* DEPOSIT SUMMARY */}
      <div className="bkm-section-title" style={{ marginTop: 0 }}>
        <i className="fas fa-arrow-down" style={{ marginRight: 3 }}></i> Deposits by Bank <span className="bkm-badge-count">{filteredAccounts.length}</span>
      </div>
      <div className="bkm-deposit-summary-grid">
        {filteredAccounts.map(a => (
          <div key={`sum-${a.id}`} className="bkm-deposit-summary-card">
            <span className="bank-name">{a.bank_name}</span>
            <span className="deposit-amount">₹{(a.deposit_limit || 50000).toLocaleString()}</span>
          </div>
        ))}
        {filteredAccounts.length === 0 && <div style={{ fontSize: '0.6rem', color: '#888' }}>No banks available</div>}
      </div>

      {/* BANK-WISE TXN (Mockup UI to match reference) */}
      <div className="bkm-section-title" style={{ marginTop: '12px' }}>
        <i className="fas fa-history" style={{ marginRight: 3 }}></i> Bank-wise Transactions
      </div>
      <div className="bkm-bank-txn-section">
        <div className="bkm-bank-txn-header" onClick={() => setTxnSectionOpen(!txnSectionOpen)}>
          <div className="bank-name">Recent Activity <span className="bank-txn-count">3</span></div>
          <div className="bank-txn-total">₹15,000</div>
        </div>
        <div className={`bkm-bank-txn-body ${txnSectionOpen ? 'open' : ''}`}>
          <table>
            <thead>
              <tr>
                <th>Bank</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>HDFC Bank</td>
                <td><span className="bkm-tx-type credit">Credit</span></td>
                <td>₹5,000</td>
                <td>2026-07-05 10:30</td>
                <td><span className="bkm-tx-status success">Success</span></td>
                <td><button className="bkm-btn-change-bank">Change</button></td>
              </tr>
              <tr>
                <td>Axis Bank</td>
                <td><span className="bkm-tx-type credit">Credit</span></td>
                <td>₹2,500</td>
                <td>2026-07-05 09:15</td>
                <td><span className="bkm-tx-status pending">Pending</span></td>
                <td><button className="bkm-btn-change-bank">Change</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BANKS GRID */}
      <div className="bkm-section-title" style={{ marginTop: '12px' }}>
        <i className="fas fa-university" style={{ marginRight: 3 }}></i> Banks <span className="bkm-badge-count">{filteredAccounts.length}</span>
      </div>
      {paLoading ? (
        <div className="bkm-banks-grid">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} rows={4} />)}
        </div>
      ) : paError ? (
        <div style={{ color: '#dc2626', fontSize: '14px', margin: '20px 0' }}>{paError}</div>
      ) : filteredAccounts.length === 0 ? (
        <div style={{ color: '#888', fontSize: '14px', margin: '20px 0' }}>No bank accounts found matching filters.</div>
      ) : (
        <div className="bkm-banks-grid">
          {filteredAccounts.map(a => (
            <div className="bkm-bank-card" key={a.id}>
              <div className="bkm-bank-header">
                <div className="bkm-bank-name">
                  <i className="fas fa-university"></i> {a.bank_name}
                </div>
                <span className={`bkm-bank-status ${a.is_active ? 'active' : 'inactive'}`}>
                  {a.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="bkm-bank-details">
                <div className="bkm-detail-item">
                  <span className="label">Holder:</span>
                  <span className="value">{a.account_holder}</span>
                </div>
                <div className="bkm-detail-item">
                  <span className="label">A/C No:</span>
                  <span className="value">{a.account_no}</span>
                </div>
                <div className="bkm-detail-item">
                  <span className="label">IFSC:</span>
                  <span className="value">{a.ifsc}</span>
                </div>
                <div className="bkm-detail-item">
                  <span className="label">Limit:</span>
                  <span className="value">₹{(a.deposit_limit || 50000).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="bkm-bank-qr">
                <div className="bkm-qr-placeholder">
                  {a.qr_image_url ? (
                    <img src={a.qr_image_url} alt="QR" />
                  ) : (
                    <i className="fas fa-qrcode"></i>
                  )}
                </div>
                <div className="bkm-qr-info">
                  UPI ID: <br/> <span className="upi-id">{a.upi_id}</span>
                </div>
              </div>

              <div className="bkm-role-assignments">
                {(a.roles || ['super-admin', 'admin', 'user']).map(r => (
                  <span key={r} className={`bkm-role-tag ${r}`}>{r.replace('-', ' ')}</span>
                ))}
              </div>

              <div className="bkm-bank-rotation">
                <div className="bkm-rotation-label">Rotation: {a.rotation_mode || 'after_txn'}</div>
                <div className="bkm-rotation-details">
                  <span>Count: {a.txn_limit || 10}</span>
                </div>
              </div>

              <div className="bkm-bank-progress">
                <div className={`progress-bar ${a.is_active ? 'green' : 'red'}`} style={{ width: a.is_active ? '80%' : '10%' }}></div>
              </div>

              <div className="bkm-bank-actions">
                <button className="btn-rotate" onClick={() => handleToggleActive(a)} disabled={paActionLoading[a.id]}>
                  <i className="fas fa-sync-alt"></i> {paActionLoading[a.id] ? '...' : (a.is_active ? 'Pause' : 'Activate')}
                </button>
                <button className="btn-edit" onClick={() => handleOpenEdit(a)}><i className="fas fa-pen"></i> Edit</button>
                <button className="btn-delete" onClick={() => setDeleteTarget(a)}><i className="fas fa-trash"></i> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bkm-footer-note">Updated: {new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; All amounts in INR</div>

      {/* MODAL */}
      {showAddForm && (
        <div className="bkm-modal-overlay active">
          <div className="bkm-modal-box">
            <button className="bkm-modal-close" onClick={handleCancelForm}>&times;</button>
            <h3>{editingAccount ? 'Edit Bank' : 'Add Bank'}</h3>
            <p className="bkm-modal-sub">Configure bank account with combined rotation rules</p>
            
            <div className="bkm-form-group">
              <label>Bank Name</label>
              <input type="text" value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g., HDFC Bank" />
            </div>
            <div className="bkm-form-group">
              <label>Account Holder Name</label>
              <input type="text" value={form.account_holder} onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))} placeholder="e.g., John Doe" />
            </div>
            <div className="bkm-form-row">
              <div className="bkm-form-group">
                <label>Account Number</label>
                <input type="text" value={form.account_no} onChange={e => setForm(f => ({ ...f, account_no: e.target.value }))} placeholder="Enter account number" />
              </div>
              <div className="bkm-form-group">
                <label>IFSC Code</label>
                <input type="text" value={form.ifsc} onChange={e => setForm(f => ({ ...f, ifsc: e.target.value }))} placeholder="e.g., HDFC0001234" />
              </div>
            </div>
            <div className="bkm-form-group">
              <label>UPI ID</label>
              <input type="text" value={form.upi_id} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))} placeholder="e.g., bank@upi" />
            </div>
            
            <div className="bkm-form-group">
              <label>QR Code Image</label>
              <input type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, qr_image: e.target.files?.[0] ?? null }))} />
              <div style={{ fontSize: '8px', color: '#555', marginTop: '2px' }}>Upload QR code image for this bank (PNG, JPG)</div>
            </div>

            <div className="bkm-form-row">
              <div className="bkm-form-group">
                <label>Deposit Limit (₹)</label>
                <input type="number" value={form.deposit_limit} onChange={e => setForm(f => ({ ...f, deposit_limit: e.target.value }))} />
              </div>
              <div className="bkm-form-group">
                <label>Transaction Limit</label>
                <input type="number" value={form.txn_limit} onChange={e => setForm(f => ({ ...f, txn_limit: e.target.value }))} />
              </div>
            </div>

            <div className="bkm-form-group">
              <label>Rotation Mode</label>
              <div className="bkm-radio-group">
                {['after_txn', 'after_deposit', 'round_robin', 'min_balance'].map(m => (
                  <label key={m}>
                    <input type="radio" name="rotationMode" value={m} checked={form.rotation_mode === m} onChange={() => setForm(f => ({ ...f, rotation_mode: m }))} />
                    {m.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="bkm-form-group">
              <label>Assign to Roles</label>
              <div className="bkm-checkbox-group">
                {['super-admin', 'admin', 'broker', 'sub-broker', 'user'].map(r => (
                  <label key={r}>
                    <input type="checkbox" checked={form.roles.includes(r)} onChange={() => toggleRole(r)} />
                    {r.replace('-', ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="bkm-form-group">
              <label>Status</label>
              <select value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="bkm-modal-actions">
              <button className="bkm-btn-cancel" onClick={handleCancelForm}>Cancel</button>
              <button className="bkm-btn-save" onClick={handleFormSubmit} disabled={formSubmitting}>
                {formSubmitting ? 'Saving...' : 'Save Bank'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
