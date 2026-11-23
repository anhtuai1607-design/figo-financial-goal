import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type Row = Record<string, unknown>;
type TableStore = Record<string, Row[]>;
type MockUserRecord = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  createdAt: string;
};
type MockSession = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
    created_at: string;
  };
};

const USERS_KEY = "figo_mock_users";
const TABLES_KEY = "figo_mock_tables";
const SESSION_KEY = "figo_mock_session";

const memoryStorage = new Map<string, string>();
const authListeners = new Set<(event: string, session: MockSession | null) => void>();

function readStore<T>(storage: "local" | "session", key: string, fallback: T): T {
  try {
    const raw =
      typeof window !== "undefined"
        ? (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key)
        : (memoryStorage.get(key) ?? null);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(storage: "local" | "session", key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  try {
    if (typeof window !== "undefined") {
      if (value === null)
        (storage === "local" ? window.localStorage : window.sessionStorage).removeItem(key);
      else (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, raw);
    } else {
      if (value === null) memoryStorage.delete(key);
      else memoryStorage.set(key, raw);
    }
  } catch {
    // ignore storage quota errors
  }
}

function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeMockJwt(token: string): { sub?: string; email?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof Buffer !== "undefined" ? Buffer.from(padded, "base64").toString("utf8") : atob(padded);
    return JSON.parse(json) as { sub?: string; email?: string };
  } catch {
    return null;
  }
}

function makeMockJwt(id: string, email: string): string {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify({ sub: id, email, role: "authenticated" }));
  return `${header}.${payload}.mock-signature`;
}

function makeSession(userRec: MockUserRecord): MockSession {
  return {
    access_token: makeMockJwt(userRec.id, userRec.email),
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "mock-refresh-token",
    user: {
      id: userRec.id,
      email: userRec.email,
      user_metadata: { display_name: userRec.displayName },
      created_at: userRec.createdAt,
    },
  };
}

function notifyAuth(event: string, session: MockSession | null) {
  for (const cb of authListeners) {
    try {
      cb(event, session);
    } catch {
      // ignore listener errors
    }
  }
}

function createQueryBuilder(table: string) {
  let op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  let payload: Row | Row[] | null = null;
  let onConflictCols: string[] | null = null;
  let singleMode: "none" | "single" | "maybeSingle" = "none";
  let maxRows: number | null = null;
  const filters: ((r: Row) => boolean)[] = [];

  const execute = async (): Promise<{ data: unknown; error: { message: string } | null }> => {
    const tables = readStore<TableStore>("local", TABLES_KEY, {});
    const rows = tables[table] ?? [];

    if (op === "select") {
      let matched = rows.filter((r) => filters.every((f) => f(r)));
      if (maxRows !== null) matched = matched.slice(0, maxRows);
      if (singleMode === "maybeSingle") return { data: matched[0] ?? null, error: null };
      if (singleMode === "single") {
        if (!matched[0]) return { data: null, error: { message: "Row not found" } };
        return { data: matched[0], error: null };
      }
      return { data: matched, error: null };
    }

    if (op === "insert") {
      const items = Array.isArray(payload) ? payload : payload ? [payload] : [];
      const next = [...rows, ...items];
      tables[table] = next;
      writeStore("local", TABLES_KEY, tables);
      return { data: singleMode !== "none" ? (items[0] ?? null) : items, error: null };
    }

    if (op === "upsert") {
      const items = Array.isArray(payload) ? payload : payload ? [payload] : [];
      const conflictKeys = onConflictCols ?? (table === "user_data" ? ["user_id"] : ["id"]);
      const next = [...rows];
      for (const item of items) {
        const idx = next.findIndex((r) =>
          conflictKeys.every((k) => r[k] !== undefined && r[k] === item[k]),
        );
        if (idx >= 0) next[idx] = { ...next[idx], ...item };
        else next.push(item);
      }
      tables[table] = next;
      writeStore("local", TABLES_KEY, tables);
      return { data: singleMode !== "none" ? (items[0] ?? null) : items, error: null };
    }

    if (op === "update") {
      const patch = (Array.isArray(payload) ? payload[0] : payload) ?? {};
      const updated: Row[] = [];
      const next = rows.map((r) => {
        if (filters.every((f) => f(r))) {
          const merged = { ...r, ...patch };
          updated.push(merged);
          return merged;
        }
        return r;
      });
      tables[table] = next;
      writeStore("local", TABLES_KEY, tables);
      return { data: singleMode !== "none" ? (updated[0] ?? null) : updated, error: null };
    }

    if (op === "delete") {
      const next = rows.filter((r) => !filters.every((f) => f(r)));
      tables[table] = next;
      writeStore("local", TABLES_KEY, tables);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  };

  const builder = {
    select(_cols?: string) {
      if (op === "select") op = "select";
      return builder;
    },
    insert(values: Row | Row[]) {
      op = "insert";
      payload = values;
      return builder;
    },
    upsert(values: Row | Row[], opts?: { onConflict?: string }) {
      op = "upsert";
      payload = values;
      onConflictCols = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : null;
      return builder;
    },
    update(values: Row) {
      op = "update";
      payload = values;
      return builder;
    },
    delete() {
      op = "delete";
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push((r) => r[col] === val);
      return builder;
    },
    in(col: string, vals: unknown[]) {
      const set = new Set(vals);
      filters.push((r) => set.has(r[col]));
      return builder;
    },
    limit(n: number) {
      maxRows = n;
      return builder;
    },
    maybeSingle() {
      singleMode = "maybeSingle";
      return execute();
    },
    single() {
      singleMode = "single";
      return execute();
    },
    then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
      onfulfilled?:
        | ((value: {
            data: unknown;
            error: { message: string } | null;
          }) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return execute().then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  };

  return builder;
}

export function createMockSupabaseClient(): SupabaseClient<Database> {
  const client = {
    auth: {
      async getSession() {
        const session = readStore<MockSession | null>("session", SESSION_KEY, null);
        return { data: { session }, error: null };
      },
      async getUser() {
        const session = readStore<MockSession | null>("session", SESSION_KEY, null);
        return { data: { user: session?.user ?? null }, error: null };
      },
      onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
        authListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(callback);
              },
            },
          },
        };
      },
      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: { display_name?: string } };
      }) {
        const normEmail = email.trim().toLowerCase();
        const users = readStore<MockUserRecord[]>("local", USERS_KEY, []);
        if (users.some((u) => u.email === normEmail)) {
          return {
            data: { user: null, session: null },
            error: { message: "User already registered" },
          };
        }
        const now = new Date().toISOString();
        const displayName = options?.data?.display_name?.trim() || normEmail.split("@")[0] || "Bạn";
        const newUser: MockUserRecord = {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `mock-${Date.now()}`,
          email: normEmail,
          password,
          displayName,
          createdAt: now,
        };
        writeStore("local", USERS_KEY, [...users, newUser]);

        const tables = readStore<TableStore>("local", TABLES_KEY, {});
        const profiles = tables["profiles"] ?? [];
        profiles.push({
          id: newUser.id,
          display_name: displayName,
          phone: null,
          birth_year: null,
          email_reminders: true,
          created_at: now,
          updated_at: now,
        });
        tables["profiles"] = profiles;
        writeStore("local", TABLES_KEY, tables);

        const session = makeSession(newUser);
        writeStore("session", SESSION_KEY, session);
        notifyAuth("SIGNED_IN", session);
        return { data: { user: session.user, session }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const normEmail = email.trim().toLowerCase();
        const users = readStore<MockUserRecord[]>("local", USERS_KEY, []);
        const found = users.find((u) => u.email === normEmail && u.password === password);
        if (!found) {
          return {
            data: { user: null, session: null },
            error: { message: "Invalid login credentials" },
          };
        }
        const session = makeSession(found);
        writeStore("session", SESSION_KEY, session);
        notifyAuth("SIGNED_IN", session);
        return { data: { user: session.user, session }, error: null };
      },
      async signInWithOAuth() {
        return {
          data: { provider: "google", url: null },
          error: { message: "Unsupported provider: OAuth not configured in local mode" },
        };
      },
      async signOut() {
        writeStore("session", SESSION_KEY, null);
        notifyAuth("SIGNED_OUT", null);
        return { error: null };
      },
      async updateUser({ password }: { password?: string }) {
        const session = readStore<MockSession | null>("session", SESSION_KEY, null);
        if (!session) return { data: { user: null }, error: { message: "Not authenticated" } };
        if (password) {
          const users = readStore<MockUserRecord[]>("local", USERS_KEY, []);
          writeStore(
            "local",
            USERS_KEY,
            users.map((u) => (u.id === session.user.id ? { ...u, password } : u)),
          );
        }
        return { data: { user: session.user }, error: null };
      },
      admin: {
        async getUserById(uid: string) {
          const users = readStore<MockUserRecord[]>("local", USERS_KEY, []);
          const found = users.find((u) => u.id === uid);
          return {
            data: { user: found ? { id: found.id, email: found.email } : null },
            error: null,
          };
        },
      },
    },
    from(table: string) {
      return createQueryBuilder(table);
    },
  };

  return client as unknown as SupabaseClient<Database>;
}
