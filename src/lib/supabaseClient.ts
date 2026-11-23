import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export function getSupabaseBrowserClient(
  url: string | null,
  anonKey: string | null,
): SupabaseClient | null {
  const effectiveUrl = url || import.meta.env.VITE_SUPABASE_URL || '';
  const effectiveKey = anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!effectiveUrl || !effectiveKey) {
    return null;
  }

  const cacheSignature = `${effectiveUrl}::${effectiveKey}`;
  if (cachedClient && cachedKey === cacheSignature) {
    return cachedClient;
  }

  cachedClient = createClient(effectiveUrl, effectiveKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  cachedKey = cacheSignature;
  return cachedClient;
}
