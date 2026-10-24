import { getRole } from './auth';
import { Permission, hasPermission } from './permissions';
import { getAdminClient, getUserFromRequest } from './adminClient';

export interface AuthContext {
  adminClient: any;
  callerUser: any;
  callerRole: string;
}

/**
 * Validates the Bearer token, fetches the user, and ensures they have all required permissions.
 *
 * Returns AuthContext on success.
 * Returns a Response (401 or 403) on failure.
 */
export async function requireAuth(
  request: Request,
  requiredPermissions: Permission[] = []
): Promise<AuthContext | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getAdminClient();
  const user = await getUserFromRequest(request);
  if (!user) {
    console.error('[requireAuth] getUser failed or token expired');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = getRole(user);

  for (const perm of requiredPermissions) {
    if (!hasPermission(role, perm)) {
      return Response.json({ error: `Forbidden: Missing ${perm}` }, { status: 403 });
    }
  }

  return { adminClient, callerUser: user, callerRole: role };
}
