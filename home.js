/**
 * SkillBridge — Home Page
 * Loads real jobs from Supabase, updates nav, runs scroll animations
 */
import { auth } from './auth.js';
import { db, supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = await auth.getSession();
  updateNav(currentUser);

  // Scroll-triggered fade-up animations
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px', threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  loadCategoryCounts();
  loadRecentJobs(observer);
});

async function loadCategoryCounts() {
  try {
    const jobs = await db.searchJobs({});
    const counts = {};
    jobs.forEach(j => {
      counts[j.trade_category] = (counts[j.trade_category] || 0) + 1;
    });

    const mappings = {
      'Electrician': 'count-electrician',
      'Plumber': 'count-plumber',
      'Carpenter': 'count-carpenter',
      'Mason': 'count-mason',
      'Painter': 'count-painter',
      'Driver': 'count-driver',
      'Welder': 'count-welder',
      'Domestic Helper': 'count-domestic-helper'
    };

    for (const [trade, domId] of Object.entries(mappings)) {
      const el = document.getElementById(domId);
      if (el) {
        const count = counts[trade] || 0;
        el.textContent = `${count} jobs available`;
      }
    }
  } catch (err) {
    console.error('Failed to load category counts', err);
  }
}

async function loadRecentJobs(observer) {
  const grid = document.getElementById('recent-jobs-grid');
  if (!grid) return;

  // Show skeletons
  grid.innerHTML = `
    <div class="skeleton" style="height:180px;border-radius:var(--radius-base);"></div>
    <div class="skeleton" style="height:180px;border-radius:var(--radius-base);"></div>
    <div class="skeleton" style="height:180px;border-radius:var(--radius-base);"></div>
  `;

  try {
    const jobs = await db.searchJobs({});
    const recent = jobs.slice(0, 6);

    if (recent.length === 0) {
      grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;">No jobs posted yet.</p>`;
      return;
    }

    grid.innerHTML = recent.map((job, idx) => `
      <a href="job-board.html" class="card card-hover fade-up" style="transition-delay:${idx * 0.07}s; text-decoration:none; display:block;">
        <div class="flex-between mb-1" style="align-items:center;">
          <span class="badge ${getTradeBadgeClass(job.trade_category)}">${job.trade_category}</span>
          <span class="text-xs text-muted">${timeAgo(job.created_at)}</span>
        </div>
        <h3 class="text-lg mb-1">${job.title}</h3>
        <p class="text-sm text-muted mb-2">🏢 ${job.employer_profiles?.company_name || 'Local Employer'}</p>
        <div class="flex-between" style="align-items:center; border-top:1px solid var(--color-border); padding-top:1rem;">
          <div class="text-sm">📍 ${job.location}</div>
          <div class="text-sm font-mono text-accent" style="font-weight:700;">
            $${job.pay_amount} / ${job.pay_type}
            ${job.is_urgent ? ' <span class="badge badge-accent" style="font-size:0.65rem;padding:0.1rem 0.4rem;">URGENT</span>' : ''}
          </div>
        </div>
      </a>
    `).join('');

    // Observe animated cards
    grid.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  } catch (err) {
    console.error('Failed to load jobs:', err);
    grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;">Could not load jobs. Please try again later.</p>`;
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 14) return '1w ago';
  return `${Math.floor(days / 7)}w ago`;
}

function getTradeBadgeClass(trade) {
  const map = {
    'Electrician': 'badge-accent',
    'Plumber': 'badge-success',
    'Carpenter': 'badge-accent',
    'Welder': 'badge-success',
    'Mason': 'badge-success',
    'Painter': '',
    'Driver': '',
    'Domestic Helper': ''
  };
  return map[trade] || '';
}

async function updateNav(user) {
  const container = document.getElementById('nav-actions');
  if (!container) return;

  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        const isEmployer = profile.role === 'employer';
        const dashboardLink = isEmployer ? 'employer-dashboard.html' : 'worker-dashboard.html';
        const name = profile.full_name || (isEmployer ? 'Employer' : 'Worker');

        container.innerHTML = `
          <span class="text-sm" style="font-weight:600;margin-right:1rem;">Hi, ${name}</span>
          <a href="${dashboardLink}" class="btn btn-outline" style="margin-right:0.5rem;">Dashboard</a>
          <button id="logout-btn" class="btn btn-text">Logout</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', async () => {
          const { auth: authMod } = await import('./auth.js');
          authMod.logout();
        });
      }
    } catch (e) {
      console.warn('Nav profile fetch failed:', e.message);
    }
  }
}
