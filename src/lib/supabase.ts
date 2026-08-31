import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { isDevBypassMode } from './devBypass';
import { mockSupabaseClient } from './mockSupabase';

const supabaseUrl = 'https://omcbwbhtjrozbgvzqdya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY2J3Ymh0anJvemJndnpxZHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTYwMDAsImV4cCI6MjA2OTk3MjAwMH0.n60lDzNIU7kJILSxx5H20gZRQ6yteyxEkkj0aM6jRiU';

// ── Export the real or mock client based on dev-bypass mode ──
// In dev-bypass (admin proxy), use the mock client that reads/writes localStorage.
// In production, use the real Supabase client.
// This means ALL hooks use the same code — no `if (isDevBypassUser())` branches needed.
const realClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const supabase = isDevBypassMode()
  ? (mockSupabaseClient as any)
  : realClient;

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
