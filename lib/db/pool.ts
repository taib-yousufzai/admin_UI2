import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;
let railwayCircuitOpenUntil = 0;

export function tripRailwayCircuitBreaker(reason?: string): void {
  railwayCircuitOpenUntil = Date.now() + 60_000;
  console.warn(`[Admin-Postgres] Circuit breaker tripped for 60s (${reason || 'Connection failure'}).`);
  if (pool) {
    try {
      pool.end().catch(() => {});
    } catch {}
    pool = null;
  }
}

export function isRailwayCircuitOpen(): boolean {
  return Date.now() < railwayCircuitOpenUntil;
}

export function isRailwayConnectionError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'econnrefused' ||
    code === 'etimedout' ||
    code === 'enotfound' ||
    code === '57p01' ||
    code === '57p02' ||
    code === '57p03' ||
    msg.includes('connection refused') ||
    msg.includes('enotfound') ||
    msg.includes('could not connect') ||
    msg.includes('client has encountered a connection error')
  );
}

export function getRailwayDbUrl(): string | null {
  return (
    process.env.RAILWAY_DATABASE_URL ||
    (process.env.RAILWAY_ENVIRONMENT ? process.env.DATABASE_URL : null) ||
    process.env.DATABASE_PUBLIC_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    null
  );
}

export function isRailwayDbConfigured(): boolean {
  if (isRailwayCircuitOpen()) return false;
  return Boolean(getRailwayDbUrl());
}

export function getRailwayPool(): Pool | null {
  if (isRailwayCircuitOpen()) return null;
  const connectionString = getRailwayDbUrl();
  if (!connectionString) return null;

  if (!pool) {
    const isInternal = connectionString.includes('railway.internal');
    const poolConfig: PoolConfig = {
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: isInternal ? 1000 : 3000,
      statement_timeout: 5000,
    };

    if (connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.warn('[Admin-Postgres] Idle client error:', err.message);
      if (isRailwayConnectionError(err)) {
        tripRailwayCircuitBreaker(err.message);
      }
    });

    // Auto-heal missing columns and tables
    pool.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_id UUID;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS segments JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trading_mode TEXT DEFAULT 'normal';
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS demo_user BOOLEAN DEFAULT false;
      ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_id VARCHAR(6);
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_balance NUMERIC DEFAULT 0;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settlement_amount NUMERIC DEFAULT 0;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_sqoff NUMERIC DEFAULT 90;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS read_only BOOLEAN DEFAULT false;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intraday_sq_off BOOLEAN DEFAULT true;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sqoff_method TEXT DEFAULT 'MARKET';

      UPDATE profiles SET referral_code = client_id WHERE referral_code IS NULL AND client_id IS NOT NULL;

      INSERT INTO profiles (id, email, full_name, client_id, referral_code, role, active, balance, created_at, updated_at)
      VALUES 
        ('e67f6663-d095-4341-982a-a499cf72a6e6', 'admin@gmail.com', 'Super Admin', '9A06B2', '9A06B2', 'super_admin', true, 10000000, now(), now()),
        ('59032bf6-1974-472c-8372-16d876ecf4b7', 'admin.rupeefx@gmail.com', 'Admin@rupeeFX@#', 'FOT290', 'FOT290', 'admin', true, 10000000, now(), now()),
        ('21d9cd5c-318c-4172-ba56-7ad08de6ae61', 'niveshx@gmail.com', 'NiveshX Admin', 'OCX39Z', 'OCX39Z', 'admin', true, 10000000, now(), now())
      ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        client_id = COALESCE(profiles.client_id, EXCLUDED.client_id),
        referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code);

      CREATE TABLE IF NOT EXISTS watchlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        tab TEXT NOT NULL,
        symbol TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, tab, symbol)
      );
      CREATE INDEX IF NOT EXISTS watchlists_user_tab_idx ON watchlists(user_id, tab);
      CREATE TABLE IF NOT EXISTS payment_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_holder TEXT NOT NULL DEFAULT '',
        bank_name TEXT NOT NULL DEFAULT '',
        account_no TEXT NOT NULL DEFAULT '',
        ifsc TEXT NOT NULL DEFAULT '',
        upi_id TEXT NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        amount NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `).catch(() => {});
  }

  return pool;
}

export async function queryWithTimeout(
  db: Pool,
  query: string | { name?: string; text: string; values?: any[] },
  params: any[] = [],
  timeoutMs: number = 2500
): Promise<any> {
  const queryPromise = typeof query === 'string' ? db.query(query, params) : db.query(query);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Admin DB query timeout (${timeoutMs}ms)`)), timeoutMs)
  );
  return Promise.race([queryPromise, timeoutPromise]);
}
