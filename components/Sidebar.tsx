'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { RequirePermission } from './RequirePermission';
import { Permission } from '@/lib/permissions';
import './Sidebar.css';

const navItems: { key: string, label: string, icon: string, path: string, perm?: Permission }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie', path: '/admin#dashboard' },
  { key: 'marketwatch', label: 'MarketWatch', icon: 'fas fa-chart-line', path: '/admin#marketwatch' },
  { key: 'orders', label: 'Orders', icon: 'fas fa-file-invoice-dollar', path: '/admin#orders' },
  { key: 'positions', label: 'Positions', icon: 'fas fa-layer-group', path: '/admin#position' },
  { key: 'users', label: 'Users', icon: 'fas fa-users', path: '/admin#users', perm: 'VIEW_USERS' },
  { key: 'finance', label: 'Finance & Ledger', icon: 'fas fa-wallet', path: '/admin#actledger' },
  { key: 'diagnostics', label: 'Diagnostics', icon: 'fas fa-heartbeat', path: '/admin/diagnostics' },
  { key: 'settings', label: 'Settings', icon: 'fas fa-cogs', path: '/admin#settings', perm: 'MANAGE_GLOBAL_SETTINGS' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('marginApexTheme');
    setIsDark(saved === 'dark');
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.body.classList.remove('dark', 'black');
    if (newDark) document.body.classList.add('dark');
    else { const t = localStorage.getItem('marginApexTheme'); if (t === 'black') document.body.classList.add('black'); }
    localStorage.setItem('marginApexTheme', newDark ? 'dark' : 'light');
  };

  return (
    <aside className={`desktop-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/icon-512x512.png" alt="Logo" className="logo-icon-img" />
          {!isCollapsed && <span className="logo-text">MARGIN<span>APEX</span></span>}
        </div>
        <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          <i className={`fas fa-chevron-${isCollapsed ? 'right' : 'left'}`}></i>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          const linkNode = (
            <Link key={item.key} href={item.path} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <div className="sidebar-icon">
                <i className={item.icon}></i>
              </div>
              {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
              {isActive && <div className="active-indicator" />}
            </Link>
          );

          if (item.perm) {
            return (
              <RequirePermission key={item.key} permission={item.perm}>
                {linkNode}
              </RequirePermission>
            );
          }

          return linkNode;
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-action-btn" onClick={toggleTheme} title="Toggle Theme">
          <div className="sidebar-icon">
            <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'}></i>
          </div>
          {!isCollapsed && <span className="sidebar-label">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        
        <button className="sidebar-action-btn logout" onClick={() => signOut()} title="Logout">
          <div className="sidebar-icon">
            <i className="fas fa-sign-out-alt"></i>
          </div>
          {!isCollapsed && <span className="sidebar-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
