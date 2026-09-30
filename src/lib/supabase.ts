import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { isDevBypassMode } from './devBypass';
import { mockSupabaseClient } from './mockSupabase';

const supabaseUrl = 'https://omcbwbhtjrozbgvzqdya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY2J3Ymh0anJvemJndnpxZHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTYwMDAsImV4cCI6MjA2OTk3MjAwMH0.n60lDzNIU7kJILSxx5H20gZRQ6yteyxEkkj0aM6jRiU';
// Public by design (ships in the JS bundle; RLS + JWT do the protecting).
export const SUPABASE_ANON_KEY = supabaseAnonKey;

// Exported for the parent allowlist guide (shows families which domains to
// allow on a child's restricted phone). No behavior change.

// ── Export the real or mock client based on dev-bypass mode ──
// In dev-bypass (admin proxy), use the mock client that reads/writes localStorage.
// In production, use the real Supabase client.
// This means ALL hooks use the same code — no `if (isDevBypassUser())` branches needed.
export const SUPABASE_URL = supabaseUrl;
const realClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const supabase = isDevBypassMode()
  ? (mockSupabaseClient as any)
  : realClient;

/**
 * Remove cached Supabase auth tokens from this browser.
 *
 * Used ONLY as a last resort when session reads time out: a stale token
 * (expired, or for a DB-wiped test user) can make getSession() attempt a
 * refresh that pends indefinitely. Callers retry fresh immediately after.
 * NEVER call this on boot unconditionally — opening a stale magic link with
 * a valid stored session would nuke the good session (regression seen
 * 2026-09-30: valid users parked at onboarding step 1).
 */
export function purgeStaleStoredSession(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        console.log("[FB-DEBUG] Dropping stale stored session.");
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn("[FB-DEBUG] Token purge skipped:", e);
  }
}

/**
 * Safe wrapper for Supabase queries.
 * Prevents uncaught exceptions or network drops from white-screening the UI.
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  fallbackValue: T | null = null
): Promise<{ data: T | null; error: any }> {
  try {
    const response = await queryFn();
    if (response.error) {
      console.warn("⚠️ SafeSupabaseQuery caught database error:", response.error);
      return { data: fallbackValue, error: response.error };
    }
    return response;
  } catch (err) {
    console.error("🚨 SafeSupabaseQuery caught unexpected runtime exception:", err);
    return { data: fallbackValue, error: err };
  }
}
