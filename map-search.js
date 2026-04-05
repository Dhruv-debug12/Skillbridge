/**
 * SkillBridge — Map Search Page JS
 * Loads jobs from Supabase, renders them in the side panel, handles filtering.
 */
import { auth } from './auth.js';
import { db, supabase } from './supabase.js';

// ── State ────────────────────────────────────────────────────
let allJobs = [];
let filteredJobs = [];
let activeChip = '';
let keyword = '';
let activeJobId = null;

// ── Map iframe URLs ─────────────────────────────────────────
const MAP_URLS = {
  map: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4855.587941270407!2d72.75787120523606!3d19.7995042414549!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be71f2237db99d7%3A0xcf48f0b9f3e335d4!2sBlugent%20Residency!5e1!3m2!1sen!2sin!4v1775367235582!5m2!1sen!2sin`,
  satellite: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4855.587941270407!2d72.75787120523606!3d19.7995042414549!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be71f2237db99d7%3A0xcf48f0b9f3e335d4!2sBlugent%20Residency!5e1!3m2!1sen!2sin!4v1775367235582!5m2!1sen!2sin`,
};

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Auth nav
  const user = await auth.getSession();
  updateNav(user);

  // Load jobs
  await loadJobs();

  // Wire events
  wireFilters();
  wirePanel();
  wireDrawer();
  wireViewToggle();
});

// ── Load Jobs from Supabase ──────────────────────────────────
async function loadJobs() {
  try {
    allJobs = await db.searchJobs({});
    filteredJobs = [...allJobs];
    renderJobList();
  } catch (err) {
    console.error('Map: failed to load jobs', err);
    document.getElementById('map-jobs-list').innerHTML = `
      <div class="map-empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>Could not load jobs. Please try again later.</p>
      </div>`;
  }
}

// ── Render Job Cards ─────────────────────────────────────────
function renderJobList() {
  const container = document.getElementById('map-jobs-list');
  const countEl = document.getElementById('map-results-count');
  if (countEl) countEl.textContent = `${filteredJobs.length} found`;

  if (filteredJobs.length === 0) {
    container.innerHTML = `
      <div class="map-empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <p>No jobs match your search.</p>
        <p style="font-size:var(--text-xs);margin-top:0.5rem;">Try a different keyword or trade.</p>
      </div>`;
    return;
  }

  container.innerHTML = filteredJobs.map(job => `
    <div class="map-job-card${job.id === activeJobId ? ' map-job-card--active' : ''}" data-id="${job.id}">
      <div class="map-job-card-header">
        <div class="map-job-title">${esc(job.title)}</div>
        ${job.is_urgent ? '<span class="map-job-urgent">Urgent</span>' : ''}
      </div>
      <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:0.5rem;">
        🏢 ${esc(job.employer_profiles?.company_name || 'Local Employer')}
      </div>
      <div class="map-job-meta">
        <span class="map-job-badge">${esc(job.trade_category)}</span>
        <span class="map-job-location">📍 ${esc(job.location)}</span>
        <span class="map-job-pay">$${job.pay_amount} / ${job.pay_type}</span>
      </div>
    </div>
  `).join('');

  // Click events
  container.querySelectorAll('.map-job-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      activeJobId = id;
      const job = allJobs.find(j => j.id === id);
      if (job) openDrawer(job);
      // Highlight card
      container.querySelectorAll('.map-job-card').forEach(c => c.classList.remove('map-job-card--active'));
      card.classList.add('map-job-card--active');
    });
  });
}

// ── Filtering ─────────────────────────────────────────────────
function applyFilters() {
  filteredJobs = allJobs.filter(job => {
    const kw = keyword.trim().toLowerCase();
    const matchKw = !kw ||
      job.title?.toLowerCase().includes(kw) ||
      job.location?.toLowerCase().includes(kw) ||
      job.trade_category?.toLowerCase().includes(kw) ||
      job.description?.toLowerCase().includes(kw);
    const matchTrade = !activeChip || job.trade_category === activeChip;
    return matchKw && matchTrade;
  });
  renderJobList();
}

function wireFilters() {
  // Keyword
  const kwInput = document.getElementById('map-keyword');
  if (kwInput) {
    kwInput.addEventListener('input', () => {
      keyword = kwInput.value;
      applyFilters();
    });
  }

  // Trade chips
  document.getElementById('trade-chips')?.addEventListener('click', e => {
    const btn = e.target.closest('.map-chip');
    if (!btn) return;
    document.querySelectorAll('.map-chip').forEach(c => c.classList.remove('map-chip--active'));
    btn.classList.add('map-chip--active');
    activeChip = btn.dataset.trade;
    applyFilters();
  });
}

// ── Collapsible Panel (mobile) ────────────────────────────────
function wirePanel() {
  const panel = document.getElementById('map-panel');
  const toggle = document.getElementById('panel-toggle');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    const svg = toggle.querySelector('svg polyline');
    if (svg) svg.setAttribute('points', panel.classList.contains('collapsed') ? '9 18 15 12 9 6' : '15 18 9 12 15 6');
  });
}

// ── Drawer (job detail) ──────────────────────────────────────
function wireDrawer() {
  const overlay = document.getElementById('job-drawer-overlay');
  const closeBtn = document.getElementById('job-drawer-close');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeDrawer(); });
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
}

function openDrawer(job) {
  const overlay = document.getElementById('job-drawer-overlay');
  const content = document.getElementById('drawer-content');
  if (!overlay || !content) return;

  content.innerHTML = `
    <div class="drawer-body">
      <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;margin-bottom:1.5rem;">
        <span class="badge ${job.trade_category === 'Electrician' ? 'badge-accent' : 'badge-success'}">${esc(job.trade_category)}</span>
        ${job.is_urgent ? '<span class="badge badge-accent">🔥 Urgent</span>' : ''}
        <span class="text-xs text-muted">${timeAgo(job.created_at)}</span>
      </div>
      <h2>${esc(job.title)}</h2>
      <div class="drawer-meta">
        <div>🏢 <strong>${esc(job.employer_profiles?.company_name || 'Local Employer')}</strong></div>
        <div>📍 ${esc(job.location)}</div>
        <div class="font-mono text-accent" style="font-weight:700;">$${job.pay_amount} / ${job.pay_type}</div>
      </div>
      <div class="drawer-section">
        <h3>About this Role</h3>
        <p>${esc(job.description || 'No description provided.')}</p>
      </div>
      ${job.skills_required ? `
      <div class="drawer-section">
        <h3>Skills Required</h3>
        <p>${esc(job.skills_required)}</p>
      </div>` : ''}
      <div style="margin-top:2rem;display:flex;gap:1rem;flex-wrap:wrap;">
        <a href="job-board.html" class="btn btn-primary">Apply Now</a>
        <button class="btn btn-outline" onclick="closeDrawer()">Close</button>
      </div>
    </div>`;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const overlay = document.getElementById('job-drawer-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
  activeJobId = null;
  document.querySelectorAll('.map-job-card').forEach(c => c.classList.remove('map-job-card--active'));
}

// Make closeDrawer available globally (used in button onclick)
window.closeDrawer = closeDrawer;

// ── Map View Toggle ──────────────────────────────────────────
function wireViewToggle() {
  const btnMap = document.getElementById('btn-map-view');
  const btnSat = document.getElementById('btn-satellite-view');
  const iframe = document.getElementById('google-map-iframe');
  if (!btnMap || !btnSat || !iframe) return;

  btnMap.addEventListener('click', () => {
    btnMap.classList.add('map-view-btn--active');
    btnSat.classList.remove('map-view-btn--active');
    iframe.src = MAP_URLS.map;
  });

  btnSat.addEventListener('click', () => {
    btnSat.classList.add('map-view-btn--active');
    btnMap.classList.remove('map-view-btn--active');
    iframe.src = MAP_URLS.satellite;
  });
}

// ── Detect My Location ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('detect-location-btn');
  const locationText = document.getElementById('map-location-text');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    btn.textContent = 'Detecting…';
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await resp.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Your Location';
          const state = data.address?.state || '';
          if (locationText) locationText.textContent = `${city}, ${state}`;
        } catch {
          if (locationText) locationText.textContent = 'Your Location';
        }

        // Update map iframe to detected location
        const iframe = document.getElementById('google-map-iframe');
        if (iframe) {
          iframe.src = `https://www.google.com/maps/embed/v1/view?key=AIzaSyD-dummy&center=${latitude},${longitude}&zoom=14`;
          // Fallback to regular Google Maps URL without API key
          iframe.src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`;
        }

        btn.textContent = 'Detected';
        btn.disabled = false;
      },
      () => {
        alert('Could not detect your location. Please allow location access.');
        btn.textContent = 'Detect';
        btn.disabled = false;
      }
    );
  });
});

// ── Nav Auth State ────────────────────────────────────────────
async function updateNav(user) {
  const container = document.getElementById('nav-actions');
  if (!container) return;
  if (user) {
    try {
      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
      if (profile) {
        const dash = profile.role === 'employer' ? 'employer-dashboard.html' : 'worker-dashboard.html';
        const name = profile.full_name || (profile.role === 'employer' ? 'Employer' : 'Worker');
        container.innerHTML = `
          <span class="text-sm" style="font-weight:600;margin-right:1rem;">Hi, ${name}</span>
          <a href="${dash}" class="btn btn-outline" style="margin-right:0.5rem;">Dashboard</a>
          <button id="logout-btn" class="btn btn-text">Logout</button>`;
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
          const { auth: a } = await import('./auth.js');
          a.logout();
        });
      }
    } catch (e) {
      console.warn('Nav update failed', e.message);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
