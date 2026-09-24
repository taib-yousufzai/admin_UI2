/**
 * GET /api/admin/settings/trading-hours
 * PUT /api/admin/settings/trading-hours
 * 
 * Manages segment-wise trading hours.
 */

import { requireAdmin } from '../../_auth';

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) return authResult;
    const { adminClient } = authResult;

    const { data, error } = await adminClient
      .from('trading_hours')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('[GET trading-hours] Error:', error.message);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }

    return Response.json(data || [], { status: 200 });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) return authResult;
    const { adminClient } = authResult;

    const body = await request.json();
    const { segments } = body; // Array of { id, name, startTime, endTime, isActive }

    if (!Array.isArray(segments)) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Upsert all segments
    const upsertData = segments.map(s => ({
      id: s.id,
      name: s.name,
      start_time: s.startTime,
      end_time: s.endTime,
      is_active: s.isActive,
      updated_at: new Date().toISOString()
    }));

    const { error } = await adminClient
      .from('trading_hours')
      .upsert(upsertData, { onConflict: 'id' });

    return Response.json({ success: true }, { status: 200 });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) return authResult;
    const { adminClient } = authResult;

    const body = await request.json().catch(() => ({}));
    if (body.global_trading_lock) {
      // Set all trading hours segments to inactive
      await adminClient
        .from('trading_hours')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .neq('id', 'non_existing_id');

      // Also set platform-wide kill switch if platform_settings exists
      try {
        const { setPlatformSetting } = await import('@/lib/getPlatformSetting');
        await setPlatformSetting('GLOBAL_KILL_SWITCH', 'true');
      } catch {}

      return Response.json({ success: true, message: 'Global trading locked' }, { status: 200 });
    }

    return Response.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
