'use client';
import React, { useState, useEffect } from 'react';
import { apiCall, Toast, ToastState } from '../AdminUtils';

export default function SettingsApp() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const [allowNewRegistrations, setAllowNewRegistrations] = useState(true);
  
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiCall('/api/admin/platform-settings', { method: 'GET' });
      if (ok && (data as any)?.settings) {
        const s = (data as any).settings;
        setMaintenanceMode(s.MAINTENANCE_MODE === 'true');
        setGlobalKillSwitch(s.GLOBAL_KILL_SWITCH === 'true');
        setAllowNewRegistrations(s.ALLOW_REGISTRATIONS !== 'false');
      }
    } catch (e: any) {
      setToast({ message: 'Failed to load app settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const { ok, data } = await apiCall('/api/admin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({
          MAINTENANCE_MODE: String(maintenanceMode),
          GLOBAL_KILL_SWITCH: String(globalKillSwitch),
          ALLOW_REGISTRATIONS: String(allowNewRegistrations),
        }),
      });

      if (!ok) {
        setToast({ message: (data as any)?.error || 'Failed to save settings', type: 'error' });
      } else {
        setToast({ message: 'Platform settings saved successfully!', type: 'success' });
      }
    } catch (e: any) {
      setToast({ message: e?.message || 'Network error saving settings', type: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="adm-set-root">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      
      <div className="adm-mw-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="adm-page-title" style={{ margin: 0 }}>App Settings</h2>
          <p style={{ margin: '4px 0 0', color: '#8b949e', fontSize: '13px' }}>Platform-wide toggles and general configurations.</p>
        </div>
      </div>

      <div className="adm-card" style={{ maxWidth: 600, padding: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 24, color: '#0f172a', fontSize: '16px', paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>Global Toggles</h3>
        
        {loading ? (
          <div style={{ color: '#64748b', padding: '16px 0' }}>Loading settings...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Maintenance Mode */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: 4 }}>Maintenance Mode</div>
                <div style={{ color: '#64748b', fontSize: '13px' }}>Shows a maintenance page to all users. Admins can still log in.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={maintenanceMode} 
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '20px', height: '20px' }}
                />
              </label>
            </div>

            {/* Global Kill Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: 4 }}>Global Trading Kill Switch</div>
                <div style={{ color: '#64748b', fontSize: '13px' }}>Emergency! Instantly disables all new order placement across the entire platform.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={globalKillSwitch} 
                  onChange={(e) => setGlobalKillSwitch(e.target.checked)}
                  style={{ accentColor: '#dc2626', width: '20px', height: '20px' }}
                />
              </label>
            </div>

            {/* Allow Registrations */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: 4 }}>Allow New Registrations</div>
                <div style={{ color: '#64748b', fontSize: '13px' }}>Controls whether new users can sign up via the public registration page.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={allowNewRegistrations} 
                  onChange={(e) => setAllowNewRegistrations(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '20px', height: '20px' }}
                />
              </label>
            </div>
          </div>
        )}
        
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
          <button 
            className="adm-btn-primary" 
            onClick={handleSave} 
            disabled={saveLoading || loading}
          >
            {saveLoading ? 'Saving...' : 'Save App Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
