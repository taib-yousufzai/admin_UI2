'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiCall } from './AdminUtils';

export interface AlertItem {
  id: string;
  type: 'margin_call' | 'payin_pending' | 'kite_expiry' | 'system';
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  actionTab?: string;
}

export default function AdminAlertCenter({ isDemoMode, onNavigate }: {
  isDemoMode: boolean;
  onNavigate: (tab: string) => void;
}) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const alertList: AlertItem[] = [];

      // 1. Check Pending Payin/Payout requests
      const { ok: payOk, data: payData } = await apiCall(`/api/admin/payinout?status=pending&demo=${isDemoMode}`, { method: 'GET' });
      if (payOk && Array.isArray(payData) && payData.length > 0) {
        alertList.push({
          id: 'pay-pending',
          type: 'payin_pending',
          level: 'warning',
          title: 'Pending Financial Approvals',
          message: `${payData.length} pay-in/out request(s) awaiting approval`,
          timestamp: new Date().toISOString(),
          actionTab: 'payinout',
        });
      }

      // 2. Check Margin breaches from Users list
      const { ok: userOk, data: userData } = await apiCall(`/api/admin/users?demo=${isDemoMode}`, { method: 'GET' });
      if (userOk && Array.isArray(userData)) {
        const breachedUsers = (userData as any[]).filter(u => {
          const balance = Number(u.balance || 0);
          const marginUsed = Number(u.marginUsed || 0);
          return balance > 0 && (marginUsed / balance) >= 0.8;
        });

        if (breachedUsers.length > 0) {
          alertList.push({
            id: 'margin-breach',
            type: 'margin_call',
            level: 'critical',
            title: 'Margin Utilization Breach (>80%)',
            message: `${breachedUsers.length} client account(s) near liquidation threshold`,
            timestamp: new Date().toISOString(),
            actionTab: 'users',
          });
        }
      }

      setAlerts(alertList);
      setUnreadCount(alertList.length);
    } catch {
      // silent catch for background polling
    }
  }, [isDemoMode]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAlertClick = (tab?: string) => {
    if (tab) {
      onNavigate(tab);
      setIsOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Alert Bell Button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{
          position: 'relative',
          background: isOpen ? '#eff6ff' : '#f8fafc',
          border: `1px solid ${isOpen ? '#2563eb' : '#e2e8f0'}`,
          borderRadius: '8px',
          color: unreadCount > 0 ? '#0f172a' : '#64748b',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Risk & Notifications Center"
      >
        <i className="fas fa-bell" style={{ fontSize: '15px' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            background: '#dc2626',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            borderRadius: '10px',
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 0 6px rgba(220, 38, 38, 0.6)',
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Flyout */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '340px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
          zIndex: 9999,
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif",
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              Risk & Notification Center
            </span>
            <span style={{
              fontSize: '11px',
              color: unreadCount > 0 ? '#dc2626' : '#16a34a',
              fontWeight: 600,
              background: unreadCount > 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(22, 163, 74, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
            }}>
              {unreadCount} Active
            </span>
          </div>

          {/* List */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '24px', color: '#16a34a', marginBottom: '8px' }}></i>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>All Systems Nominal</div>
                <div style={{ fontSize: '11px', marginTop: '2px', color: '#64748b' }}>No margin breaches or pending approvals.</div>
              </div>
            ) : (
              alerts.map(alert => {
                const isCrit = alert.level === 'critical';
                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert.actionTab)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: alert.actionTab ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                      background: isCrit ? 'rgba(220, 38, 38, 0.05)' : 'transparent',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isCrit ? 'rgba(220, 38, 38, 0.1)' : '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = isCrit ? 'rgba(220, 38, 38, 0.05)' : 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <i className={`fas ${isCrit ? 'fa-exclamation-circle' : 'fa-bell'}`} style={{ color: isCrit ? '#dc2626' : '#d97706', fontSize: '13px' }}></i>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', flex: 1 }}>
                        {alert.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                      {alert.message}
                    </div>
                    {alert.actionTab && (
                      <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Resolve in {alert.actionTab.toUpperCase()} <i className="fas fa-arrow-right" style={{ fontSize: '9px' }}></i>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
