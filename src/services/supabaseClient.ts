import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

// ═══════════════════════════════════════════════════════════════════════════════
// Supabase Client Initialization
// ═══════════════════════════════════════════════════════════════════════════════
//
// The JS SDK expects the PROJECT ROOT URL (e.g. https://<ref>.supabase.co).
// It appends its own paths (/auth/v1/, /rest/v1/, /realtime/v1/, etc.).
//
// A common misconfiguration is pasting the REST endpoint URL that includes
// /rest/v1/ — this causes auth calls to hit non-existent URLs and returns
// "No API key found in request". We strip that suffix defensively.
// ═══════════════════════════════════════════════════════════════════════════════

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// ── Strip common misconfiguration suffixes from the URL ─────────────────────
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

// ── Diagnostic logs — will show in Metro / Console ──────────────────────────
console.log('🔑 [Supabase Init] RAW URL:', rawUrl);
console.log('🔑 [Supabase Init] CLEANED URL:', supabaseUrl);
console.log('🔑 [Supabase Init] KEY EXISTS?:', !!rawKey);
console.log('🔑 [Supabase Init] KEY PREFIX:', rawKey ? rawKey.substring(0, 20) + '...' : 'MISSING');

if (!rawUrl || !rawKey) {
  console.error(
    '🛑 [Supabase] FATAL: Missing environment variables.\n' +
    '  Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
    '  are set in your .env file and restart the dev server with: npx expo start -c'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  rawKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export function getOAuthRedirectUrl(): string {
  return Linking.createURL('/auth/callback');
}