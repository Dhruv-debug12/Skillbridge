/**
 * SkillBridge — Worker Profile Page
 * Loads any worker's public profile. Own profile shows edit + avatar upload.
 */
import { db, supabase } from './supabase.js';
import { auth } from './auth.js';

let currentUser  = null;
let profileData  = null;
let isOwnProfile = false;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await auth.getSession();
  updateNav(currentUser);

  const urlParams = new URLSearchParams(window.location.search);
  const targetId  = urlParams.get('id') || (currentUser ? currentUser.id : null);

  if (targetId) {
    await loadWorkerProfile(targetId, currentUser?.id);
  } else {
    document.getElementById('loading-state').innerHTML = `
      <p class="text-muted">No profile found. <a href="auth.html?role=worker" class="text-accent">Sign up as a Worker →</a></p>`;
  }

  // ── Edit profile button handlers ──────────────────────────────
  document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
    document.body.classList.add('is-editing');
    populateEditForms();
  });

  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
    document.body.classList.remove('is-editing');
  });

  document.getElementById('btn-save-edit')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-edit');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    await saveProfileChanges();
    btn.disabled = false;
    btn.textContent = 'Save Changes';
    document.body.classList.remove('is-editing');
  });

  // ── Avatar upload wiring ──────────────────────────────────────
  const fileInput    = document.getElementById('avatar-file-input');
  const avatarOverlay = document.getElementById('avatar-overlay');

  // Clicking the overlay triggers file picker
  avatarOverlay?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('❌ Image too large. Max size is 5 MB.', 3000);
      return;
    }

    showToast('📸 Uploading photo...', 0); // sticky until done

    try {
      const publicUrl = await db.uploadAvatar(currentUser.id, file);

      // Cache-bust so the browser reloads the new image
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;
      setAvatarImage(bustedUrl);
      profileData.avatar_url = publicUrl;

      showToast('✅ Profile photo updated!', 2500);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      showToast(`❌ Upload failed: ${err.message}`, 3500);
    } finally {
      fileInput.value = ''; // reset file input so same file can be selected again
    }
  });
});

// ── Toast helper ──────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('avatar-toast');
  if (!toast) return;
  clearTimeout(_toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  if (duration > 0) {
    _toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  }
}

// ── Set avatar image in the circle ────────────────────────────
function setAvatarImage(url) {
  const avatarEl = document.getElementById('profile-initials');
  if (!avatarEl) return;
  // Replace initials text with actual image
  avatarEl.innerHTML = `<img src="${url}" alt="Profile photo" id="avatar-img">`;
}

// ── Nav ───────────────────────────────────────────────────────
async function updateNav(user) {
  const container = document.getElementById('nav-actions');
  if (!container) return;

  if (user) {
    let dashLink = 'worker-dashboard.html';
    try {
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (data?.role === 'employer') dashLink = 'employer-dashboard.html';
    } catch (_) {}

    container.innerHTML = `
      <a href="job-board.html" class="btn btn-outline" style="margin-right:0.5rem;">Browse Jobs</a>
      <a href="${dashLink}" class="btn btn-outline" style="margin-right:0.5rem;">Dashboard</a>
      <button id="logout-btn" class="btn btn-text">Logout</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', () => auth.logout());
  } else {
    container.innerHTML = `
      <a href="auth.html" class="btn btn-text">Sign In</a>
      <a href="auth.html?role=worker" class="btn btn-primary">Join</a>
    `;
  }
}

// ── Load profile ──────────────────────────────────────────────
async function loadWorkerProfile(targetId, viewerId) {
  const loadingEl = document.getElementById('loading-state');
  const profileEl = document.getElementById('profile-container');

  try {
    const [baseProfile, workerProfile] = await Promise.all([
      db.getProfile(targetId),
      db.getWorkerProfile(targetId).catch(() => null),
    ]);

    if (!workerProfile) {
      loadingEl.innerHTML = `<p class="text-muted">This user does not have a worker profile yet.</p>`;
      return;
    }

    // Merge into a single object
    profileData = {
      ...baseProfile,
      ...workerProfile,
      full_name:  baseProfile.full_name,
      location:   baseProfile.location,
      email:      baseProfile.email,
      phone:      baseProfile.phone,
      avatar_url: baseProfile.avatar_url,
      bio:        workerProfile.bio || baseProfile.bio,
    };

    loadingEl.style.display = 'none';
    profileEl.style.display = 'block';

    renderProfile(profileData);

    // ── Button & overlay visibility based on ownership ──────────
    isOwnProfile = !!(viewerId && viewerId === targetId);

    if (isOwnProfile) {
      document.getElementById('btn-edit-profile').style.display  = 'inline-flex';
      document.getElementById('btn-contact').style.display       = 'none';
      // Show the camera upload overlay
      document.getElementById('avatar-overlay')?.classList.add('active');
    } else {
      document.getElementById('btn-contact').style.display       = 'inline-flex';
      document.getElementById('btn-edit-profile').style.display  = 'none';
      document.getElementById('btn-contact').addEventListener('click', () => {
        if (profileData.email) {
          const subject = encodeURIComponent('Job Opportunity on SkillBridge');
          window.open(`mailto:${profileData.email}?subject=${subject}`, '_blank');
        } else {
          alert('No contact email available for this worker.');
        }
      });
    }

  } catch (err) {
    console.error('Profile load failed:', err);
    loadingEl.innerHTML = `<p style="color:var(--color-accent);">Error loading profile: ${err.message}</p>`;
  }
}

// ── Render ────────────────────────────────────────────────────
function renderProfile(data) {
  // Avatar — show image or initials
  const avatarEl = document.getElementById('profile-initials');
  if (data.avatar_url) {
    avatarEl.innerHTML = `<img src="${data.avatar_url}?t=${Date.now()}" alt="${data.full_name}" id="avatar-img">`;
  } else {
    avatarEl.textContent = getInitials(data.full_name);
  }

  document.getElementById('profile-name').textContent      = data.full_name || 'Anonymous Worker';
  document.getElementById('profile-trade').textContent     = data.trade || 'General Labor';
  document.getElementById('profile-location').textContent  = `📍 ${data.location || 'Unknown Location'}`;
  document.getElementById('profile-experience').textContent = `⏱️ ${data.experience_years || 0} Yrs Exp`;
  document.getElementById('profile-bio').textContent       = data.bio || 'No bio provided yet.';

  // Availability
  const dot      = document.getElementById('status-dot');
  const availTxt = document.getElementById('availability-text');
  if (data.is_available) {
    dot.classList.add('active');
    availTxt.textContent = 'Available Now';
  } else {
    dot.classList.remove('active');
    availTxt.textContent = 'Not Available';
  }

  // Hourly rate
  const rateEl = document.getElementById('profile-rate');
  if (rateEl) rateEl.textContent = data.hourly_rate ? `$${data.hourly_rate}/hr` : 'Negotiable';

  // Skills
  const skillsList = document.getElementById('skills-list');
  const skills     = Array.isArray(data.skills) ? data.skills : [];
  if (skillsList) {
    skillsList.innerHTML = skills.length > 0
      ? skills.map(s => `<span class="trade-chip">${s}</span>`).join('')
      : `<span class="text-muted text-sm">No skills listed yet.</span>`;
  }
}

// ── Edit mode ─────────────────────────────────────────────────
function populateEditForms() {
  document.getElementById('edit-name').value          = profileData.full_name || '';
  document.getElementById('edit-bio').value           = profileData.bio || '';
  document.getElementById('edit-availability').checked = !!profileData.is_available;

  const rateInput = document.getElementById('edit-rate');
  if (rateInput) rateInput.value = profileData.hourly_rate || '';
}

async function saveProfileChanges() {
  const newName     = document.getElementById('edit-name').value.trim();
  const newBio      = document.getElementById('edit-bio').value.trim();
  const isAvailable = document.getElementById('edit-availability').checked;
  const rateInput   = document.getElementById('edit-rate');
  const newRate     = rateInput ? parseFloat(rateInput.value) || null : undefined;

  try {
    await db.updateProfile(currentUser.id, { full_name: newName });

    const workerUpdates = { bio: newBio, is_available: isAvailable };
    if (newRate !== undefined) workerUpdates.hourly_rate = newRate;
    await db.upsertWorkerProfile(currentUser.id, workerUpdates);

    profileData.full_name    = newName;
    profileData.bio          = newBio;
    profileData.is_available = isAvailable;
    if (newRate !== undefined) profileData.hourly_rate = newRate;

    renderProfile(profileData);
    showToast('✅ Profile saved!', 2000);
  } catch (err) {
    console.error('Save failed:', err);
    alert(`Failed to save: ${err.message}`);
  }
}

// ── Utils ─────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}
