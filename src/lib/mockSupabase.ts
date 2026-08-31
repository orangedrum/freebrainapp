/**
 * mockSupabase — A localStorage-backed mock Supabase client.
 *
 * When admin uses "Dev: switch role", we swap the real Supabase client
 * with this mock. It implements the same chained query API so all hooks
 * run identical code regardless of mode — no `if (isDevBypassUser())` branches.
 *
 * Supported chain: .from(table).select(cols).eq/.in/.gte/.neq/.not/.order/.limit/.maybeSingle/.single
 *                 .from(table).insert(row)
 *                 .from(table).update(data).eq(...)
 *                 .from(table).upsert(data, opts)
 *                 .from(table).delete().eq(...)
 *                 .from(table).select("*", { count: "exact", head: true })
 *
 * Data is stored in localStorage under `dev_table_<tableName>` as JSON arrays.
 */

// ── localStorage helpers ──

function readTable(table: string): any[] {
  const key = `dev_table_${table}`;
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeTable(table: string, rows: any[]): void {
  localStorage.setItem(`dev_table_${table}`, JSON.stringify(rows));
}

function genId(): string {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Query builder ──

interface Filter {
  column: string;
  op: "eq" | "in" | "gte" | "gt" | "lte" | "lt" | "neq" | "not" | "is";
  value: any;
}

class MockQueryBuilder {
  private table: string;
  private columns: string | null = null;
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private countMode: "exact" | null = null;
  private headOnly = false;
  private insertData: any = null;
  private updateData: any = null;
  private isDelete = false;
  private upsertData: any = null;
  private upsertOnConflict: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string, opts?: { count?: "exact"; head?: boolean }) {
    this.columns = columns || "*";
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headOnly = true;
    return this;
  }

  insert(row: any) {
    this.insertData = row;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  upsert(data: any, opts?: { onConflict?: string }) {
    this.upsertData = data;
    this.upsertOnConflict = opts?.onConflict || null;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(col: string, val: any) { this.filters.push({ column: col, op: "eq", value: val }); return this; }
  neq(col: string, val: any) { this.filters.push({ column: col, op: "neq", value: val }); return this; }
  in(col: string, vals: any[]) { this.filters.push({ column: col, op: "in", value: vals }); return this; }
  gte(col: string, val: any) { this.filters.push({ column: col, op: "gte", value: val }); return this; }
  gt(col: string, val: any) { this.filters.push({ column: col, op: "gt", value: val }); return this; }
  lte(col: string, val: any) { this.filters.push({ column: col, op: "lte", value: val }); return this; }
  lt(col: string, val: any) { this.filters.push({ column: col, op: "lt", value: val }); return this; }
  is(col: string, val: any) { this.filters.push({ column: col, op: "is", value: val }); return this; }
  not(col: string, op: string, val: any) {
    // .not("total_score", "is", null) → filter where total_score IS NOT null
    this.filters.push({ column: col, op: "not" as any, value: val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }

  // ── Resolve: apply filters to a row ──
  private matches(row: any): boolean {
    for (const f of this.filters) {
      const val = row[f.column];
      switch (f.op) {
        case "eq":
          if (val !== f.value) return false;
          break;
        case "neq":
          if (val === f.value) return false;
          break;
        case "in":
          if (!Array.isArray(f.value) || !f.value.includes(val)) return false;
          break;
        case "gte":
          if (val == null || val < f.value) return false;
          break;
        case "gt":
          if (val == null || val <= f.value) return false;
          break;
        case "lte":
          if (val == null || val > f.value) return false;
          break;
        case "lt":
          if (val == null || val >= f.value) return false;
          break;
        case "is":
          if (f.value === null) {
            if (val !== null && val !== undefined) return false;
          } else {
            if (val !== f.value) return false;
          }
          break;
        case "not":
          // .not(col, "is", null) → col IS NOT null
          if (f.value === null || f.value === undefined) {
            if (val === null || val === undefined) return false;
          }
          break;
      }
    }
    return true;
  }

  // ── Project: select only requested columns ──
  private project(rows: any[]): any[] {
    if (!this.columns || this.columns === "*") return rows;
    // Handle simple comma-separated columns (no joins for now)
    const cols = this.columns.split(",").map((c) => c.trim());
    // Check for join syntax like "team_id, teams(*)"
    const hasJoin = cols.some((c) => c.includes("("));
    if (hasJoin) {
      // For joins, just return all columns — mock doesn't support real joins
      return rows;
    }
    return rows.map((row) => {
      const out: any = {};
      cols.forEach((c) => {
        if (c in row) out[c] = row[c];
      });
      return out;
    });
  }

  // ── Execute ──
  async then(resolve: any, reject: any) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      resolve({ data: null, error: err });
    }
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    let rows = readTable(this.table);

    // ── INSERT ──
    if (this.insertData) {
      const toInsert = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const newRows = toInsert.map((r) => ({
        id: r.id || genId(),
        created_at: r.created_at || new Date().toISOString(),
        ...r,
      }));
      rows = [...rows, ...newRows];
      writeTable(this.table, rows);
      return { data: newRows, error: null };
    }

    // ── Apply filters ──
    let filtered = rows.filter((r) => this.matches(r));

    // ── UPDATE ──
    if (this.updateData) {
      filtered = filtered.map((r) => ({ ...r, ...this.updateData }));
      // Write back: replace matching rows in the full table
      const updatedIds = new Set(filtered.map((r) => r.id));
      rows = rows.map((r) => (updatedIds.has(r.id) ? { ...r, ...this.updateData } : r));
      writeTable(this.table, rows);
      return { data: filtered, error: null };
    }

    // ── UPSERT ──
    if (this.upsertData) {
      const data = Array.isArray(this.upsertData) ? this.upsertData : [this.upsertData];
      const conflictCol = this.upsertOnConflict || "id";
      for (const d of data) {
        const existingIdx = rows.findIndex((r) => r[conflictCol] === d[conflictCol]);
        if (existingIdx >= 0) {
          rows[existingIdx] = { ...rows[existingIdx], ...d };
        } else {
          rows.push({ id: d.id || genId(), created_at: d.created_at || new Date().toISOString(), ...d });
        }
      }
      writeTable(this.table, rows);
      return { data, error: null };
    }

    // ── DELETE ──
    if (this.isDelete) {
      const deleteIds = new Set(filtered.map((r) => r.id));
      const remaining = rows.filter((r) => !deleteIds.has(r.id));
      writeTable(this.table, remaining);
      return { data: filtered, error: null };
    }

    // ── SELECT ──
    // Order
    if (this.orderCol) {
      filtered.sort((a, b) => {
        const av = a[this.orderCol as any];
        const bv = b[this.orderCol as any];
        if (av == null && bv == null) return 0;
        if (av == null) return this.orderAsc ? -1 : 1;
        if (bv == null) return this.orderAsc ? 1 : -1;
        if (av < bv) return this.orderAsc ? -1 : 1;
        if (av > bv) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    // Limit
    if (this.limitN != null) {
      filtered = filtered.slice(0, this.limitN);
    }

    // Project
    const projected = this.project(filtered);

    // Count mode
    if (this.countMode === "exact" && this.headOnly) {
      return { data: null, error: null, count: filtered.length };
    }

    return { data: projected, error: null };
  }

  // ── Terminal methods that return a promise ──
  maybeSingle(): Promise<{ data: any; error: any }> {
    return this.execute().then((res) => ({
      data: res.data && Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : (res.data && !Array.isArray(res.data) ? res.data : null),
      error: res.error,
    }));
  }

  single(): Promise<{ data: any; error: any }> {
    return this.execute().then((res) => ({
      data: res.data && Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : (res.data && !Array.isArray(res.data) ? res.data : null),
      error: res.error,
    }));
  }
}

// ── Mock auth (no-op) ──
const mockAuth = {
  signInWithOtp: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => ({ error: null }),
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
};

// ── Mock client ──
export const mockSupabaseClient = {
  from(table: string) {
    return new MockQueryBuilder(table);
  },
  auth: mockAuth,
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
  removeChannel: () => {},
};
