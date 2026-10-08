/**
 * Server-only Supabase client. Never import this from a 'use client'
 * component - SUPABASE_SECRET_KEY grants full read/write access,
 * bypassing row-level security, and must never reach the browser
 * bundle.
 *
 * Uses the Supabase JS client over HTTPS (PostgREST) rather than a raw
 * `pg` connection pool for anything request-serving: Vercel serverless
 * functions are short-lived and can spin up many concurrent instances,
 * and a pooled Postgres client per instance risks exhausting Supabase's
 * connection limit under load. `pg` is used exactly once in this project
 * - scripts/apply-db-migration.js, a local/CI-run DDL migration, never
 * imported by the running app.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** null when not configured - callers must handle that, never assume a client exists. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isDbConfigured()) return null;
  if (cachedClient) return cachedClient;
  // isDbConfigured() just confirmed both variables are non-empty strings.
  cachedClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SECRET_KEY as string, {
    auth: { persistSession: false }, // Server-only service client - no browser session to persist.
  });
  return cachedClient;
}

