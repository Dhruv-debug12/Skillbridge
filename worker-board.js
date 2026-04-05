/**
 * SkillBridge — Worker Board
 * Browse workers from Supabase with filter, contact drawer, and email
 */
import { db, supabase } from './supabase.js';
import { auth } from './auth.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await auth.getSession();
  updateNav(currentUser);

  loadWorkers();

  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    loadWorkers();
  });

  document.getElementById('job-drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('job-drawer-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'job-drawer-overlay') closeDrawer();
  });

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

async function loadWorkers() {
  const list      = document.getElementById('workers-list');
  const countEl   = document.getElementById('results-count');
  const form      = document.getElementById('filter-form');
  const formData  = new FormData(form);

  const filters = {
    trade:    formData.get('trade') || '',
    location: formData.get('search') || '',
  };

  // Show skeletons
  list.innerHTML = `
    <div class="skeleton" style="height:200px;border-radius:var(--radius-base);"></div>
    <div class="skeleton" style="height:200px;border-radius:var(--radius-base);"></div>
    <div class="skeleton" style="height:200px;border-radius:var(--radius-base);"></div>
  `;

  try {
    const workers = await db.searchWorkers(filters);
    countEl.textContent = workers.length;

    if (workers.length === 0) {
      list.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem 1rem;">
          <div style="font-size:2.5rem;margin-bottom:1rem;">🔍</div>
          <p class="text-muted">No workers found matching your criteria. Try adjusting your filters.</p>
        </div>`;
      return;
    }

    list.innerHTML = workers.map(worker => `
      <div class="card card-hover" style="cursor:pointer;" onclick="openWorkerDetails('${worker.user_id}')">
        <div class="flex-between mb-2" style="align-items:center;">
          <span class="badge ${getTradeBadgeClass(worker.trade)}">${worker.trade}</span>
          ${worker.is_available
            ? `<span class="badge badge-success" style="font-size:0.7rem;">● Available</span>`
            : `<span class="badge" style="font-size:0.7rem;opacity:0.7;">Busy</span>`}
        </div>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
          <div class="avatar" style="width:44px;height:44px;font-size:1rem;flex-shrink:0;">
            ${getInitials(worker.profiles?.full_name)}
          </div>
          <div>
            <h3 class="text-lg" style="margin-bottom:0.1rem;">${worker.profiles?.full_name || 'Anonymous'}</h3>
            <p class="text-sm text-muted">📍 ${worker.profiles?.location || 'Unknown Location'}</p>
          </div>
        </div>
        <div class="flex-between" style="align-items:center;border-top:1px solid var(--color-border);padding-top:1rem;">
          <div class="text-sm text-muted">⏱️ ${worker.experience_years} yrs exp</div>
          ${worker.hourly_rate
            ? `<div class="text-sm font-mono text-accent" style="font-weight:700;">$${worker.hourly_rate}/hr</div>`
            : `<div class="text-sm text-muted">Rate negotiable</div>`}
        </div>
      </div>
    `).join('');

    window.workersCache = workers;

  } catch (err) {
    console.error('loadWorkers error:', err);
    list.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;">
        <p style="color:var(--color-accent);">Failed to load workers. Please check your connection.</p>
      </div>`;
  }
}

window.openWorkerDetails = function(userId) {
  const worker = window.workersCache?.find(w => w.user_id === userId);
  if (!worker) return;
  window.activeWorker = worker;

  const name = worker.profiles?.full_name || 'Anonymous Worker';
  const skills = Array.isArray(worker.skills) ? worker.skills : [];

  const content = document.getElementById('drawer-content');
  content.innerHTML = `
    <div class="drawer-body">
      <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.5rem;">
        <div class="avatar" style="width:64px;height:64px;font-size:1.5rem;flex-shrink:0;">${getInitials(name)}</div>
        <div>
          <h2 style="margin-bottom:0.25rem;">${name}</h2>
          <p class="text-muted">📍 ${worker.profiles?.location || 'Unknown'}</p>
        </div>
      </div>

      <div class="drawer-meta">
        <div><strong>Trade:</strong> <span class="badge ${getTradeBadgeClass(worker.trade)}">${worker.trade}</span></div>
        <div><strong>Experience:</strong> <span class="text-accent font-mono" style="font-weight:700;">${worker.experience_years} years</span></div>
        <div><strong>Status:</strong> ${worker.is_available
          ? `<span class="badge badge-success">Available Now</span>`
          : `<span class="badge">Busy</span>`}</div>
        ${worker.hourly_rate ? `<div><strong>Rate:</strong> <span class="font-mono text-accent" style="font-weight:600;">$${worker.hourly_rate}/hr</span></div>` : ''}
      </div>

      ${worker.bio || worker.profiles?.bio ? `
        <div class="drawer-section">
          <h3>About</h3>
          <p>${worker.bio || worker.profiles?.bio}</p>
        </div>` : ''}

      ${skills.length > 0 ? `
        <div class="drawer-section">
          <h3>Skills</h3>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem;">
            ${skills.map(s => `<span class="trade-chip">${s}</span>`).join('')}
          </div>
        </div>` : ''}

      <!-- Action buttons -->
      <div id="drawer-actions" style="margin-top:2rem;display:flex;flex-direction:column;gap:0.75rem;">
        <button class="btn btn-primary" style="width:100%;" onclick="showContactForm()">
          ✉️ Contact Worker
        </button>
        <a href="worker-profile.html?id=${worker.user_id}" class="btn btn-outline" style="width:100%;text-align:center;text-decoration:none;">
          👤 View Full Profile
        </a>
      </div>

      <!-- Contact Form (hidden by default) -->
      <div id="contact-form-section" style="display:none;margin-top:2rem;">
        <hr style="border-color:var(--color-border);margin-bottom:1.5rem;">
        <h3 style="font-size:var(--text-lg);margin-bottom:1rem;font-family:var(--font-display);">Send a Message</h3>
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
          <div>
            <label class="form-label" style="font-size:var(--text-sm);font-weight:600;display:block;margin-bottom:0.3rem;">Your Name</label>
            <input type="text" id="contact-sender-name" class="form-input" placeholder="e.g. Alex Johnson" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label class="form-label" style="font-size:var(--text-sm);font-weight:600;display:block;margin-bottom:0.3rem;">Your Email</label>
            <input type="email" id="contact-sender-email" class="form-input" placeholder="you@example.com" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label class="form-label" style="font-size:var(--text-sm);font-weight:600;display:block;margin-bottom:0.3rem;">Message</label>
            <textarea id="contact-message" class="form-textarea" rows="5"
              style="width:100%;box-sizing:border-box;resize:vertical;"
              placeholder="Describe the job, location, pay, and availability needed...">Hi ${name},

I found your profile on SkillBridge and I'm interested in hiring you for a ${worker.trade} job.

Please let me know your availability and rate.

Thank you!</textarea>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
            <button class="btn btn-primary" style="flex:1;" onclick="submitContactForm('${worker.user_id}')">Send Message</button>
            <button class="btn btn-outline" style="flex:1;" onclick="hideContactForm()">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('job-drawer-overlay').classList.add('active');
};

window.closeDrawer = function() {
  document.getElementById('job-drawer-overlay').classList.remove('active');
};

window.showContactForm = function() {
  document.getElementById('contact-form-section').style.display = 'block';
  document.getElementById('drawer-actions').style.display = 'none';
  document.getElementById('contact-form-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.hideContactForm = function() {
  document.getElementById('contact-form-section').style.display = 'none';
  document.getElementById('drawer-actions').style.display = 'flex';
};

window.submitContactForm = async function(workerId) {
  const senderName  = document.getElementById('contact-sender-name').value.trim();
  const senderEmail = document.getElementById('contact-sender-email').value.trim();
  const message     = document.getElementById('contact-message').value.trim();

  if (!senderName || !senderEmail || !message) {
    showFormError('Please fill in all fields.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    showFormError('Please enter a valid email address.');
    return;
  }

  const btn = document.querySelector('#contact-form-section .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  // Open native email client pointing at the worker's email
  const worker = window.workersCache?.find(w => w.user_id === workerId);
  const workerEmail = worker?.profiles?.email || '';
  const subject = encodeURIComponent(`Job Opportunity on SkillBridge — ${worker?.trade} Role`);
  const body = encodeURIComponent(`${message}\n\n— ${senderName} (${senderEmail})`);

  if (workerEmail) {
    window.open(`mailto:${workerEmail}?subject=${subject}&body=${body}`, '_blank');
  }

  // Show success
  document.getElementById('contact-form-section').innerHTML = `
    <div style="text-align:center;padding:2rem 1rem;">
      <div style="font-size:3rem;margin-bottom:1rem;">✅</div>
      <h3 style="font-family:var(--font-display);font-size:var(--text-xl);margin-bottom:0.5rem;">Message Sent!</h3>
      <p class="text-muted" style="margin-bottom:1.5rem;">
        Your default email client opened to send your message to <strong>${worker?.profiles?.full_name || 'the worker'}</strong>.
      </p>
      <button class="btn btn-outline" style="width:100%;" onclick="closeDrawer()">Close</button>
    </div>
  `;
};

function showFormError(msg) {
  let err = document.getElementById('contact-form-error');
  if (!err) {
    err = document.createElement('p');
    err.id = 'contact-form-error';
    err.style.cssText = 'color:var(--color-accent);font-size:var(--text-sm);margin-bottom:0.5rem;';
    const form = document.getElementById('contact-form-section').querySelector('div');
    form.prepend(err);
  }
  err.textContent = msg;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getTradeBadgeClass(trade) {
  return { Electrician: 'badge-accent', Plumber: 'badge-success', Carpenter: 'badge-accent', Welder: 'badge-success', Mason: 'badge-success' }[trade] || '';
}
