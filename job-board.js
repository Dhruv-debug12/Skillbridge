/**
 * SkillBridge — Job Board
 * Fetches live jobs from Supabase with filter + detail drawer + apply
 */
import { db, supabase } from './supabase.js';
import { auth } from './auth.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await auth.getSession();
  updateNav(currentUser);

  // Handle URL filters
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  if (categoryParam) {
    const selectEl = document.querySelector('select[name="trade_category"]');
    if (selectEl) selectEl.value = categoryParam;
  }

  loadJobs();

  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    loadJobs();
  });

  document.getElementById('job-drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('job-drawer-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'job-drawer-overlay') closeDrawer();
  });

  // ESC key closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
});

async function updateNav(user) {
  const container = document.getElementById('nav-actions');
  if (!container) return;
  if (user) {
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
        <span class="text-sm" style="font-weight:600;margin-right:1rem;" id="user-display-name">Hi, ${name}</span>
        <a href="${dashboardLink}" class="btn btn-outline" style="margin-right:0.5rem;">Dashboard</a>
        <button id="logout-btn" class="btn btn-text">Logout</button>
      `;
      document.getElementById('logout-btn').addEventListener('click', () => auth.logout());
    }
  }
}

async function loadJobs() {
  const list     = document.getElementById('jobs-list');
  const countEl  = document.getElementById('results-count');
  const form     = document.getElementById('filter-form');
  const formData = new FormData(form);

  const filters = {
    trade_category: formData.get('trade_category') || '',
    pay_type:       formData.get('pay_type') || '',
    location:       formData.get('search') || '',
  };

  // Skeletons
  list.innerHTML = `
    <div class="skeleton" style="height:200px;width:100%;border-radius:var(--radius-base);"></div>
    <div class="skeleton" style="height:200px;width:100%;border-radius:var(--radius-base);"></div>
    <div class="skeleton" style="height:200px;width:100%;border-radius:var(--radius-base);"></div>
  `;

  try {
    const jobs = await db.searchJobs(filters);
    countEl.textContent = jobs.length;

    if (jobs.length === 0) {
      list.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:4rem 1rem;">
          <div style="font-size:2.5rem;margin-bottom:1rem;">🔍</div>
          <p class="text-muted">No jobs found matching your criteria. Try adjusting your filters.</p>
        </div>`;
      return;
    }

    list.innerHTML = jobs.map(job => `
      <div class="card card-hover" style="cursor:pointer;" onclick="openJobDetails('${job.id}')">
        <div class="flex-between mb-1" style="align-items:center;">
          <span class="badge ${getTradeBadgeClass(job.trade_category)}">${job.trade_category}</span>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            ${job.is_urgent ? `<span class="badge badge-accent" style="font-size:0.7rem;">URGENT</span>` : ''}
            <span class="text-xs text-muted">${timeAgo(job.created_at)}</span>
          </div>
        </div>
        <h3 class="text-lg mb-1">${job.title}</h3>
        <p class="text-sm text-muted mb-2">🏢 ${job.employer_profiles?.company_name || 'Local Employer'}</p>
        <div class="flex-between" style="align-items:center;border-top:1px solid var(--color-border);padding-top:1rem;">
          <div class="text-sm">📍 ${job.location}</div>
          <div class="text-sm font-mono text-accent" style="font-weight:700;">$${job.pay_amount} / ${job.pay_type}</div>
        </div>
      </div>
    `).join('');

    window.jobsCache = jobs;

  } catch (err) {
    console.error('loadJobs error:', err);
    list.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;">
        <p style="color:var(--color-accent);">Failed to load jobs. Please check your connection.</p>
      </div>`;
  }
}

window.openJobDetails = function(jobId) {
  const job = window.jobsCache?.find(j => j.id === jobId);
  if (!job) return;

  const content = document.getElementById('drawer-content');
  content.innerHTML = `
    <div class="drawer-body">
      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">
        <span class="badge ${getTradeBadgeClass(job.trade_category)}">${job.trade_category}</span>
        ${job.is_urgent ? `<span class="badge badge-accent">🔥 Urgent Hire</span>` : ''}
      </div>
      <h2>${job.title}</h2>
      <p class="text-muted mb-2">🏢 ${job.employer_profiles?.company_name || 'Local Employer'} &nbsp;·&nbsp; 📍 ${job.location}</p>

      <div class="drawer-meta">
        <div><strong>Pay:</strong> <span class="text-accent font-mono" style="font-weight:700;">$${job.pay_amount} / ${job.pay_type}</span></div>
        <div><strong>Status:</strong> <span class="badge badge-success">${job.status}</span></div>
        <div><strong>Posted:</strong> ${new Date(job.created_at).toLocaleDateString()}</div>
      </div>

      <div class="drawer-section">
        <h3>About the Role</h3>
        <p>${job.description || 'No description provided.'}</p>
      </div>

      <div class="drawer-section">
        <h3>Requirements</h3>
        <p>${job.requirements || 'No specific requirements listed.'}</p>
      </div>

      <div id="apply-section" style="margin-top:2rem;">
        <button class="btn btn-primary" style="width:100%;font-size:1rem;" onclick="applyToJob('${job.id}')">
          Apply Now
        </button>
        <p class="text-xs text-muted" style="text-align:center;margin-top:0.75rem;">
          You must be logged in as a Worker to apply.
        </p>
      </div>
    </div>
  `;

  document.getElementById('job-drawer-overlay').classList.add('active');
};

window.closeDrawer = function() {
  document.getElementById('job-drawer-overlay').classList.remove('active');
};

window.applyToJob = async function(jobId) {
  if (!currentUser) {
    alert('Please sign in as a Worker to apply for jobs.');
    window.location.href = `auth.html?role=worker`;
    return;
  }

  const applySection = document.getElementById('apply-section');

  try {
    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || profile.role !== 'worker') {
      alert('Only workers can apply for jobs. Please sign in as a Worker.');
      return;
    }

    // Check already applied
    const alreadyApplied = await db.checkAlreadyApplied(jobId, currentUser.id);
    if (alreadyApplied) {
      applySection.innerHTML = `
        <div class="badge badge-success" style="width:100%;text-align:center;padding:1rem;font-size:1rem;">
          ✅ Already Applied
        </div>`;
      return;
    }

    // Disable button during request
    if (applySection) {
      applySection.innerHTML = `<button class="btn btn-primary" style="width:100%;" disabled>Submitting...</button>`;
    }

    await db.applyForJob({
      job_id:   jobId,
      worker_id: currentUser.id,
      status:   'pending',
    });

    applySection.innerHTML = `
      <div style="text-align:center;padding:1.5rem;">
        <div style="font-size:2.5rem;margin-bottom:0.75rem;">🎉</div>
        <h3 style="font-family:var(--font-display);margin-bottom:0.5rem;">Application Submitted!</h3>
        <p class="text-muted text-sm">The employer will review your profile and be in touch.</p>
        <button class="btn btn-outline" style="margin-top:1rem;width:100%;" onclick="closeDrawer()">Close</button>
      </div>`;

  } catch (err) {
    console.error('Apply error:', err);
    applySection.innerHTML = `
      <div style="color:var(--color-accent);text-align:center;padding:1rem;">
        <p>Could not submit application: ${err.message}</p>
        <button class="btn btn-outline" style="margin-top:1rem;" onclick="applyToJob('${jobId}')">Retry</button>
      </div>`;
  }
};

function getTradeBadgeClass(trade) {
  return { Electrician: 'badge-accent', Plumber: 'badge-success', Carpenter: 'badge-accent', Welder: 'badge-success', Mason: 'badge-success' }[trade] || '';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
