import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cpcvklekwwawgtgbyrmp.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? 'sb_publishable_placeholder';

  if (!_client) {
    _client = createClient(url, key, { auth: { persistSession: true } });
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const client = createSupabaseClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    const client = createSupabaseClient();
    return Reflect.set(client, prop, value, client);
  }
});
