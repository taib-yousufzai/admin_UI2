'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, getRole, signOut } from '@/lib/auth';
import KiteConnectButton from '@/components/KiteConnectButton';
import { useMobileBack } from '@/hooks/useMobileBack';
import '../admin-layout.css';

export type AdminUserPayload = {
  id: string;
  role: string;
};

// Modular Components
import TelegramPage from '@/components/admin/TelegramPage';
import SettingsPage from '@/components/admin/SettingsPage';
import MarketWatchPage from '@/components/admin/MarketWatchPage';
import DashboardPage from '@/components/admin/DashboardPage';
import OrdersPage from '@/components/admin/OrdersPage';
import PositionPage from '@/components/admin/PositionPage';
import UpdatePage from '@/components/admin/UpdatePage';
import UsersPage from '@/components/admin/UsersPage';
import CreateUserForm from '@/components/admin/CreateUserForm';
import ActLedgerPage from '@/components/admin/ActLedgerPage';
import AccountsPage from '@/components/admin/AccountsPage';
import PayinOutPage from '@/components/admin/PayinOutPage';
import PayAccountsPage from '@/components/admin/PayAccountsPage';
import TransactionsPage from '@/components/admin/TransactionsPage';
import UserPanel from '@/components/admin/UserPanel';
import TemplatesPage from '@/components/admin/TemplatesPage';
import BrokersPage from '@/components/admin/BrokersPage';
import AdminsPage from '@/components/admin/AdminsPage';
import { AdminErrorBoundary, clearAdminAuthCache, Toast, ToastState } from '@/components/admin/AdminUtils';
import AdminRiskBar from '@/components/admin/AdminRiskBar';
import AdminAlertCenter from '@/components/admin/AdminAlertCenter';
// We will now group the navigation items directly in the render function.

export default function AdminPage() {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [activePage, setActivePage] = useState('marketwatch');
  const [selectedUser, setSelectedUser] = useState<AdminUserPayload>({ id: '', role: '' });
  const [userRole, setUserRole] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));

  const renderGroupHeader = (title: string, groupKey: string) => (
    <div 
      onClick={() => toggleGroup(groupKey)}
      style={{ fontSize: '10px', fontWeight: 700, color: '#8b949e', marginTop: '16px', marginBottom: '8px', paddingLeft: '16px', paddingRight: '16px', letterSpacing: '1px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
    >
      {title}
      <i className={`fas fa-chevron-${collapsedGroups[groupKey] ? 'down' : 'up'}`} style={{ fontSize: '10px', transition: 'transform 0.2s' }} />
    </div>
  );

  useEffect(() => {
    getSession().then((sessionRes: any) => {
      const session = sessionRes?.data?.session || sessionRes?.session || sessionRes;
      if (!session || !session.user) {
        router.replace('/login');
        return;
      }
      const role = getRole(session.user);
      if (role !== 'admin' && role !== 'super_admin' && role !== 'broker' && role !== 'sub_broker') {
        clearAdminAuthCache();
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        } catch {}
        router.replace('/login');
        return;
      }
      setUserRole(role);
      setIsChecking(false);
    });
  }, [router]);

  useMobileBack(drawerOpen, () => setDrawerOpen(false), 'nav');
  useMobileBack(userPanelOpen, () => setUserPanelOpen(false), 'user');

  // Handle hash-based navigation for browser back button support
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActivePage(hash);
        sessionStorage.setItem('adminActivePage', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    const initialHash = window.location.hash.replace('#', '');
    if (initialHash) {
      handleHashChange();
    } else {
      const savedPage = sessionStorage.getItem('adminActivePage');
      if (savedPage) {
        setActivePage(savedPage);
        window.history.replaceState(null, '', `#${savedPage}`);
      } else {
        window.history.replaceState(null, '', `#marketwatch`);
      }
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isChecking) return null;

  const handleLogout = () => {
    clearAdminAuthCache();
    sessionStorage.removeItem('adminActivePage');
    signOut();
  };

  const handleNav = (key: string) => {
    if (key === 'logout') { handleLogout(); return; }
    window.location.hash = key;
    setDrawerOpen(false);
  };

  const handleUserCreated = (id: string, role: string) => {
    setCreatingUser(false);
    setUserPanelOpen(true);
  };

  if (creatingUser) {
    return (
      <div className="adm-root" suppressHydrationWarning>
        <div className="adm-topbar">
          <button className="adm-hamburger" onClick={() => { }}>
            <span /><span /><span />
          </button>
        </div>
        <div className="adm-content">
          <CreateUserForm
            onBack={() => { setCreatingUser(false); setUserPanelOpen(true); }}
            onCreated={handleUserCreated}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="adm-root" suppressHydrationWarning>
      {drawerOpen && (
        <div className="adm-overlay" onClick={() => setDrawerOpen(false)} />
      )}
      <div className={`adm-drawer ${drawerOpen ? 'open' : ''}`}>
        <button className="adm-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        <nav className="adm-nav">
          {renderGroupHeader('OVERVIEW', 'overview')}
          {!collapsedGroups['overview'] && ['marketwatch', 'dashboard'].map(key => (
            <div key={key} className={`adm-nav-item ${activePage === key ? 'active' : ''}`} onClick={() => handleNav(key)}>
              {key.toUpperCase()}
            </div>
          ))}

          {renderGroupHeader('TRADE', 'trade')}
          {!collapsedGroups['trade'] && ['orders', 'position', 'update', 'templates'].map(key => (
            <div key={key} className={`adm-nav-item ${activePage === key ? 'active' : ''}`} onClick={() => handleNav(key)}>
              {key.toUpperCase()}
            </div>
          ))}

          {renderGroupHeader('USERS', 'users')}
          {!collapsedGroups['users'] && (
            <>
              {userRole === 'super_admin' && (
                <div key="admins" className={`adm-nav-item ${activePage === 'admins' ? 'active' : ''}`} onClick={() => handleNav('admins')}>
                  ADMINS
                </div>
              )}
              {['brokers', 'users'].map(key => (
                <div key={key} className={`adm-nav-item ${activePage === key ? 'active' : ''}`} onClick={() => handleNav(key)}>
                  {key.toUpperCase()}
                </div>
              ))}
            </>
          )}

          {renderGroupHeader('FINANCE', 'finance')}
          {!collapsedGroups['finance'] && (
            <>
              {['actledger', 'accounts', 'payinout'].map(key => (
                <div key={key} className={`adm-nav-item ${activePage === key ? 'active' : ''}`} onClick={() => handleNav(key)}>
                  {key === 'actledger' ? 'ACT LEDGER' : key === 'payinout' ? 'PAYIN-OUT' : key.toUpperCase()}
                </div>
              ))}
              {(userRole === 'super_admin' || userRole === 'admin') && (
                <div key="paymentaccounts" className={`adm-nav-item ${activePage === 'paymentaccounts' ? 'active' : ''}`} onClick={() => handleNav('paymentaccounts')}>
                  PAYMENT ACCOUNTS
                </div>
              )}
            </>
          )}

          {renderGroupHeader('SYSTEM', 'system')}
          {!collapsedGroups['system'] && ['settings', 'telegram'].map(key => (
            <div key={key} className={`adm-nav-item ${activePage === key ? 'active' : ''}`} onClick={() => handleNav(key)}>
              {key.toUpperCase()}
            </div>
          ))}

          <div style={{ marginTop: '24px' }} />
          <div key="logout" className={`adm-nav-item`} onClick={() => handleNav('logout')}>
            <span style={{ color: '#f85149' }}>LOGOUT</span>
          </div>
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid #21262d', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: isDemoMode ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', border: `1px solid ${isDemoMode ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255,255,255,0.1)'}` }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: isDemoMode ? '#eab308' : '#8b949e' }}>
              <i className="fas fa-vial" style={{ marginRight: '6px' }}></i>
              {isDemoMode ? 'DEMO ENVIRONMENT' : 'LIVE ENVIRONMENT'}
            </span>
            <label className="adm-switch" style={{ margin: 0 }}>
              <input type="checkbox" checked={isDemoMode} onChange={e => setIsDemoMode(e.target.checked)} />
              <span className="adm-slider round"></span>
            </label>
          </div>
          <KiteConnectButton />
        </div>
      </div>

      <UserPanel
        open={userPanelOpen}
        onClose={() => setUserPanelOpen(false)}
        onCreateUser={() => { setUserPanelOpen(false); setCreatingUser(true); }}
        selectedUser={selectedUser}
        onSelectUser={(u) => { setSelectedUser(u); setUserPanelOpen(false); }}
        isDemoMode={isDemoMode}
      />

      <div className="adm-main-area">
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <div className="adm-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="adm-hamburger" onClick={() => setDrawerOpen(true)}>
              <span /><span /><span />
            </button>
            <KiteConnectButton />
            <AdminAlertCenter isDemoMode={isDemoMode} onNavigate={(tab) => { window.location.hash = tab; }} />
          </div>

          <div style={{ flex: 1, maxWidth: '800px', display: 'flex', justifyContent: 'flex-end' }}>
            <AdminRiskBar isDemoMode={isDemoMode} onTriggerToast={(t) => setToast(t)} />
          </div>

          {(activePage === 'settings' || activePage === 'dashboard' || activePage === 'orders' || activePage === 'position' || activePage === 'update') && (
            <button className="adm-hamburger-right" onClick={() => setUserPanelOpen(true)} title="Quick User Switcher">
              <i className="fas fa-user-circle" style={{ fontSize: '18px', color: '#8b949e' }}></i>
            </button>
          )}
        </div>

        <div className="adm-content">
          <PageContent
            activePage={activePage}
            selectedUser={selectedUser}
            onSelectUser={(u) => { setSelectedUser(u); setUserPanelOpen(false); }}
            onOpenUserPanel={() => setUserPanelOpen(true)}
            onNavigate={(page) => { window.location.hash = page; }}
            isDemoMode={isDemoMode}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
}

function PageContent({ activePage, selectedUser, onSelectUser, onOpenUserPanel, onNavigate, isDemoMode, userRole }: {
  activePage: string;
  selectedUser: AdminUserPayload;
  onSelectUser: (u: AdminUserPayload) => void;
  onOpenUserPanel: () => void;
  onNavigate: (page: string) => void;
  isDemoMode: boolean;
  userRole: string;
}) {
  const renderTab = () => {
    switch (activePage) {
      case 'telegram':
        return <TelegramPage />;
      case 'settings':
        return <SettingsPage />;
      case 'marketwatch':
        return <MarketWatchPage />;
      case 'dashboard':
        return <DashboardPage selectedUser={selectedUser} onOpenUserPanel={onOpenUserPanel} isDemoMode={isDemoMode} />;
      case 'orders':
        return <OrdersPage selectedUser={selectedUser} onOpenUserPanel={onOpenUserPanel} isDemoMode={isDemoMode} />;
      case 'position':
        return <PositionPage selectedUser={selectedUser} onOpenUserPanel={onOpenUserPanel} isDemoMode={isDemoMode} />;
      case 'update':
        return <UpdatePage selectedUser={selectedUser} onOpenUserPanel={onOpenUserPanel} />;
      case 'users':
        return <UsersPage selectedUser={selectedUser} onSelectUser={onSelectUser} onNavigate={onNavigate} isDemoMode={isDemoMode} />;
      case 'brokers':
        return <BrokersPage isDemoMode={isDemoMode} />;
      case 'admins':
        return <AdminsPage isDemoMode={isDemoMode} />;
      case 'templates':
        return <TemplatesPage isDemoMode={isDemoMode} />;
      case 'create':
        return (
          <CreateUserForm
            onBack={() => onNavigate('users')}
            onCreated={(id, role) => {
              onNavigate('users');
              onSelectUser({ id, role });
            }}
            isDemoMode={isDemoMode}
            callerRole={userRole}
          />
        );
      case 'actledger':
      case 'transactions':
        return (
          <ActLedgerPage
            selectedUser={selectedUser}
            onOpenUserPanel={onOpenUserPanel}
            isDemoMode={isDemoMode}
            forcedTab={activePage === 'transactions' ? 'transactions' : 'trade_logs'}
          />
        );
      case 'accounts':
        return <AccountsPage isDemoMode={isDemoMode} />;
      case 'payinout':
        return <PayinOutPage isDemoMode={isDemoMode} />;
      case 'paymentaccounts':
        return <PayAccountsPage />;
      default:
        return <MarketWatchPage />;
    }
  };

  return (
    <AdminErrorBoundary tabName={activePage}>
      {renderTab()}
    </AdminErrorBoundary>
  );
}
