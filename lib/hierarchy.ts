/**
 * Strict Hierarchical Multi-Tenant Access Control (RBAC).
 * 
 * Rules:
 * - Super Admins have visibility over everyone across the platform.
 * - Admins can ONLY view/manage Brokers, Sub-Brokers, and Users within their own branch.
 *   Under NO circumstance can an Admin see Super Admin or other Admins.
 * - Brokers can ONLY view/manage Sub-Brokers and Users under them.
 *   Under NO circumstance can a Broker see Super Admin, Admins, or other Brokers.
 * - Sub-Brokers can ONLY view/manage Users directly under them.
 *   Under NO circumstance can a Sub-Broker see Super Admin, Admins, Brokers, or other Sub-Brokers.
 * - Users can only view themselves.
 */

export async function isUserInHierarchy(
  supabase: any,
  actorId: string,
  targetUserId: string,
  actorRoleParam?: string
): Promise<boolean> {
  // Trivially true if actor is the target
  if (actorId === targetUserId) {
    return true;
  }

  let actorRole = (actorRoleParam || '').toLowerCase();

  if (!actorRole) {
    // Fetch actor's role if not provided
    const { data: actorData, error: actorError } = await supabase
      .from('profiles')
      .select('role, parent_id')
      .eq('id', actorId)
      .single();

    if (actorError || !actorData) {
      console.error('Error fetching actor role:', actorError);
      return false;
    }

    actorRole = (actorData.role || '').toLowerCase();
  }

  // ONLY Super Admin has unrestricted access to everyone
  if (actorRole === 'super_admin') {
    return true;
  }

  // Users cannot see anyone else
  if (actorRole === 'user') {
    return false;
  }

  // Fetch the target user's role & parent
  const { data: targetData, error: targetError } = await supabase
    .from('profiles')
    .select('id, role, parent_id')
    .eq('id', targetUserId)
    .single();

  if (targetError || !targetData) {
    return false;
  }

  const targetRole = (targetData.role || '').toLowerCase();

  // Non-super-admins can NEVER access a Super Admin
  if (targetRole === 'super_admin') {
    return false;
  }

  // Admins can NEVER access other Admins
  if (actorRole === 'admin' && targetRole === 'admin') {
    return false;
  }

  // Brokers can NEVER access Admins or other Brokers
  if (actorRole === 'broker' && (targetRole === 'admin' || targetRole === 'broker')) {
    return false;
  }

  // Sub-Brokers can NEVER access Admins, Brokers, or other Sub-Brokers
  if (actorRole === 'sub_broker' && (targetRole === 'admin' || targetRole === 'broker' || targetRole === 'sub_broker')) {
    return false;
  }

  // Fetch the target user's ancestry up to actorId
  let currentTargetParentId: string | null = targetData.parent_id;
  let depth = 0;
  const MAX_DEPTH = 10;

  while (currentTargetParentId && depth < MAX_DEPTH) {
    if (currentTargetParentId === actorId) {
      return true;
    }
    const { data: parentData }: { data: any } = await supabase
      .from('profiles')
      .select('parent_id')
      .eq('id', currentTargetParentId)
      .single();

    if (!parentData) break;
    currentTargetParentId = parentData.parent_id;
    depth++;
  }

  return false;
}

/**
 * Returns the list of accessible descendant user/profile IDs for a given actor according to hierarchy.
 * Returns null ONLY if the actor is super_admin (meaning unrestricted access to all users).
 */
export async function getDescendantUserIds(
  supabase: any,
  actorId: string,
  actorRole: string
): Promise<string[] | null> {
  const normRole = (actorRole || '').toLowerCase();

  if (normRole === 'super_admin') {
    return null; // Only super_admin has unrestricted platform-wide access
  }

  const { data: allProfiles, error } = await supabase
    .from('profiles')
    .select('id, role, parent_id');

  if (error || !allProfiles) {
    console.error('Error fetching hierarchy profiles:', error);
    return [actorId];
  }

  // Recursive search strictly down the tree from actorId
  const getChildren = (parentId: string): string[] => {
    const directChildren = (allProfiles as any[]).filter(p => p.parent_id === parentId);
    
    // Strict isolation: filter out any prohibited cross-tenant roles
    const validChildren = directChildren.filter(p => {
      const pRole = (p.role || '').toLowerCase();
      if (pRole === 'super_admin') return false;
      if (normRole === 'admin' && pRole === 'admin') return false;
      if (normRole === 'broker' && (pRole === 'admin' || pRole === 'broker')) return false;
      if (normRole === 'sub_broker' && (pRole === 'admin' || pRole === 'broker' || pRole === 'sub_broker')) return false;
      return true;
    }).map(p => p.id);

    const indirectChildren = validChildren.flatMap(childId => getChildren(childId));
    return [...validChildren, ...indirectChildren];
  };

  const descendants = Array.from(new Set([actorId, ...getChildren(actorId)]));
  return descendants;
}
