/**
 * SkillBridge — Authentication & Session Management
 * Uses real Supabase Auth with metadata-driven profile creation
 */
import { supabase } from './supabase.js';

export const auth = {

  /** Get current session user or null */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) { console.error('getSession error:', error.message); return null; }
    return session?.user || null;
  },

  /** Listen to auth state changes */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user || null);
    });
  },

  /** Sign in with email + password */
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  /**
   * Sign up + create profiles via the DB trigger (handle_new_user)
   * We pass all profile data in raw_user_meta_data so the trigger can insert
   * the base profiles row automatically.
   */
  async signup(email, password, profileData) {
    const { role, full_name, company_name, location, phone, trade, experience_years } = profileData;

    // 1. Create auth user with metadata — the DB trigger creates the base profile row
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: full_name || company_name || '',
          location: location || '',
          phone:    phone || '',
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from Supabase Auth signup');

    const userId = authData.user.id;

    // 2. Wait briefly for the trigger to fire, then cascade role-specific profiles
    await new Promise(r => setTimeout(r, 800));

    try {
      if (role === 'worker') {
        const { error: wpErr } = await supabase.from('worker_profiles').insert({
          user_id: userId,
          trade: trade || 'General Labor',
          experience_years: parseInt(experience_years, 10) || 0,
          is_available: true,
        });
        if (wpErr && wpErr.code !== '23505') throw wpErr; // ignore duplicate
      } else if (role === 'employer') {
        const { error: epErr } = await supabase.from('employer_profiles').insert({
          user_id: userId,
          company_name: company_name || '',
          industry: profileData.industry || '',
        });
        if (epErr && epErr.code !== '23505') throw epErr;
      }
    } catch (dbError) {
      console.warn('Role profile creation failed (non-critical):', dbError.message);
    }

    return authData;
  },

  /** Sign out and go to homepage */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = 'index.html';
  },

  /** Redirect to auth if not signed in */
  async requireAuth() {
    const user = await this.getSession();
    if (!user) {
      window.location.href = 'auth.html';
      return null;
    }
    return user;
  },

  /**
   * Guard a route by role.
   * If no role provided, only checks authentication.
   * Returns { user, profile } or null (and redirects) if unauthorized.
   */
  async requireAuthWithRole(requiredRole) {
    const user = await this.requireAuth();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, full_name, location, email')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // Profile may not exist yet if trigger is slow — try again once
      await new Promise(r => setTimeout(r, 1000));
      const retry = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
      if (retry.error || !retry.data) {
        console.error('Profile fetch failed:', error?.message);
        window.location.href = 'auth.html';
        return null;
      }
      return { user, profile: retry.data };
    }

    if (requiredRole && profile.role !== requiredRole) {
      window.location.href = profile.role === 'worker' ? 'worker-dashboard.html' : 'employer-dashboard.html';
      return null;
    }

    return { user, profile };
  }
};
