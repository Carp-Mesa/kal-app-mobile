import { supabase, getOAuthRedirectUrl } from './supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: any;
}

export const authService = {
  // ── Email/Password Login via Supabase Auth ────────────────────────────────
  login: async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.session) throw new Error('No session returned from Supabase');

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    };
  },

  // ── Email/Password Register via Supabase Auth ─────────────────────────────
  register: async (email: string, password: string): Promise<AuthResult | null> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Supabase may return null session if email confirmation is required
    if (!data.session) {
      return null;
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    };
  },

  // ── Silent Token Refresh via Supabase Auth ────────────────────────────────
  refreshSession: async (refresh_token: string): Promise<{ access_token: string; refresh_token: string }> => {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) throw error;
    if (!data.session) throw new Error('No session returned from refresh');

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  },

  // ── OAuth Login (Google / Facebook) ──────────────────────────────────────
  loginWithOAuth: async (provider: 'google' | 'facebook'): Promise<AuthResult> => {
    const redirectUrl = getOAuthRedirectUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: redirectUrl,
      },
    });

    if (error) throw error;

    // data.url contains the Supabase OAuth URL to open in the browser
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'cancel') {
      throw new Error('OAuth_CANCELLED');
    }

    if (result.type !== 'success' || !result.url) {
      throw new Error('OAuth_FAILED');
    }

    // Parse tokens from the callback URL
    return authService.handleOAuthCallback(result.url);
  },

  // ── Parse OAuth callback URL for tokens ───────────────────────────────────
  handleOAuthCallback: (url: string): AuthResult => {
    // Callback URLs come as: gainsstation://auth/callback#access_token=...&refresh_token=...
    // or with query params depending on the flow
    const parsedUrl = new URL(url);

    // Try hash fragment first (implicit flow)
    let hash = parsedUrl.hash;
    if (hash.startsWith('#')) hash = hash.substring(1);

    const hashParams = new URLSearchParams(hash);
    let accessToken = hashParams.get('access_token');
    let refreshToken = hashParams.get('refresh_token');

    // Fallback to query params
    if (!accessToken) accessToken = parsedUrl.searchParams.get('access_token');
    if (!refreshToken) refreshToken = parsedUrl.searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      throw new Error('OAuth_CALLBACK_MISSING_TOKENS');
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: null,
    };
  },
};