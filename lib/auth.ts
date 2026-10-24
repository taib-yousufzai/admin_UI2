import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Discriminated union returned by signIn.
 * On success: { session, user }
 * On failure: { error }
 */
export type SignInResult =
  | { session: Session; user: User; error?: never }
  | { session?: never; user?: never; error: string };

/**
 * Discriminated union returned by requestPasswordReset and updatePassword.
 * On success: { success: true }
 * On failure: { error }
 */
export type PasswordResetResult =
  | { success: true }
  | { error: string };

/**
 * All valid application roles.
 * Stored in user.user_metadata.role.
 */
export type AppRole = 'super_admin' | 'admin' | 'broker' | 'sub_broker' | 'user';

export function getRole(user: User | null): AppRole {
  const r = (user?.user_metadata?.role || (user as any)?.role || user?.app_metadata?.role || '')
    .toString()
    .toLowerCase()
    .trim();
  if (r === 'super_admin') return 'super_admin';
  if (r === 'admin') return 'admin';
  if (r === 'broker') return 'broker';
  if (r === 'sub_broker') return 'sub_broker';
  return 'user';
}

// ─── Auth functions ───────────────────────────────────────────────────────────

/**
 * Signs in a user with email and password via Supabase Auth.
 *
 * On success returns { session, user }.
 * On any error returns { error: "Invalid credentials. Please try again." } —
 * the raw Supabase error is never surfaced to callers.
 *
 * Validates: Requirements 2.1, 2.3, 5.3
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.session && data.user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.session.access_token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
      return { session: data.session, user: data.user };
    }
  } catch (e) {
    // Fall back to Supabase auth
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      return { error: 'Invalid credentials. Please try again.' };
    }
    return { session: data.session, user: data.user };
  } catch {
    return { error: 'Invalid credentials. Please try again.' };
  }
}

/**
 * Signs out the current user and redirects to /login.
 */
export async function signOut(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    } catch {}
  }
  _cachedSession = null;
  _cacheTimestamp = 0;
  try {
    await supabase.auth.signOut();
  } catch {}
  window.location.href = '/login';
}

/**
 * Requests a password reset email for the given address via Supabase Auth.
 *
 * On success returns { success: true }.
 * On any error returns { error: "Something went wrong. Please try again." } —
 * the raw Supabase error is never surfaced to callers.
 *
 * Validates: Requirements 5.1, 5.3, 5.5
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { error: 'Something went wrong. Please try again.' };
    }

    return { success: true };
  } catch {
    return { error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Updates the current user's password via Supabase Auth.
 * Requires an active PASSWORD_RECOVERY session.
 *
 * On success returns { success: true }.
 * On any error returns { error: "Failed to update password. Please try again or request a new reset link." } —
 * the raw Supabase error is never surfaced to callers.
 *
 * Validates: Requirements 5.2, 5.4, 5.6
 */
export async function updatePassword(newPassword: string): Promise<PasswordResetResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { error: 'Failed to update password. Please try again or request a new reset link.' };
    }

    return { success: true };
  } catch {
    return { error: 'Failed to update password. Please try again or request a new reset link.' };
  }
}

// ─── Session helpers ──────────────────────────────────────────────────────────

// In-memory session cache — avoids a network round-trip on every page mount.
// Invalidated on sign-out and refreshed when the token changes.
let _cachedSession: Session | null = null;
let _cacheTimestamp = 0;
const SESSION_CACHE_TTL_MS = 60_000; // re-validate after 60 seconds

// Supabase keeps the session fresh via its own token refresh mechanism.
// We listen for auth state changes to keep our cache in sync.
if (typeof window !== 'undefined') {
  import('./supabaseClient').then(({ supabase: sb }) => {
    sb.auth.onAuthStateChange((_event, session) => {
      if (session) {
        _cachedSession = session;
        _cacheTimestamp = Date.now();
      } else {
        _cachedSession = null;
        _cacheTimestamp = 0;
      }
    });
  });
}

/**
 * Returns the current Supabase session, or null if the user is not authenticated.
 * Uses an in-memory cache (60s TTL) to avoid a network call on every page mount.
 * Falls back to a fresh getUser() call when the cache is stale or empty.
 *
 * Validates: Requirements 3.2
 */
let _sessionPromise: Promise<Session | null> | null = null;

export async function getSession(): Promise<Session | null> {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      if (token) {
        let user: any = null;
        if (userStr) {
          try { user = JSON.parse(userStr); } catch {}
        }
        if (!user) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const r = payload.user_metadata?.role || payload.role;
            user = { id: payload.sub, email: payload.email, role: r, user_metadata: payload.user_metadata || { role: r } };
          } catch {}
        }
        return {
          access_token: token,
          token_type: 'bearer',
          user,
        } as unknown as Session;
      }
    } catch {}
  }

  if (_sessionPromise) {
    return _sessionPromise;
  }

  _sessionPromise = (async () => {
    try {
      // Return cached session if still fresh
      if (_cachedSession && Date.now() - _cacheTimestamp < SESSION_CACHE_TTL_MS) {
        return _cachedSession;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        _cachedSession = null;
        return null;
      }

      // Refresh user data from server to get latest user_metadata (e.g. role)
      let user = sessionData.session.user;
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userError && userData?.user) {
          user = userData.user;
        }
      } catch {}

      const freshSession = { ...sessionData.session, user };

      _cachedSession = freshSession;
      _cacheTimestamp = Date.now();
      return freshSession;
    } catch (err) {
      console.error('getSession unexpected error:', err);
      // Fallback to cached session if available instead of hard failing
      if (_cachedSession) {
        return _cachedSession;
      }
      return null;
    } finally {
      _sessionPromise = null;
    }
  })();

  return _sessionPromise;
}

