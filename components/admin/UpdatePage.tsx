'use client';
import React, { useState } from 'react';
import UpdateProfile from './update/UpdateProfile';
import UpdateSegments from './update/UpdateSegments';
import UpdateLedger from './update/UpdateLedger';
import LedgerHistory from './update/LedgerHistory';
import UpdateCopySettings from './update/UpdateCopySettings';
import UpdateBlockScripts from './update/UpdateBlockScripts';
import UpdateNotifications from './update/UpdateNotifications';
import UpdateMultipleSettings from './update/UpdateMultipleSettings';

type UpdateTab = 'profile' | 'segments' | 'ledger' | 'ledger_history' | 'copy_settings' | 'block_scripts' | 'notifications' | 'multiple_settings';

export type SegSettings = {
  commissionType: string; commissionValue: string;
  profitHoldSec: string; loss_hold_sec: string;
  strikeRange: string; maxLot: string;
  maxOrderLot: string; intradayLeverage: string;
  intradayType: string;
  holdingLeverage: string; entryBuffer: string;
  holdingType: string;
  exitBuffer: string; tradeAllowed: boolean;
};

const EmptyState = ({ message, onOpen }: { message: string, onOpen?: () => void }) => (
  <div style={{ color: '#6b7280', padding: 20, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
    <div>{message}</div>
    {onOpen && (
      <button onClick={onOpen} className="adm-btn-primary" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px' }}>
        Select User
      </button>
    )}
  </div>
);

export default function UpdatePage({ 
  selectedUser, 
  onOpenUserPanel,
  isBroker = false,
  initialTab
}: { 
  selectedUser?: { id: string; role: string }, 
  onOpenUserPanel?: () => void,
  isBroker?: boolean,
  initialTab?: UpdateTab
}) {
  const [activeTab, setActiveTab] = React.useState<UpdateTab>('profile');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile':
        return selectedUser?.id ? <UpdateProfile selectedUser={selectedUser} isBroker={isBroker} /> : <EmptyState message="Please select a user first to edit their profile." onOpen={onOpenUserPanel} />;
      case 'segments':
        return selectedUser?.id ? <UpdateSegments selectedUser={selectedUser} /> : <EmptyState message="Please select a user first to configure their segments." onOpen={onOpenUserPanel} />;
      case 'ledger':
        return selectedUser?.id ? <UpdateLedger selectedUser={selectedUser} /> : <EmptyState message="Please select a user first to update their ledger." onOpen={onOpenUserPanel} />;
      case 'ledger_history':
        return selectedUser?.id ? <LedgerHistory selectedUser={selectedUser} /> : <EmptyState message="Please select a user first to view their ledger history." onOpen={onOpenUserPanel} />;
      case 'copy_settings':
        return <UpdateCopySettings selectedUser={selectedUser} />;
      case 'block_scripts':
        return selectedUser?.id ? <UpdateBlockScripts selectedUser={selectedUser} /> : <EmptyState message="Please select a user first to block their scripts." onOpen={onOpenUserPanel} />;
      case 'notifications':
        return <UpdateNotifications selectedUser={selectedUser} />;
      case 'multiple_settings':
        return <UpdateMultipleSettings selectedUser={selectedUser} />;
      default:
        return selectedUser?.id ? <UpdateProfile selectedUser={selectedUser} isBroker={isBroker} /> : <EmptyState message="Please select a user first." onOpen={onOpenUserPanel} />;
    }
  };

  const tabs: { key: UpdateTab, label: string }[] = isBroker
    ? [
        { key: 'profile', label: 'Profile' },
        { key: 'segments', label: 'Segments' },
        { key: 'ledger', label: 'Ledger' },
        { key: 'ledger_history', label: 'Ledger History' },
      ]
    : [
        { key: 'profile', label: 'Profile' },
        { key: 'segments', label: 'Segments' },
        { key: 'ledger', label: 'Ledger' },
        { key: 'ledger_history', label: 'Ledger History' },
        { key: 'copy_settings', label: 'Copy' },
        { key: 'block_scripts', label: 'Block' },
        { key: 'notifications', label: 'Notify' },
        { key: 'multiple_settings', label: 'Bulk' },
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: '#ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, background: '#ffffff' }}>
        <span style={{ color: '#111827', fontSize: '13px', fontWeight: 600 }}>Update User</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#6b7280', fontSize: '12px', fontFamily: 'monospace' }}>
            {selectedUser?.id ? selectedUser.id.slice(0, 12) + '...' : 'No User'}
          </span>
          {onOpenUserPanel && (
            <button onClick={onOpenUserPanel} style={{ background: '#f9fafb', border: '1px solid #d1d5db', color: '#2563eb', fontSize: '12px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }}>
              Change
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', borderBottom: '1px solid #e5e7eb', padding: '8px 12px', gap: '4px', flexShrink: 0, background: '#ffffff' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '6px 12px', textAlign: 'center',
              background: activeTab === t.key ? '#dbeafe' : 'transparent',
              border: activeTab === t.key ? '1px solid #93c5fd' : '1px solid transparent',
              borderRadius: '6px',
              color: activeTab === t.key ? '#1d4ed8' : '#6b7280',
              fontWeight: activeTab === t.key ? 600 : 400,
              cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f9fafb' }}>
        {renderActiveTab()}
      </div>
    </div>
  );
}
