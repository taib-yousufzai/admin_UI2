'use client';
import React, { useState } from 'react';
import { apiCall, Toast, ToastState } from '../AdminUtils';

const ALL_SEGMENTS = ['INDEX-FUT', 'STOCK-OPT', 'NSE-EQ', 'COMEX', 'INDEX-OPT', 'MCX-FUT', 'CRYPTO', 'STOCK-FUT', 'MCX-OPT', 'FOREX'];

export default function UpdateCopySettings({ selectedUser }: { selectedUser?: { id: string } }) {
  const [sourceUid, setSourceUid] = useState('');
  const [targetUid, setTargetUid] = useState(selectedUser?.id || '');
  const [segmentsToCopy, setSegmentsToCopy] = useState<string[]>(ALL_SEGMENTS);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const toggleSeg = (s: string) => {
    setSegmentsToCopy(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSelectAll = () => {
    if (segmentsToCopy.length === ALL_SEGMENTS.length) {
      setSegmentsToCopy([]);
    } else {
      setSegmentsToCopy(ALL_SEGMENTS);
    }
  };

  const handleCopy = async () => {
    if (!sourceUid) {
      setToast({ message: 'Please enter a Source User ID', type: 'error' });
      return;
    }
    if (!targetUid) {
      setToast({ message: 'Please enter a Target User ID', type: 'error' });
      return;
    }
    if (segmentsToCopy.length === 0) {
      setToast({ message: 'Please select at least one segment to copy', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await apiCall(`/api/admin/users/copy-settings`, {
        method: 'POST',
        body: JSON.stringify({ source: sourceUid.trim(), target: targetUid.trim(), segments: segmentsToCopy }),
      });
      
      if (!res.ok) {
        setLoading(false);
        setToast({ message: (res.data as any)?.error || 'Failed to copy settings', type: 'error' });
        return;
      }
      
      setLoading(false);
      setToast({ message: (res.data as any)?.message || 'Settings copied successfully', type: 'success' });
      setSourceUid('');
    } catch (e: any) {
      setLoading(false);
      setToast({ message: e?.message || 'Error copying settings', type: 'error' });
    }
  };

  return (
    <div className="adm-upd-root" style={{ padding: '0 0 40px 0' }}>
      <div className="adm-upd-section-title">Copy Segment Settings</div>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: 20 }}>
        Clone trading rules and segment configurations from an existing user account to a target user account.
      </p>

      <div className="adm-upd-card">
        <div className="adm-upd-grid2">
          <div className="adm-upd-field">
            <label className="adm-upd-label">Source User ID</label>
            <input 
              className="adm-upd-input" 
              placeholder="e.g. USER123"
              value={sourceUid} 
              onChange={e => setSourceUid(e.target.value)} 
            />
          </div>
          <div className="adm-upd-field">
            <label className="adm-upd-label">Target User ID</label>
            <input 
              className="adm-upd-input" 
              value={targetUid} 
              onChange={e => setTargetUid(e.target.value)} 
            />
          </div>
        </div>

        <div className="adm-upd-section-title" style={{ marginTop: 24, fontSize: '15px' }}>
          Select Segments to Copy
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <button 
            onClick={handleSelectAll}
            style={{ 
              background: 'transparent', 
              border: '1px solid #e5e7eb', 
              color: '#6b7280', 
              padding: '6px 12px', 
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {segmentsToCopy.length === ALL_SEGMENTS.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="adm-cu-segments-grid">
          {ALL_SEGMENTS.map(s => (
            <label className="adm-cu-seg-item" key={s}>
              <input 
                type="checkbox" 
                className="adm-cu-checkbox" 
                checked={segmentsToCopy.includes(s)} 
                onChange={() => toggleSeg(s)} 
              />
              <span className="adm-cu-seg-label">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <button 
        className="adm-btn-primary" 
        style={{ width: '100%', padding: '14px', fontSize: '0.9rem', borderRadius: 10, marginTop: 20 }} 
        disabled={loading} 
        onClick={handleCopy}
      >
        {loading ? 'Processing…' : 'Copy Settings'}
      </button>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

