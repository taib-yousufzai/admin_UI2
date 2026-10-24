'use client';

let cachedToken: string | null = null;
let cachedUserId: string | null = null;
let sessionPromise: Promise<{ token: string | null; userId: string | null }> | null = null;

function readLocalStorage(): { token: string | null; userId: string | null } {
  if (typeof window === 'undefined') return { token: null, userId: null };
  try {
    const directToken = localStorage.getItem('auth_token');
    const directUserStr = localStorage.getItem('auth_user');
    if (directToken) {
      let userId: string | null = null;
      try {
        if (directUserStr) userId = JSON.parse(directUserStr).id;
      } catch {}
      if (!userId) {
        try { userId = JSON.parse(atob(directToken.split('.')[1])).sub ?? null; } catch {}
      }
      return { token: directToken, userId };
    }
    return { token: null, userId: null };
  } catch {
    return { token: null, userId: null };
  }
}

export async function getSharedSession(): Promise<{ token: string | null; userId: string | null }> {
  if (cachedToken) {
    try {
      const exp = JSON.parse(atob(cachedToken.split('.')[1])).exp;
      if (exp && Date.now() / 1000 < exp) return { token: cachedToken, userId: cachedUserId };
    } catch {}
    cachedToken = null;
    cachedUserId = null;
  }
  const local = readLocalStorage();
  if (local.token) {
    cachedToken = local.token;
    cachedUserId = local.userId;
    return local;
  }
  return { token: null, userId: null };
}

export function getSharedSessionSync(): { token: string | null; userId: string | null } {
  if (cachedToken) {
    try {
      const exp = JSON.parse(atob(cachedToken.split('.')[1])).exp;
      if (exp && Date.now() / 1000 < exp) return { token: cachedToken, userId: cachedUserId };
    } catch {}
    cachedToken = null;
    cachedUserId = null;
  }
  const local = readLocalStorage();
  cachedToken = local.token;
  cachedUserId = local.userId;
  return local;
}

export function clearSharedSession(): void {
  cachedToken = null;
  cachedUserId = null;
  sessionPromise = null;
}
