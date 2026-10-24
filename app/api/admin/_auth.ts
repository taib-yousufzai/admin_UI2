/**
 * Shared admin authentication helper.
 * Used by all /api/admin/* route handlers to validate the caller's identity
 * and assert they hold the admin or super_admin role.
 */

import { getRole } from '../../../lib/auth';
import { requireAuth } from '../../../lib/api-middleware';
import { getAdminClient } from '../../../lib/adminClient';

export interface AdminContext {
  adminClient: any;
  callerUser: any;
}

/**
 * Validates the Bearer token and asserts the caller is admin, super_admin, or broker.
 */
export async function requireAdmin(
  request: Request,
): Promise<AdminContext | Response> {
  const authResult = await requireAuth(request, []);
  if (authResult instanceof Response) return authResult;
  
  const { adminClient, callerUser, callerRole } = authResult;

  if (callerRole !== 'admin' && callerRole !== 'super_admin' && callerRole !== 'broker') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { adminClient, callerUser };
}

/**
 * Validates the Bearer token and asserts the caller is super_admin only.
 */
export async function requireSuperAdmin(
  request: Request,
): Promise<AdminContext | Response> {
  const authResult = await requireAuth(request, []);
  if (authResult instanceof Response) return authResult;
  
  const { adminClient, callerUser, callerRole } = authResult;

  if (callerRole !== 'super_admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { adminClient, callerUser };
}
