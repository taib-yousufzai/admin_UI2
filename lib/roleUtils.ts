/**
 * roleUtils.ts — shared role helpers with no 'use client' directive.
 * Safe to import in both server-side API routes and client components.
 */

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string;
    [key: string]: any;
  };
  app_metadata?: {
    role?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export type AppRole = 'super_admin' | 'admin' | 'broker' | 'sub_broker' | 'user';

export function getRole(user: User | null): AppRole {
  const r = (user?.user_metadata?.role || user?.role || user?.app_metadata?.role || '')
    .toString()
    .toLowerCase()
    .trim();
  if (r === 'super_admin') return 'super_admin';
  if (r === 'admin') return 'admin';
  if (r === 'broker') return 'broker';
  if (r === 'sub_broker') return 'sub_broker';
  return 'user';
}
