'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { apiCall, ToastState } from './AdminUtils';

interface RiskMetrics {
  totalMtm: number;
  totalMarginUsed: number;
  openPositionCount: number;
  activeUsersCount: number;
}

export default function AdminRiskBar({ isDemoMode, onTriggerToast }: {
  isDemoMode: boolean;
  onTriggerToast?: (toast: ToastState) => void;
}) {
  const [metrics, setMetrics] = useState<RiskMetrics>({
    totalMtm: 0,
    totalMarginUsed: 0,
    openPositionCount: 0,
    activeUsersCount: 0,
  });
  const [killSwitchOpen, setKillSwitchOpen] = useState(false);
  const [killAction, setKillAction] = useState<'sqoff_all' | 'cancel_all' | 'lock_trading'>('sqoff_all');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch aggregate platform risk metrics
  const fetchRiskMetrics = useCallback(async () => {
    try {
      const { ok, data } = await apiCall(`/api/admin/dashboard?demo=${isDemoMode}`, { method: 'GET' });
      if (ok && data) {
        const d = data as any;
        setMetrics({
          totalMtm: Number(d.mark_to_market || d.net_pnl || 0),
          totalMarginUsed: Number(d.margin_used || 0),
          openPositionCount: Number((d.buy_position_count || 0) + (d.sell_position_count || 0)),
          activeUsersCount: Number(d.registered || 0),
        });
      }
    } catch {
      // ignore silent metric refresh errors
    }
  }, [isDemoMode]);

  useEffect(() => {
    fetchRiskMetrics();
    const interval = setInterval(fetchRiskMetrics, 10000); // 10s risk polling
    return () => clearInterval(interval);
  }, [fetchRiskMetrics]);

  const handleExecuteKillSwitch = async () => {
    if (confirmPhrase.trim().toUpperCase() !== 'CONFIRM') {
      if (onTriggerToast) onTriggerToast({ message: 'Please type CONFIRM to proceed', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      if (killAction === 'sqoff_all') {
        const { ok, data } = await apiCall('/api/admin/orders/square-off-all', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Admin Global Emergency Kill Switch triggered' })
        });
        if (ok) {
          if (onTriggerToast) onTriggerToast({ message: 'Global Square-Off order dispatched to all active positions', type: 'success' });
          setKillSwitchOpen(false);
          fetchRiskMetrics();
        } else {
          if (onTriggerToast) onTriggerToast({ message: (data as any)?.error || 'Square off failed', type: 'error' });
        }
      } else if (killAction === 'cancel_all') {
        const { ok, data } = await apiCall('/api/admin/orders/cancel-all', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Admin Emergency Bulk Order Cancellation' })
        });
        if (ok) {
          if (onTriggerToast) onTriggerToast({ message: 'All pending orders cancelled successfully', type: 'success' });
          setKillSwitchOpen(false);
        } else {
          if (onTriggerToast) onTriggerToast({ message: (data as any)?.error || 'Cancel all failed', type: 'error' });
        }
      } else if (killAction === 'lock_trading') {
        const { ok, data } = await apiCall('/api/admin/settings/trading-hours', {
          method: 'POST',
          body: JSON.stringify({ global_trading_lock: true })
        });
        if (ok) {
          if (onTriggerToast) onTriggerToast({ message: 'Platform trading locked successfully', type: 'success' });
          setKillSwitchOpen(false);
        } else {
          if (onTriggerToast) onTriggerToast({ message: (data as any)?.error || 'Trading lock failed', type: 'error' });
        }
      }
    } catch (err) {
      if (onTriggerToast) onTriggerToast({ message: err instanceof Error ? err.message : 'Action failed', type: 'error' });
    } finally {
      setActionLoading(false);
      setConfirmPhrase('');
    }
  };

  const fmtCurrency = (val: number | string) => {
    const num = Number(val || 0);
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '+';
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
    return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const fmtMargin = (val: number | string) => {
    const num = Number(val || 0);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const isProfit = metrics.totalMtm >= 0;

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '6px 12px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        flexWrap: 'wrap',
      }}>
        {/* Live Gross MTM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Gross MTM:
          </span>
          <span style={{
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: isProfit ? '#16a34a' : '#dc2626',
            background: isProfit ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            border: `1px solid ${isProfit ? 'rgba(22, 163, 74, 0.25)' : 'rgba(220, 38, 38, 0.25)'}`
          }}>
            {fmtCurrency(metrics.totalMtm)}
          </span>
        </div>

        {/* Live Margin Used */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Margin:</span>
          <span style={{ color: '#0f172a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {fmtMargin(metrics.totalMarginUsed)}
          </span>
        </div>

        {/* Open Positions Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Open Pos:</span>
          <span style={{
            color: '#2563eb',
            fontWeight: 600,
            background: 'rgba(37, 99, 235, 0.1)',
            padding: '1px 6px',
            borderRadius: '4px'
          }}>
            {metrics.openPositionCount}
          </span>
        </div>

        {/* Emergency Panic Kill Switch Button */}
        <button
          onClick={() => { setKillSwitchOpen(true); setConfirmPhrase(''); }}
          style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg, #da3633 0%, #b91c1c 100%)',
            color: '#fff',
            border: '1px solid #f85149',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(218, 54, 51, 0.4)',
            transition: 'all 0.15s ease'
          }}
          title="Emergency Risk & Liquidation Operations"
        >
          <i className="fas fa-radiation" style={{ fontSize: '12px' }}></i>
          PANIC KILL SWITCH
        </button>
      </div>

      {/* Emergency Kill Switch Modal */}
      {killSwitchOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }} onClick={() => setKillSwitchOpen(false)}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #f85149',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 0 20px rgba(248, 81, 73, 0.1)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(248, 81, 73, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
                fontSize: '18px'
              }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Emergency Action Control
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Platform-wide risk intervention and safety protocols
                </span>
              </div>
            </div>

            {/* Action Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: killAction === 'sqoff_all' ? 'rgba(248, 81, 73, 0.08)' : '#f8fafc',
                border: `1px solid ${killAction === 'sqoff_all' ? '#f85149' : '#e2e8f0'}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="killAction"
                  checked={killAction === 'sqoff_all'}
                  onChange={() => setKillAction('sqoff_all')}
                  style={{ accentColor: '#f85149' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Square Off All Open Positions</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Sends market orders to close all active client positions immediately.</div>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: killAction === 'cancel_all' ? 'rgba(248, 81, 73, 0.08)' : '#f8fafc',
                border: `1px solid ${killAction === 'cancel_all' ? '#f85149' : '#e2e8f0'}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="killAction"
                  checked={killAction === 'cancel_all'}
                  onChange={() => setKillAction('cancel_all')}
                  style={{ accentColor: '#f85149' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Cancel All Pending Orders</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Purges all open limit, stop-loss, and pending trigger orders.</div>
                </div>
              </label>
            </div>

            {/* Confirmation input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Type <span style={{ color: '#dc2626', fontWeight: 700 }}>CONFIRM</span> to authenticate this action:
              </label>
              <input
                type="text"
                placeholder="CONFIRM"
                value={confirmPhrase}
                onChange={e => setConfirmPhrase(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif"
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setKillSwitchOpen(false)}
                disabled={actionLoading}
                style={{
                  padding: '8px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  color: '#334155',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteKillSwitch}
                disabled={confirmPhrase.trim().toUpperCase() !== 'CONFIRM' || actionLoading}
                style={{
                  padding: '8px 20px',
                  background: confirmPhrase.trim().toUpperCase() === 'CONFIRM' ? '#da3633' : '#e2e8f0',
                  border: 'none',
                  borderRadius: '6px',
                  color: confirmPhrase.trim().toUpperCase() === 'CONFIRM' ? '#fff' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: confirmPhrase.trim().toUpperCase() === 'CONFIRM' ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                {actionLoading ? 'Executing...' : 'Execute Emergency Protocol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
