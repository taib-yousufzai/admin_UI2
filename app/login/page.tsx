'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if already logged in so admin doesn't have to re-login every time
  useEffect(() => {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        const role = (user.role || user.user_metadata?.role || '').toLowerCase();
        if (role === 'admin' || role === 'super_admin' || role === 'broker' || role === 'sub_broker') {
          router.replace('/admin');
        }
      }
    } catch {}
  }, [router]);

  const handleQuickAdminLogin = async () => {
    setError(null);
    setLoading(true);
    setEmail('admin@gmail.com');
    setPassword('••••••••');

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@gmail.com', password: 'admin' }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Quick login failed');
        setLoading(false);
        return;
      }

      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.location.href = '/admin';
      } else {
        setError('No access token received');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.location.href = '/admin';
      } else {
        setError('No access token received');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B0E14',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#151921',
          border: '1px solid #262B36',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(0, 200, 83, 0.1)',
              color: '#00C853',
              marginBottom: '1rem',
              fontSize: '1.25rem',
            }}
          >
            <i className="fas fa-shield-alt" />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            MARGIN<span style={{ color: '#00C853' }}>APEX</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#8A92A6', marginTop: '0.35rem' }}>
            Administrative Control Panel
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#EF4444',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#C5CAD6', marginBottom: '0.4rem' }}>
              Email or Admin ID
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '8px',
                background: '#0D1117',
                border: '1px solid #2B313E',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#C5CAD6', marginBottom: '0.4rem' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '8px',
                background: '#0D1117',
                border: '1px solid #2B313E',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              borderRadius: '8px',
              background: '#00C853',
              color: '#000000',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.3rem 0', gap: '0.8rem' }}>
            <div style={{ flex: 1, height: '1px', background: '#262B36' }} />
            <span style={{ fontSize: '0.75rem', color: '#8A92A6', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#262B36' }} />
          </div>

          {/* Quick Demo Admin Login */}
          <button
            type="button"
            disabled={loading}
            onClick={handleQuickAdminLogin}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(88, 166, 255, 0.1)',
              border: '1px solid rgba(88, 166, 255, 0.3)',
              color: '#58a6ff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <i className="fas fa-bolt" /> ⚡ 1-Click Demo Admin Login
          </button>
        </form>
      </div>
    </div>
  );
}
