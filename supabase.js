/**
 * SkillBridge — Real Supabase Client
 * Project: Local Job Finder (lntpxqepkwfpoioartus)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lntpxqepkwfpoioartus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudHB4cWVwa3dmcG9pb2FydHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEyNTcsImV4cCI6MjA5MDg3NzI1N30.cDA9B2kqs_XnpzZiwdPNX41kGsc9F1X-nKH5JdNAcE4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * ==========================================
 * DATABASE HELPERS — Real Supabase Queries
 * ==========================================
 */
export const db = {

  // ─────────────────────────────────────────
  // PROFILES
  // ─────────────────────────────────────────

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─────────────────────────────────────────
  // WORKER PROFILES
  // ─────────────────────────────────────────

  async getWorkerProfile(userId) {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select('*, profiles(full_name, location, email, phone, bio, avatar_url)')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async upsertWorkerProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('worker_profiles')
      .upsert({ user_id: userId, ...profileData }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async searchWorkers(filters = {}) {
    let query = supabase
      .from('worker_profiles')
      .select('*, profiles(full_name, location, email, phone, bio, avatar_url)')
      .order('created_at', { ascending: false });

    if (filters.trade) {
      query = query.eq('trade', filters.trade);
    }
    if (filters.is_available) {
      query = query.eq('is_available', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Client-side location filter (case-insensitive partial match)
    if (filters.location && filters.location.trim()) {
      const loc = filters.location.toLowerCase().trim();
      return data.filter(w =>
        w.profiles?.location?.toLowerCase().includes(loc) ||
        w.profiles?.full_name?.toLowerCase().includes(loc)
      );
    }

    return data;
  },

  // ─────────────────────────────────────────
  // EMPLOYER PROFILES
  // ─────────────────────────────────────────

  async getEmployerProfile(userId) {
    const { data, error } = await supabase
      .from('employer_profiles')
      .select('*, profiles(full_name, location, email, phone)')
      .eq('user_id', userId)
      .single();
    if (error) {
      // No employer profile yet — return blank shell
      if (error.code === 'PGRST116') return { user_id: userId, company_name: '', industry: '' };
      throw error;
    }
    return data;
  },

  async upsertEmployerProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('employer_profiles')
      .upsert({ user_id: userId, ...profileData }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─────────────────────────────────────────
  // JOBS
  // ─────────────────────────────────────────

  async createJob(jobData) {
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateJob(jobId, updates) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteJob(jobId) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);
    if (error) throw error;
  },

  async searchJobs(filters = {}) {
    let query = supabase
      .from('jobs')
      .select('*, profiles!employer_id(employer_profiles(company_name))')
      .eq('status', 'active')
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.trade_category && filters.trade_category !== '') {
      query = query.eq('trade_category', filters.trade_category);
    }
    if (filters.pay_type && filters.pay_type !== '') {
      query = query.eq('pay_type', filters.pay_type);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fix schema nesting for frontend
    const mappedData = data.map(job => ({
      ...job,
      employer_profiles: {
        company_name: job.profiles?.employer_profiles?.[0]?.company_name || null
      }
    }));

    // Client-side location/keyword search
    if (filters.location && filters.location.trim()) {
      const search = filters.location.toLowerCase().trim();
      return mappedData.filter(j =>
        j.location?.toLowerCase().includes(search) ||
        j.title?.toLowerCase().includes(search) ||
        j.trade_category?.toLowerCase().includes(search) ||
        j.description?.toLowerCase().includes(search)
      );
    }
    return mappedData;
  },

  async getJobById(jobId) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, employer_profiles(company_name, industry, website)')
      .eq('id', jobId)
      .single();
    if (error) throw error;
    return data;
  },

  async getEmployerJobs(employerId) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, applications(count)')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ─────────────────────────────────────────
  // APPLICATIONS
  // ─────────────────────────────────────────

  async applyForJob(applicationData) {
    const { data, error } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getWorkerApplications(workerId) {
    const { data, error } = await supabase
      .from('applications')
      .select('*, jobs(title, location, trade_category, pay_amount, pay_type, is_urgent, employer_profiles(company_name))')
      .eq('worker_id', workerId)
      .order('applied_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getJobApplications(jobId) {
    const { data, error } = await supabase
      .from('applications')
      .select('*, profiles(full_name, location, email, phone, worker_profiles(trade, experience_years, hourly_rate, skills))')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });
    if (error) throw error;
    
    // Maps relation output to what the frontend table expects
    return data.map(app => {
      const wp = app.profiles?.worker_profiles?.[0] || {};
      return {
        ...app,
        worker_profiles: {
          trade: wp.trade,
          experience_years: wp.experience_years,
          hourly_rate: wp.hourly_rate,
          skills: wp.skills,
          profiles: {
            full_name: app.profiles?.full_name,
            location: app.profiles?.location,
            email: app.profiles?.email,
            phone: app.profiles?.phone
          }
        }
      };
    });
  },

  async updateApplicationStatus(applicationId, status) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async checkAlreadyApplied(jobId, workerId) {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('worker_id', workerId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  // ─────────────────────────────────────────
  // STATS (for home page)
  // ─────────────────────────────────────────

  async getStats() {
    const [workersRes, employersRes, jobsRes] = await Promise.all([
      supabase.from('worker_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('employer_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    return {
      workers: workersRes.count || 0,
      employers: employersRes.count || 0,
      activeJobs: jobsRes.count || 0,
    };
  },

  // ─────────────────────────────────────────
  // AVATAR / STORAGE
  // ─────────────────────────────────────────

  /**
   * Upload a profile photo to Supabase Storage.
   * File is stored at: avatars/{userId}/avatar.{ext}
   * Returns the public URL of the uploaded image.
   */
  async uploadAvatar(userId, file) {
    const ext      = file.name.split('.').pop().toLowerCase();
    const filePath = `${userId}/avatar.${ext}`;

    // Upsert (replace if already exists)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    // Persist the URL to the profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) throw updateError;

    return publicUrl;
  },

  /**
   * Get the public avatar URL for a user (cache-busted).
   */
  getAvatarUrl(userId, ext = 'jpg') {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(`${userId}/avatar.${ext}`);
    return data?.publicUrl || null;
  },
};
