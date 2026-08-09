'use client';
import React, { useState } from 'react';
import { apiCall, Toast, ToastState } from './AdminUtils';

const SEGMENTS = ['INDEX-FUT', 'STOCK-OPT', 'NSE-EQ', 'COMEX', 'INDEX-OPT', 'MCX-FUT', 'CRYPTO', 'STOCK-FUT', 'MCX-OPT', 'FOREX'];

export default function CreateUserForm({ onBack, onCreated, isDemoMode, callerRole }: { onBack: () => void; onCreated: (id: string, role: string) => void; isDemoMode?: boolean; callerRole?: string }) {
  const [role, setRole] = useState(callerRole === 'super_admin' ? 'admin' : callerRole === 'admin' ? 'broker' : 'user');
  
  // Basic Fields
  const [fullName, setFullName] = useState('');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    active: true, readOnly: false, demoUser: false, intradaySqOff: true, slTargetRemoval: false,
    canAddUsers_control: true, canAddUsers_change: true, canAddUsers_delete: true,
    canModify_control: false, canModify_change: true, canModify_delete: true,
    canView_control: true, canView_change: true, canView_delete: false,
    canManage_control: false, canManage_change: true, canManage_delete: true,
    canChangeComm_control: false, canChangeComm_change: false, canChangeComm_delete: true,
    canViewClient_control: true, canViewClient_change: true, canViewClient_delete: false,
    carryMarginON: true, tradeAllowed: true
  });

  const [activeSegment, setActiveSegment] = useState('INDEX-FUT');
  const [sideExpanded, setSideExpanded] = useState<Record<string, boolean>>({ 'BUY': true, 'SELL': false });

  const toggle = (key: string) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const isUser = role === 'user';
  const showBrokerSettings = ['admin', 'broker', 'subbroker'].includes(role);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // basic creation api call (mocking the full payload for now to just make it work)
    const { ok, data } = await apiCall('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email, password, username: userId, full_name: fullName, phone,
        role, parent_id: '', segments: SEGMENTS, active: toggles.active,
        read_only: toggles.readOnly, demo_user: toggles.demoUser,
        intraday_sq_off: toggles.intradaySqOff, auto_sqoff: 90,
        showcase_auto_sqoff: 85, sqoff_method: 'Credit',
      }),
    });
    if (ok) {
      setToast({ message: 'User created successfully!', type: 'success' });
      setTimeout(() => onCreated((data as any).id, role), 1000);
    } else {
      setToast({ message: (data as any).error || 'Failed to create user', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="crt-root">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      
      {/* HEADER */}
      <div className="crt-header">
        <h1>Account <span>·</span> Creation</h1>
        <div className="crt-super-admin-icon">
          <span className="crt-icon-wrapper">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 2.18l7 3.12v4.7c0 4.83-3.13 9.37-7 10.63-3.87-1.26-7-5.8-7-10.63V6.3l7-3.12z"/>
              <path d="M12 5.5L9.5 8.5 12 11.5 14.5 8.5 12 5.5z"/>
              <circle cx="12" cy="14" r="2"/>
              <path d="M12 16.5c-1.5 0-3 .5-3 1.5v1h6v-1c0-1-1.5-1.5-3-1.5z"/>
            </svg>
          </span>
          <span className="crt-label-text">
            Super Admin
            <span className="crt-role-sub">Create Accounts</span>
          </span>
        </div>
      </div>

      <div className="crt-panel" style={{ marginBottom: 28 }}>
        <div className="crt-panel-header">
          <h2>Create New Account</h2>
          <span className="crt-badge-role">form</span>
        </div>

        <form onSubmit={handleCreate}>
          <div className="crt-form-grid">
            
            <div className="crt-form-group">
              <label>Full Name <span className="crt-required">*</span></label>
              <input type="text" placeholder="e.g. Arjun Mehta" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="crt-form-group">
              <label>User ID <span className="crt-required">*</span></label>
              <input type="text" placeholder="e.g. #AM006" value={userId} onChange={e => setUserId(e.target.value)} required />
              <span className="crt-hint">Unique identifier, e.g. #AM006</span>
            </div>
            <div className="crt-form-group">
              <label>Email <span className="crt-required">*</span></label>
              <input type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="crt-form-group">
              <label>Phone Number <span className="crt-required">*</span></label>
              <input type="tel" placeholder="e.g. +91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} required />
              <span className="crt-hint">Enter with country code if needed</span>
            </div>
            <div className="crt-form-group">
              <label>Password <span className="crt-required">*</span></label>
              <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              <span className="crt-hint">Minimum 6 characters</span>
            </div>

            {/* Template Sections (Visible for Users) */}
            <div className={`crt-template-sections-wrapper ${isUser ? 'visible' : ''}`}>
              <div className="crt-template-grid">
                <div className="crt-template-card">
                  <div className="crt-card-header">
                    <span className="crt-mode-icon crt-normal-icon">N</span>
                    <span className="crt-mode-title">Normal Template</span>
                    <span className="crt-mode-badge crt-normal-badge">Mode</span>
                  </div>
                  <select required={isUser}>
                    <option value="">— Select Normal Template —</option>
                    <option value="basic_normal">Basic Normal</option>
                  </select>
                  <div className="crt-card-hint">Select the template for Normal mode <span className="crt-required-star">*</span></div>
                </div>
                <div className="crt-template-card">
                  <div className="crt-card-header">
                    <span className="crt-mode-icon crt-scalper-icon">S</span>
                    <span className="crt-mode-title">Scalper Template</span>
                    <span className="crt-mode-badge crt-scalper-badge">Mode</span>
                  </div>
                  <select required={isUser}>
                    <option value="">— Select Scalper Template —</option>
                    <option value="basic_scalper">Basic Scalper</option>
                  </select>
                  <div className="crt-card-hint">Select the template for Scalper mode <span className="crt-required-star">*</span></div>
                </div>
              </div>

              {/* COPY SETTINGS FROM */}
              <div className="crt-copy-section visible">
                <div className="crt-copy-card">
                  <div className="crt-copy-title">Copy Settings From</div>
                  <div className="crt-copy-row">
                    <span className="crt-copy-label">Copy from user:</span>
                    <div className="crt-copy-search-wrap">
                      <input type="text" placeholder="Search user by name, ID or email..." autoComplete="off" />
                    </div>
                    <span className="crt-copy-hint">(optional) copies templates &amp; hierarchy</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROLE SELECTOR */}
            <div className="crt-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Role <span className="crt-required">*</span></label>
              <div className="crt-role-selector">
                <label className={role === 'admin' ? 'selected-role' : ''}>
                  <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} /> Admin
                </label>
                <label className={role === 'broker' ? 'selected-role' : ''}>
                  <input type="radio" name="role" value="broker" checked={role === 'broker'} onChange={() => setRole('broker')} /> Broker
                </label>
                <label className={role === 'subbroker' ? 'selected-role' : ''}>
                  <input type="radio" name="role" value="subbroker" checked={role === 'subbroker'} onChange={() => setRole('subbroker')} /> Sub Broker
                </label>
                <label className={role === 'user' ? 'selected-role' : ''}>
                  <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} /> User
                </label>
              </div>
            </div>

            {/* UNDER HIERARCHY */}
            <div className={`crt-under-hierarchy visible`}>
              <div className="crt-hierarchy-title">
                <span className="crt-tree-icon">🌳</span>
                <span>Hierarchy Placement</span>
                <span className="crt-required" style={{ fontSize: 11 }}>* Select at least one</span>
              </div>
              <div className="crt-hierarchy-grid">
                <div className="crt-hierarchy-item">
                  <label>Under Admin <span className="crt-role-badge crt-admin-badge">Admin</span></label>
                  <select><option value="">— None —</option></select>
                  <span className="crt-hint-text">Select an Admin</span>
                </div>
                <div className="crt-hierarchy-item">
                  <label>Under Broker <span className="crt-role-badge crt-broker-badge">Broker</span></label>
                  <select><option value="">— None —</option></select>
                  <span className="crt-hint-text">Select a Broker</span>
                </div>
                <div className="crt-hierarchy-item">
                  <label>Under Sub Broker <span className="crt-role-badge crt-subbroker-badge">Sub Broker</span></label>
                  <select><option value="">— None —</option></select>
                  <span className="crt-hint-text">Select a Sub Broker</span>
                </div>
              </div>
            </div>

            {/* USER SETTINGS */}
            <div className={`crt-user-settings-segment ${isUser ? 'visible' : ''}`}>
              <div className="crt-settings-card">
                <div className="crt-settings-title">User Settings</div>
                <div className="crt-toggle-row">
                  <span className="crt-toggle-label">Active</span>
                  <div className={`crt-toggle-switch ${toggles.active ? 'active' : ''}`} onClick={() => toggle('active')}></div>
                </div>
                <div className="crt-toggle-row">
                  <span className="crt-toggle-label">Read Only</span>
                  <div className={`crt-toggle-switch ${toggles.readOnly ? 'active' : ''}`} onClick={() => toggle('readOnly')}></div>
                </div>
                <div className="crt-toggle-row">
                  <span className="crt-toggle-label">Demo User</span>
                  <div className={`crt-toggle-switch ${toggles.demoUser ? 'active' : ''}`} onClick={() => toggle('demoUser')}></div>
                </div>
                <div className="crt-toggle-row">
                  <span className="crt-toggle-label">Intraday Square Off</span>
                  <div className={`crt-toggle-switch ${toggles.intradaySqOff ? 'active' : ''}`} onClick={() => toggle('intradaySqOff')}></div>
                </div>
                <div className="crt-toggle-row" style={{ borderBottom: 'none' }}>
                  <span className="crt-toggle-label">SL Target Removal</span>
                  <div className={`crt-toggle-switch ${toggles.slTargetRemoval ? 'active' : ''}`} onClick={() => toggle('slTargetRemoval')}></div>
                </div>
              </div>
            </div>

            {/* SQUARE OFF SETTINGS */}
            <div className={`crt-squareoff-settings-segment ${isUser ? 'visible' : ''}`}>
              <div className="crt-squareoff-settings-card">
                <div className="crt-sq-title">Square Off Settings</div>
                <div className="crt-sq-row">
                  <span className="crt-sq-label">Base Auto Sqoff %</span>
                  <input className="crt-sq-input" type="number" defaultValue="90" min="0" max="100" />
                </div>
                <div className="crt-sq-row">
                  <span className="crt-sq-label">Showcase Sqoff %</span>
                  <input className="crt-sq-input" type="number" defaultValue="85" min="0" max="100" />
                </div>
                <div className="crt-sq-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <span className="crt-sq-label">Auto Sqoff Method</span>
                  <select className="crt-sq-select" defaultValue="Credit">
                    <option value="Credit">Credit</option>
                    <option value="Debit">Debit</option>
                    <option value="Net">Net</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BROKER SETTINGS */}
            <div className={`crt-broker-settings-segment ${showBrokerSettings ? 'visible' : ''}`}>
              <div className="crt-broker-settings-card">
                <div className="crt-br-title">Broker Settings</div>

                <div className="crt-br-section">
                  <div className="crt-br-section-title">User IDs</div>
                  <div className="crt-br-id-row">
                    <span className="crt-br-label">Active IDs</span>
                    <input className="crt-br-input" type="number" defaultValue="0" min="0" />
                    <span className="crt-br-hint">Currently active</span>
                  </div>
                  <div className="crt-br-id-row" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                    <span className="crt-br-label">Total IDs</span>
                    <input className="crt-br-input" type="number" defaultValue="0" min="0" />
                    <span className="crt-br-hint">Total allocated</span>
                  </div>
                </div>

                <div className="crt-br-section">
                  <div className="crt-br-section-title">Brokerage Sharing</div>
                  <div className="crt-br-row">
                    <span className="crt-br-label">Brokerage Share (%)</span>
                    <input className="crt-br-input" type="number" defaultValue="50" min="0" max="100" step="0.5" />
                    <span className="crt-br-hint">Broker's share</span>
                  </div>
                  <div className="crt-br-row">
                    <span className="crt-br-label">Brokerage Type</span>
                    <select className="crt-br-select"><option>Percentage</option></select>
                  </div>
                </div>

                <div className="crt-br-section">
                  <div className="crt-br-section-title">Profit / Loss Sharing</div>
                  <div className="crt-br-row">
                    <span className="crt-br-label">Profit Share (%)</span>
                    <input className="crt-br-input" type="number" defaultValue="40" min="0" max="100" step="0.5" />
                    <span className="crt-br-hint">Profit share</span>
                  </div>
                  <div className="crt-br-row">
                    <span className="crt-br-label">Loss Share (%)</span>
                    <input className="crt-br-input" type="number" defaultValue="40" min="0" max="100" step="0.5" />
                    <span className="crt-br-hint">Loss share</span>
                  </div>
                  <div className="crt-br-row">
                    <span className="crt-br-label">Sharing Basis</span>
                    <select className="crt-br-select"><option>Daily</option><option>Weekly</option><option>Monthly</option></select>
                  </div>
                </div>

                <div className="crt-br-section" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <div className="crt-br-section-title">Controls Allowed</div>
                  
                  {[
                    { key: 'canAddUsers', label: 'Can Add Users' },
                    { key: 'canModify', label: 'Can Modify Settings' },
                    { key: 'canView', label: 'Can View Reports' },
                    { key: 'canManage', label: 'Can Manage Users' },
                    { key: 'canChangeComm', label: 'Can Change Commission' },
                    { key: 'canViewClient', label: 'Can View Client Data' },
                  ].map((ctrl, i, arr) => (
                    <div className="crt-br-control-row" key={ctrl.key} style={i === arr.length - 1 ? { borderBottom: 'none' } : {}}>
                      <span className="crt-control-label">{ctrl.label}</span>
                      <div className="crt-control-toggles">
                        <div className="crt-toggle-group">
                          <span>Control</span>
                          <div className={`crt-toggle-switch-xs ${toggles[`${ctrl.key}_control`] ? 'active' : ''}`} onClick={() => toggle(`${ctrl.key}_control`)}></div>
                        </div>
                        <div className="crt-toggle-group">
                          <span>Change</span>
                          <div className={`crt-toggle-switch-xs ${toggles[`${ctrl.key}_change`] ? 'active' : ''}`} onClick={() => toggle(`${ctrl.key}_change`)}></div>
                        </div>
                        <div className="crt-toggle-group">
                          <span>Delete</span>
                          <div className={`crt-toggle-switch-xs ${toggles[`${ctrl.key}_delete`] ? 'active' : ''}`} onClick={() => toggle(`${ctrl.key}_delete`)}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* EXCHANGE SEGMENTS */}
            <div className="crt-exchange-segments-segment visible">
              <div className="crt-exchange-card">
                <div className="crt-ex-title">Exchange Segments</div>
                <div className="crt-exchange-grid">
                  {SEGMENTS.map(s => (
                    <label className="crt-exchange-check" key={s}>
                      <input type="checkbox" defaultChecked /> {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* SEGMENT SETTINGS */}
            <div className="crt-segment-settings-segment visible" style={{ gridColumn: '1 / -1' }}>
              <div className="crt-segment-card">
                <div className="crt-seg-header">
                  <span className="crt-seg-title">Segment Settings</span>
                </div>
                <div className="crt-segment-buttons">
                  {SEGMENTS.map(s => (
                    <button type="button" key={s} className={`crt-segment-btn ${activeSegment === s ? 'active' : ''}`} onClick={() => setActiveSegment(s)}>{s}</button>
                  ))}
                </div>
                <div className="crt-segment-detail-container">
                  <div className="crt-segment-detail visible">
                    <div className="crt-detail-title">{activeSegment} · Settings</div>
                    
                    {['BUY', 'SELL'].map(side => (
                      <div className="crt-side-section" key={side}>
                        <div className="crt-side-header" onClick={() => setSideExpanded(p => ({ ...p, [side]: !p[side] }))}>
                          <span className="crt-side-name">{side}</span>
                          <span className="crt-side-toggle">{sideExpanded[side] ? '▼' : '▶'}</span>
                        </div>
                        <div className={`crt-side-body ${sideExpanded[side] ? '' : 'collapsed'}`}>
                          {/* Regular Fields */}
                          <div className="crt-seg-field"><span className="crt-seg-field-label">Intraday Commission Type</span><select className="crt-seg-field-select"><option>Per Crore</option></select></div>
                          <div className="crt-seg-field"><span className="crt-seg-field-label">Intraday Commission Value</span><input className="crt-seg-field-input" type="number" defaultValue="4500" /></div>
                          <div className="crt-seg-field"><span className="crt-seg-field-label">Carry Commission Type</span><select className="crt-seg-field-select"><option>Per Lot</option></select></div>
                          <div className="crt-seg-field"><span className="crt-seg-field-label">Carry Commission Value</span><input className="crt-seg-field-input" type="number" defaultValue="20" /></div>
                          <div className="crt-seg-field"><span className="crt-seg-field-label">GTT Commission Type</span><select className="crt-seg-field-select"><option>Per Trade</option></select></div>
                          <div className="crt-seg-field"><span className="crt-seg-field-label">GTT Commission Value</span><input className="crt-seg-field-input" type="number" defaultValue="15" /></div>
                          <div className="crt-seg-field"><span className="crt-seg-field-label">Profit Hold Sec</span><input className="crt-seg-field-input" type="number" defaultValue="120" /></div>
                          <div className="crt-seg-field"><span className="crt-seg-field-label">Loss Hold Sec</span><input className="crt-seg-field-input" type="number" defaultValue="0" /></div>
                          
                          {/* Carry Margin */}
                          <div className="crt-carry-margin-row">
                            <div className="crt-carry-header">
                              <span className="crt-carry-label">Carry Margin Interest</span>
                              <div className="crt-carry-toggle">
                                <span>{toggles.carryMarginON ? 'ON' : 'OFF'}</span>
                                <div className={`crt-toggle-switch-sm ${toggles.carryMarginON ? 'active' : ''}`} onClick={() => toggle('carryMarginON')}></div>
                              </div>
                            </div>
                            {toggles.carryMarginON && (
                              <div className="crt-carry-fields">
                                <div className="crt-seg-field"><span className="crt-seg-field-label">Carry Margin Interest (%)</span><input className="crt-seg-field-input" type="number" defaultValue="12" step="0.01" /><span className="crt-seg-hint">Annual interest rate</span></div>
                                <div className="crt-seg-field"><span className="crt-seg-field-label">Carry Interest Type</span><select className="crt-seg-field-select"><option>Simple</option></select></div>
                              </div>
                            )}
                          </div>

                          <div className="crt-trade-allowed-row">
                            <label><input type="checkbox" checked={toggles.tradeAllowed} onChange={() => toggle('tradeAllowed')} /> Trade Allowed</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          <div className="crt-form-actions">
            <button type="button" className="crt-btn-secondary" onClick={onBack}>Cancel</button>
            <button type="submit" className="crt-btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </div>

      <div className="crt-footer-note">Super Admin · Account Management</div>
    </div>
  );
}
