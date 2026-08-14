import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.length > 0;

const missingSupabaseConfigMessage =
  'Supabase is disabled because VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.';

function disabledSupabaseError() {
  return new Error(missingSupabaseConfigMessage);
}

function createDisabledSupabaseClient(): SupabaseClient {
  console.warn(missingSupabaseConfigMessage);

  return {
    auth: {
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: disabledSupabaseError(),
      }),
      signInWithOAuth: async () => ({
        data: { provider: null, url: null },
        error: disabledSupabaseError(),
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: disabledSupabaseError(),
      }),
      resetPasswordForEmail: async () => ({
        data: null,
        error: disabledSupabaseError(),
      }),
      updateUser: async () => ({
        data: { user: null },
        error: disabledSupabaseError(),
      }),
      resend: async () => ({
        data: { user: null, session: null },
        error: disabledSupabaseError(),
      }),
      getUser: async () => ({
        data: { user: null },
        error: null,
      }),
      getSession: async () => ({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signOut: async () => ({
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : createDisabledSupabaseClient();
