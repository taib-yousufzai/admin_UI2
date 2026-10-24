/**
 * Shared admin authentication helper.
 * Used by all /api/admin/* route handlers to validate the caller's identity
 * and assert they hold the admin, super_admin, or broker role.
 */

import { requireAuth } from '../../../lib/api-middleware';

export interface AdminContext {
  adminClient: any;
  callerUser: any;
  role: string;
}

/**
 * Validates the Bearer token and asserts the caller is admin, super_admin, broker, or sub_broker.
 */
export async function requireAdmin(
  request: Request,
): Promise<AdminContext | Response> {
  const authResult = await requireAuth(request, []);
  if (authResult instanceof Response) return authResult;
  
  const { adminClient, callerUser, callerRole } = authResult;
  const role = (callerRole || '').toLowerCase();

  if (!['admin', 'super_admin', 'broker', 'sub_broker'].includes(role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { adminClient, callerUser, role };
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
  const role = (callerRole || '').toLowerCase();

  if (role !== 'super_admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { adminClient, callerUser, role };
}
