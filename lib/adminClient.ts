/**
 * Standalone Direct PostgreSQL + Supabase Fallback client for admin_UI2.
 * Connects directly to Railway PostgreSQL with zero external dependencies when Railway DB is configured.
 */

import { getRailwayPool, isRailwayDbConfigured } from './db/pool';
import { createClient } from '@supabase/supabase-js';

export type SupabaseClient = any;

export class RailwayQueryBuilder {
  private table: string;
  private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectCols: string = '*';
  private whereClauses: string[] = [];
  private params: any[] = [];
  private mutationValues: any = null;
  private onConflictCols: string[] = ['id'];
  private orderClause: string = '';
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private isSingle: boolean = false;
  private isCount: boolean = false;
  private isHead: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.selectCols = cols || '*';
    if (opts?.count) this.isCount = true;
    if (opts?.head) this.isHead = true;
    return this;
  }

  insert(values: any | any[]) {
    this.mode = 'insert';
    this.mutationValues = values;
    return this;
  }

  update(values: any) {
    this.mode = 'update';
    this.mutationValues = values;
    return this;
  }

  delete() {
    this.mode = 'delete';
    this.mutationValues = null;
    return this;
  }

  upsert(values: any | any[], opts?: { onConflict?: string }) {
    this.mode = 'upsert';
    this.mutationValues = values;
    if (opts?.onConflict) {
      this.onConflictCols = opts.onConflict.split(',').map((c) => c.trim());
    }
    return this;
  }

  eq(col: string, val: any) {
    if (val === null || val === undefined) {
      this.whereClauses.push(`"${col}" IS NULL`);
    } else {
      this.params.push(val);
      this.whereClauses.push(`"${col}" = $${this.params.length}`);
    }
    return this;
  }

  neq(col: string, val: any) {
    if (val === null || val === undefined) {
      this.whereClauses.push(`"${col}" IS NOT NULL`);
    } else {
      this.params.push(val);
      this.whereClauses.push(`"${col}" != $${this.params.length}`);
    }
    return this;
  }

  gt(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" > $${this.params.length}`);
    return this;
  }

  gte(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" >= $${this.params.length}`);
    return this;
  }

  lt(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" < $${this.params.length}`);
    return this;
  }

  lte(col: string, val: any) {
    this.params.push(val);
    this.whereClauses.push(`"${col}" <= $${this.params.length}`);
    return this;
  }

  in(col: string, vals: any[]) {
    if (!vals || vals.length === 0) {
      this.whereClauses.push('1 = 0');
      return this;
    }
    const idxs = vals.map((v) => {
      this.params.push(v);
      return `$${this.params.length}`;
    });
    this.whereClauses.push(`"${col}" IN (${idxs.join(',')})`);
    return this;
  }

  not(col: string, op: string, val: any) {
    if (op === 'is' && (val === null || val === undefined)) {
      this.whereClauses.push(`"${col}" IS NOT NULL`);
    } else if (op === 'in' && Array.isArray(val)) {
      if (val.length === 0) return this;
      const idxs = val.map((v) => {
        this.params.push(v);
        return `$${this.params.length}`;
      });
      this.whereClauses.push(`"${col}" NOT IN (${idxs.join(',')})`);
    } else if (op === 'eq') {
      this.params.push(val);
      this.whereClauses.push(`"${col}" != $${this.params.length}`);
    } else if (op === 'ilike') {
      this.params.push(val);
      this.whereClauses.push(`"${col}" NOT ILIKE $${this.params.length}`);
    }
    return this;
  }

  is(col: string, val: any) {
    if (val === null || val === undefined) {
      this.whereClauses.push(`"${col}" IS NULL`);
    } else {
      this.params.push(val);
      this.whereClauses.push(`"${col}" = $${this.params.length}`);
    }
    return this;
  }

  or(filterStr: string) {
    const parts = filterStr.split(',').map((p) => p.trim());
    const orClauses: string[] = [];
    for (const part of parts) {
      const match = part.match(/^([a-zA-Z0-9_]+)\.(ilike|like|eq)\.(.*)$/);
      if (match) {
        const [, col, op, rawVal] = match;
        this.params.push(rawVal);
        const placeholder = `$${this.params.length}`;
        if (op === 'ilike') orClauses.push(`"${col}" ILIKE ${placeholder}`);
        else if (op === 'like') orClauses.push(`"${col}" LIKE ${placeholder}`);
        else orClauses.push(`"${col}" = ${placeholder}`);
      }
    }
    if (orClauses.length > 0) {
      this.whereClauses.push(`(${orClauses.join(' OR ')})`);
    }
    return this;
  }

  ilike(col: string, pattern: string) {
    this.params.push(pattern);
    this.whereClauses.push(`"${col}" ILIKE $${this.params.length}`);
    return this;
  }

  like(col: string, pattern: string) {
    this.params.push(pattern);
    this.whereClauses.push(`"${col}" LIKE $${this.params.length}`);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? 'DESC' : 'ASC';
    this.orderClause = `ORDER BY "${col}" ${dir}`;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = Math.max(0, from);
    this.limitCount = Math.max(1, to - from + 1);
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  async execute(): Promise<{ data: any; count?: number | null; error: any }> {
    const pool = getRailwayPool();
    if (!pool) {
      return { data: this.isSingle ? null : [], count: 0, error: new Error('Database pool unavailable') };
    }

    try {
      // 1. UPDATE
      if (this.mode === 'update') {
        const keys = Object.keys(this.mutationValues || {});
        if (keys.length === 0) return { data: null, error: null };

        const setClauses: string[] = [];
        const params: any[] = [];
        for (const k of keys) {
          params.push(this.mutationValues[k]);
          setClauses.push(`"${k}" = $${params.length}`);
        }

        const whereSql = this.whereClauses.map((clause) => {
          return clause.replace(/\$(\d+)/g, (_, num) => `$${Number(num) + params.length}`);
        });
        const combinedParams = [...params, ...this.params];

        let sql = `UPDATE "${this.table}" SET ${setClauses.join(', ')}`;
        if (whereSql.length > 0) sql += ` WHERE ${whereSql.join(' AND ')}`;
        sql += ` RETURNING *`;

        const res = await pool.query(sql, combinedParams);
        return { data: this.isSingle ? res.rows[0] || null : res.rows, error: null };
      }

      // 2. INSERT / UPSERT
      if (this.mode === 'insert' || this.mode === 'upsert') {
        const raw = Array.isArray(this.mutationValues) ? this.mutationValues : [this.mutationValues];
        if (raw.length === 0) return { data: [], error: null };

        const keys = Object.keys(raw[0]);
        const colsSql = keys.map((k) => `"${k}"`).join(', ');
        const rowPlaceholders: string[] = [];
        const params: any[] = [];

        for (const row of raw) {
          const phs = keys.map((k) => {
            params.push(row[k]);
            return `$${params.length}`;
          });
          rowPlaceholders.push(`(${phs.join(', ')})`);
        }

        let sql = `INSERT INTO "${this.table}" (${colsSql}) VALUES ${rowPlaceholders.join(', ')}`;

        if (this.mode === 'upsert') {
          const conflictSql = this.onConflictCols.map((c) => `"${c}"`).join(', ');
          const updateSets = keys
            .filter((k) => !this.onConflictCols.includes(k))
            .map((k) => `"${k}" = EXCLUDED."${k}"`);
          if (updateSets.length > 0) {
            sql += ` ON CONFLICT (${conflictSql}) DO UPDATE SET ${updateSets.join(', ')}`;
          } else {
            sql += ` ON CONFLICT (${conflictSql}) DO NOTHING`;
          }
        }

        sql += ` RETURNING *`;
        const res = await pool.query(sql, params);
        return { data: this.isSingle ? res.rows[0] || null : res.rows, error: null };
      }

      // 3. DELETE
      if (this.mode === 'delete') {
        let sql = `DELETE FROM "${this.table}"`;
        if (this.whereClauses.length > 0) {
          sql += ` WHERE ${this.whereClauses.join(' AND ')}`;
        }
        sql += ` RETURNING *`;
        const res = await pool.query(sql, this.params);
        return { data: this.isSingle ? res.rows[0] || null : res.rows, error: null };
      }

      // 4. SELECT
      let totalCount: number | null = null;

      if (this.isCount) {
        let countSql = `SELECT count(*) as count FROM "${this.table}"`;
        if (this.whereClauses.length > 0) {
          countSql += ` WHERE ${this.whereClauses.join(' AND ')}`;
        }
        const countRes = await pool.query(countSql, this.params);
        totalCount = parseInt(countRes.rows[0]?.count || '0', 10);

        if (this.isHead) {
          return { data: null, count: totalCount, error: null };
        }
      }

      const rawCols = this.selectCols.trim();
      let colsSql = '*';
      if (rawCols && rawCols !== '*') {
        colsSql = rawCols
          .split(',')
          .map((c) => {
            const trimmed = c.trim();
            if (trimmed === '*' || trimmed.includes('(') || trimmed.includes(' ')) return trimmed;
            return `"${trimmed}"`;
          })
          .join(', ');
      }
      let sql = `SELECT ${colsSql} FROM "${this.table}"`;

      if (this.whereClauses.length > 0) {
        sql += ` WHERE ${this.whereClauses.join(' AND ')}`;
      }

      if (this.orderClause) {
        sql += ` ${this.orderClause}`;
      }

      if (this.limitCount !== null) {
        sql += ` LIMIT ${this.limitCount}`;
      }

      if (this.offsetCount !== null) {
        sql += ` OFFSET ${this.offsetCount}`;
      }

      const res = await pool.query(sql, this.params);

      if (this.isSingle) {
        return { data: res.rows[0] || null, error: null };
      }

      return {
        data: res.rows,
        count: totalCount !== null ? totalCount : res.rows.length,
        error: null,
      };
    } catch (err: any) {
      if (err?.code === '42P01') {
        return { data: this.isSingle ? null : [], count: 0, error: null };
      }
      console.warn(`[adminClient-DirectPostgres] Query error on "${this.table}":`, err?.message || err);
      return { data: this.isSingle ? null : [], error: err };
    }
  }

  then(resolve: any, reject?: any) {
    return this.execute().then(resolve, reject);
  }
}

export function parseJwtLocally(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    if (!payload || !payload.sub) return null;

    return {
      id: payload.sub,
      email: payload.email || '',
      user_metadata: payload.user_metadata || {},
      app_metadata: payload.app_metadata || {},
      role: payload.role || payload.user_metadata?.role || 'authenticated',
      aud: payload.aud || 'authenticated',
      created_at: new Date(payload.iat ? payload.iat * 1000 : Date.now()).toISOString(),
    };
  } catch {
    return null;
  }
}

let _cachedClient: any = null;

export function getAdminClient(): any {
  if (_cachedClient) return _cachedClient;

  // 1. If Railway PostgreSQL is configured, return the native PostgreSQL client
  if (isRailwayDbConfigured()) {
    _cachedClient = {
      from: (table: string) => new RailwayQueryBuilder(table),
      rpc: async (funcName: string, args?: any) => {
        const pool = getRailwayPool();
        if (!pool) return { data: null, error: new Error('DB pool not available') };
        try {
          const argKeys = args ? Object.keys(args) : [];
          const placeholders = argKeys.map((_, i) => `$${i + 1}`).join(', ');
          const values = argKeys.map((k) => args[k]);
          const res = await pool.query(`SELECT * FROM "${funcName}"(${placeholders})`, values);
          return { data: res.rows, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      auth: {
        getUser: async (token?: string) => {
          if (!token) return { data: null, error: new Error('Missing token') };
          const u = parseJwtLocally(token);
          if (u) return { data: { user: u }, error: null };

          const pool = getRailwayPool();
          if (pool) {
            try {
              const res = await pool.query('SELECT id, email, role, full_name FROM profiles WHERE id = $1 LIMIT 1', [token]);
              if (res.rows[0]) {
                const row = res.rows[0];
                return { data: { user: { id: row.id, email: row.email, role: row.role } }, error: null };
              }
            } catch {}
          }
          return { data: null, error: new Error('User not found') };
        },
        admin: {
          createUser: async ({ email, user_metadata }: any) => {
            const pool = getRailwayPool();
            if (!pool) return { data: null, error: new Error('Database pool unavailable') };
            try {
              const crypto = require('crypto');
              const newId = crypto.randomUUID();
              const res = await pool.query(
                `INSERT INTO profiles (id, email, full_name, phone, role, active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, true, now(), now())
                 RETURNING id, email, role, full_name`,
                [newId, email, user_metadata?.full_name || '', user_metadata?.phone || '', user_metadata?.role || 'user']
              );
              return { data: { user: res.rows[0] }, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
          updateUserById: async (id: string, updates: any) => {
            const pool = getRailwayPool();
            if (!pool) return { data: null, error: new Error('Database pool unavailable') };
            try {
              if (updates.password) {
                await pool.query(`UPDATE profiles SET updated_at = now() WHERE id = $1`, [id]);
              }
              return { data: { id }, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
        },
      },
    };
    return _cachedClient;
  }

  // 2. Fallback: Supabase Client if Railway PostgreSQL is not configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cpcvklekwwawgtgbyrmp.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

  _cachedClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _cachedClient;
}

export async function getUserFromRequest(request: Request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7).trim();
  if (!token || token === 'null' || token === 'undefined') return null;

  // Try decoding locally first
  const localUser = parseJwtLocally(token);
  if (localUser) return localUser;

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data?.user) return data.user;
  } catch {}

  return null;
}
