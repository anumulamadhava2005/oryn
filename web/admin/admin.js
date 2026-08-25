/**
 * Oryn Admin Dashboard JS Client
 * Handles Google Authentication, REST API interaction with /api/oryn/,
 * state management for Mess Menu and Academic Timetable CRUD.
 */

// Configuration
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api/oryn'
  : 'https://api.cruxel.xyz/oryn';

const GOOGLE_CLIENT_ID = '780775878479-79i2dggv8m721b0q36t7gq33a46e16n3.apps.googleusercontent.com';

// State
let jwtToken = localStorage.getItem('oryn_admin_jwt') || null;
let currentUser = null;
let activeTab = 'mess'; // 'mess' | 'timetable'
let messData = [];
let timetableData = [];

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const userAvatarEl = document.getElementById('user-avatar');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const logoutBtn = document.getElementById('btn-logout');

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  if (jwtToken) {
    validateSession();
  } else {
    showAuth();
  }

  initTabs();
  initModals();
});

// --- AUTHENTICATION ---

function showAuth() {
  authSection.style.display = 'block';
  dashboardSection.style.display = 'none';
  initGoogleSignIn();
}

function showDashboard(user) {
  currentUser = user;
  authSection.style.display = 'none';
  dashboardSection.style.display = 'block';

  userNameEl.textContent = user.full_name || user.email.split('@')[0];
  userEmailEl.textContent = user.email;
  if (user.avatar_url) {
    userAvatarEl.src = user.avatar_url;
  } else {
    userAvatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email)}&background=007AFF&color=fff`;
  }

  loadActiveTabData();
}

async function validateSession() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    if (!res.ok) throw new Error('Session expired');
    const user = await res.json();
    showDashboard(user);
  } catch (err) {
    console.warn('Session invalid:', err.message);
    localStorage.removeItem('oryn_admin_jwt');
    jwtToken = null;
    showAuth();
  }
}

function initGoogleSignIn() {
  if (window.google && window.google.accounts) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse,
    });
    window.google.accounts.id.renderButton(
      document.getElementById('g_id_onload'),
      { theme: 'filled_black', size: 'large', shape: 'pill' }
    );
  } else {
    setTimeout(initGoogleSignIn, 300);
  }
}

async function handleGoogleCredentialResponse(response) {
  const idToken = response.credential;
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    jwtToken = data.token;
    localStorage.setItem('oryn_admin_jwt', jwtToken);
    showToast('Login successful!', 'success');
    showDashboard(data.user);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('oryn_admin_jwt');
  jwtToken = null;
  currentUser = null;
  showToast('Logged out', 'success');
  showAuth();
});

// --- TAB NAVIGATION ---

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      activeTab = e.currentTarget.dataset.tab;
      document.getElementById('mess-tab-content').style.display = activeTab === 'mess' ? 'block' : 'none';
      document.getElementById('timetable-tab-content').style.display = activeTab === 'timetable' ? 'block' : 'none';

      loadActiveTabData();
    });
  });
}

function loadActiveTabData() {
  if (activeTab === 'mess') {
    fetchMessMenu();
  } else if (activeTab === 'timetable') {
    fetchTimetable();
  }
}

// --- MESS MENU MANAGEMENT ---

async function fetchMessMenu() {
  const weekFilter = document.getElementById('mess-week-filter').value;
  let url = `${API_BASE}/mess-menu`;
  if (weekFilter) url += `?week_type=${weekFilter}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch mess menu');
    messData = await res.json();
    renderMessMenuTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('mess-week-filter').addEventListener('change', fetchMessMenu);

function renderMessMenuTable() {
  const tbody = document.getElementById('mess-table-body');
  if (messData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">No mess menu items found. Click "Add Meal Item" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = messData.map(item => `
    <tr>
      <td><span class="badge badge-${item.week_type}">${item.week_type.toUpperCase()} WEEK</span></td>
      <td><strong>${item.day}</strong></td>
      <td><span class="badge badge-${item.meal_type}">${item.meal_type.toUpperCase()}</span></td>
      <td>${(item.main || []).map(m => `<span class="item-chip">${escapeHtml(m)}</span>`).join('')}</td>
      <td>${(item.accompaniments || []).map(a => `<span class="item-chip">${escapeHtml(a)}</span>`).join('')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="editMessItem('${item.id}')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon delete" onclick="deleteMessItem('${item.id}')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function saveMessItem(e) {
  e.preventDefault();
  const id = document.getElementById('mess-id').value;
  const payload = {
    week_type: document.getElementById('mess-week').value,
    day: document.getElementById('mess-day').value,
    meal_type: document.getElementById('mess-meal').value,
    main: parseList(document.getElementById('mess-main').value),
    accompaniments: parseList(document.getElementById('mess-accompaniments').value),
    extras: parseList(document.getElementById('mess-extras').value),
    beverage: document.getElementById('mess-beverage').value || null,
    dessert: document.getElementById('mess-dessert').value || null,
  };

  try {
    const url = id ? `${API_BASE}/mess-menu/${id}` : `${API_BASE}/mess-menu`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save mess item');

    showToast(`Mess meal ${id ? 'updated' : 'added'} successfully!`, 'success');
    closeModal('mess-modal');
    fetchMessMenu();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function editMessItem(id) {
  const item = messData.find(m => m.id === id);
  if (!item) return;

  document.getElementById('mess-id').value = item.id;
  document.getElementById('mess-week').value = item.week_type;
  document.getElementById('mess-day').value = item.day;
  document.getElementById('mess-meal').value = item.meal_type;
  document.getElementById('mess-main').value = (item.main || []).join(', ');
  document.getElementById('mess-accompaniments').value = (item.accompaniments || []).join(', ');
  document.getElementById('mess-extras').value = (item.extras || []).join(', ');
  document.getElementById('mess-beverage').value = item.beverage || '';
  document.getElementById('mess-dessert').value = item.dessert || '';

  document.getElementById('mess-modal-title').textContent = 'Edit Mess Meal Item';
  openModal('mess-modal');
}

async function deleteMessItem(id) {
  if (!confirm('Are you sure you want to delete this mess menu entry?')) return;

  try {
    const res = await fetch(`${API_BASE}/mess-menu/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete');
    }
    showToast('Mess item deleted', 'success');
    fetchMessMenu();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- ACADEMIC TIMETABLE MANAGEMENT ---

async function fetchTimetable() {
  const day = document.getElementById('tt-day-filter').value;
  let url = `${API_BASE}/timetable`;
  if (day) url += `?day=${day}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch timetable');
    timetableData = await res.json();
    renderTimetableTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('tt-day-filter').addEventListener('change', fetchTimetable);

function renderTimetableTable() {
  const tbody = document.getElementById('tt-table-body');
  if (timetableData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No academic timetable entries found. Click "Add Timetable Entry" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = timetableData.map(item => `
    <tr>
      <td><strong>${item.day}</strong></td>
      <td><span class="item-chip">${item.start_time} - ${item.end_time}</span></td>
      <td><strong>${escapeHtml(item.subject)}</strong> ${item.course_code ? `<br><small style="color:var(--text-muted);">${escapeHtml(item.course_code)}</small>` : ''}</td>
      <td>${item.instructor ? escapeHtml(item.instructor) : '-'}</td>
      <td>${item.room ? `<span class="badge badge-even">${escapeHtml(item.room)}</span>` : '-'}</td>
      <td>${item.slot_code ? `<span class="badge badge-snacks">${escapeHtml(item.slot_code)}</span>` : '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" onclick="editTimetableItem('${item.id}')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon delete" onclick="deleteTimetableItem('${item.id}')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function saveTimetableItem(e) {
  e.preventDefault();
  const id = document.getElementById('tt-id').value;
  const payload = {
    day: document.getElementById('tt-day').value,
    start_time: document.getElementById('tt-start-time').value,
    end_time: document.getElementById('tt-end-time').value,
    subject: document.getElementById('tt-subject').value,
    course_code: document.getElementById('tt-course-code').value || null,
    instructor: document.getElementById('tt-instructor').value || null,
    room: document.getElementById('tt-room').value || null,
    slot_code: document.getElementById('tt-slot').value || null,
    program: document.getElementById('tt-program').value || null,
    semester: document.getElementById('tt-semester').value || null,
  };

  try {
    const url = id ? `${API_BASE}/timetable/${id}` : `${API_BASE}/timetable`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save timetable entry');

    showToast(`Timetable entry ${id ? 'updated' : 'added'} successfully!`, 'success');
    closeModal('tt-modal');
    fetchTimetable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function editTimetableItem(id) {
  const item = timetableData.find(t => t.id === id);
  if (!item) return;

  document.getElementById('tt-id').value = item.id;
  document.getElementById('tt-day').value = item.day;
  document.getElementById('tt-start-time').value = item.start_time;
  document.getElementById('tt-end-time').value = item.end_time;
  document.getElementById('tt-subject').value = item.subject;
  document.getElementById('tt-course-code').value = item.course_code || '';
  document.getElementById('tt-instructor').value = item.instructor || '';
  document.getElementById('tt-room').value = item.room || '';
  document.getElementById('tt-slot').value = item.slot_code || '';
  document.getElementById('tt-program').value = item.program || '';
  document.getElementById('tt-semester').value = item.semester || '';

  document.getElementById('tt-modal-title').textContent = 'Edit Timetable Entry';
  openModal('tt-modal');
}

async function deleteTimetableItem(id) {
  if (!confirm('Are you sure you want to delete this timetable entry?')) return;

  try {
    const res = await fetch(`${API_BASE}/timetable/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwtToken}` }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete');
    }
    showToast('Timetable entry deleted', 'success');
    fetchTimetable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- UTILITIES & MODAL HELPERS ---

function initModals() {
  document.getElementById('mess-form').addEventListener('submit', saveMessItem);
  document.getElementById('tt-form').addEventListener('submit', saveTimetableItem);

  document.getElementById('btn-add-mess').addEventListener('click', () => {
    document.getElementById('mess-form').reset();
    document.getElementById('mess-id').value = '';
    document.getElementById('mess-modal-title').textContent = 'Add Mess Meal Item';
    openModal('mess-modal');
  });

  document.getElementById('btn-add-tt').addEventListener('click', () => {
    document.getElementById('tt-form').reset();
    document.getElementById('tt-id').value = '';
    document.getElementById('tt-modal-title').textContent = 'Add Timetable Entry';
    openModal('tt-modal');
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

function parseList(str) {
  if (!str || !str.trim()) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
