'use client';
import React, { useState, useEffect } from 'react';
import { apiCall, Toast, ToastState } from '../AdminUtils';

export default function SettingsCurrency() {
  const [exchangeRate, setExchangeRate] = useState('83.50');
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchRate();
  }, []);

  const fetchRate = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiCall('/api/admin/platform-settings', { method: 'GET' });
      if (ok && (data as any)?.settings?.USD_INR_RATE) {
        setExchangeRate((data as any).settings.USD_INR_RATE);
      }
    } catch (e: any) {
      setToast({ message: 'Failed to load exchange rate', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!exchangeRate || isNaN(Number(exchangeRate)) || Number(exchangeRate) <= 0) {
      setToast({ message: 'Please enter a valid positive number', type: 'error' });
      return;
    }
    
    setSaveLoading(true);
    try {
      const { ok, data } = await apiCall('/api/admin/platform-settings', {
        method: 'PUT',
        body: JSON.stringify({ USD_INR_RATE: exchangeRate.trim() }),
      });

      if (!ok) {
        setToast({ message: (data as any)?.error || 'Failed to save exchange rate', type: 'error' });
      } else {
        setToast({ message: 'Exchange rate saved successfully', type: 'success' });
      }
    } catch (e: any) {
      setToast({ message: e?.message || 'Network error saving rate', type: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="adm-set-root">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      
      <div className="adm-mw-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="adm-page-title" style={{ margin: 0 }}>Currency Settings</h2>
          <p style={{ margin: '4px 0 0', color: '#8b949e', fontSize: '13px' }}>Configure the global exchange rate used for FOREX and COMEX conversion.</p>
        </div>
      </div>

      <div className="adm-card" style={{ maxWidth: 500, padding: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 20, color: '#0f172a', fontSize: '16px' }}>USD/INR Exchange Rate</h3>
        
        <div className="adm-upd-field">
          <label className="adm-upd-label">1 USD equals (INR)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#64748b', fontWeight: 'bold' }}>₹</span>
            <input 
              type="number" 
              className="adm-upd-input" 
              value={exchangeRate}
              onChange={e => setExchangeRate(e.target.value)}
              placeholder="83.50"
              step="0.01"
              disabled={loading}
              style={{ maxWidth: 200 }}
            />
          </div>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '12px' }}>
            This rate will be multiplied by the live USD price for applicable segments to display the INR equivalent.
          </p>
        </div>
        
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
          <button 
            className="adm-btn-primary" 
            onClick={handleSave} 
            disabled={saveLoading || loading}
          >
            {saveLoading ? 'Saving...' : 'Save Exchange Rate'}
          </button>
        </div>
      </div>
    </div>
  );
}
