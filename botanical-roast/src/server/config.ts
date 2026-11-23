import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export interface ServerConfig {
  port: number;
  appUrl: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseServiceRoleKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  adminEmail: string | null;
  sessionSecret: string;
}

const fallbackSessionSecret = crypto.randomBytes(32).toString('hex');

export function loadServerConfig(): ServerConfig {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || null;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim() || null;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || null;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  const appUrl = process.env.APP_URL?.trim() || 'http://localhost:3000';
  const sessionSecret = process.env.SESSION_SECRET?.trim() || fallbackSessionSecret;

  return {
    port: Number(process.env.PORT) || 3000,
    appUrl,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    stripeSecretKey,
    stripeWebhookSecret,
    adminEmail,
    sessionSecret,
  };
}

export const serverConfig = loadServerConfig();

export const supabaseAdmin: SupabaseClient | null =
  serverConfig.supabaseUrl && serverConfig.supabaseServiceRoleKey
    ? createClient(serverConfig.supabaseUrl, serverConfig.supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export const supabasePublic: SupabaseClient | null =
  serverConfig.supabaseUrl && serverConfig.supabaseAnonKey
    ? createClient(serverConfig.supabaseUrl, serverConfig.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

export const stripeClient: Stripe | null = serverConfig.stripeSecretKey
  ? new Stripe(serverConfig.stripeSecretKey)
  : null;
