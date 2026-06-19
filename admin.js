// ============================================
// admin.js — King Barber Admin Panel
// ============================================

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Auth guard: session yoksa login'e yönlendir ──
const SESSION_KEY = "kb_admin_session";
const USER_KEY    = "kb_admin_user";

if (sessionStorage.getItem(SESSION_KEY) !== "authenticated") {
  window.location.href = "admin-login.html";
}

initAdmin();

// ── Uygulama başlangıcı ──
function initAdmin() {
  setupUserInfo();
  setupNavigation();
  setupLogout();
  setupSidebarMobile();
  setupDashboardDate();
  loadAllAppointments();
}

// ── Kullanıcı bilgisi ──
function setupUserInfo() {
  const displayName = sessionStorage.getItem(USER_KEY) || 'Yönetici';
  const emailEl     = document.getElementById('userEmail');
  const avatarEl    = document.getElementById('userAvatar');
  if (emailEl)  emailEl.textContent  = displayName;
  if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
}

// ── Navigasyon ──
function setupNavigation() {
  const links    = document.querySelectorAll('.sidebar-link[data-section]');
  const sections = document.querySelectorAll('.admin-section');

  function goTo(sectionId) {
    links.forEach(l => l.classList.toggle('active', l.dataset.section === sectionId));
    sections.forEach(s => s.classList.toggle('active', s.id === 'section-' + sectionId));
    // mobil sidebar kapat
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('open');
  }

  links.forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); goTo(link.dataset.section); });
  });

  // Dashboard panel "tümünü gör" linkleri
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.goto));
  });
}

// ── Çıkış ──
function setupLogout() {
  const doLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.href = "admin-login.html";
  };
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
  document.getElementById('mobileLogoutBtn')?.addEventListener('click', doLogout);
}

// ── Mobil sidebar ──
function setupSidebarMobile() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const toggleBtn = document.getElementById('sidebarToggle');

  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// ── Dashboard tarih ──
function setupDashboardDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const label = now.toLocaleDateString('tr-TR', opts);
  const el = document.getElementById('dashboardDate');
  if (el) el.textContent = label;

  const todayEl = document.getElementById('todayDateLabel');
  if (todayEl) todayEl.textContent = label;
}

// ── Randevu yükleme (gerçek zamanlı) ──
let allAppointments = [];

function loadAllAppointments() {
  // orderBy kaldırıldı — composite index gerektirmez, sıralama client-side yapılır
  const q = query(collection(db, 'appointments'));

  onSnapshot(q, snapshot => {
    allAppointments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    renderDashboardPanels();
    renderAppointmentsTable();
    renderTodayTimeline();
    updatePendingBadge();
  }, err => {
    console.error('Firestore okuma hatası:', err);
    showDbError(err);
  });
}

function showDbError(err) {
  const tbody = document.getElementById('appointmentsBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-loading" style="color:#ff8080">
          ⚠️ Veriler yüklenemedi: <strong>${err.code || err.message}</strong><br>
          <small style="color:#888;margin-top:6px;display:block">
            Firebase Console → Firestore → Rules → <code>allow read, write: if true;</code> olarak güncelleyin
          </small>
        </td>
      </tr>`;
  }
}

// ── İstatistikler ──
function updateStats() {
  const todayStr = todayISOString();
  const monthStr = todayStr.slice(0, 7); // YYYY-MM

  const todayAppts    = allAppointments.filter(a => a.date === todayStr);
  const pendingAppts  = allAppointments.filter(a => a.status === 'pending');
  const monthAppts    = allAppointments.filter(a => a.date?.startsWith(monthStr));
  const completedAppts = allAppointments.filter(a => a.status === 'completed' && a.date?.startsWith(monthStr));

  setText('numToday',     todayAppts.length);
  setText('numPending',   pendingAppts.length);
  setText('numMonth',     monthAppts.length);
  setText('numCompleted', completedAppts.length);
}

function updatePendingBadge() {
  const count = allAppointments.filter(a => a.status === 'pending').length;
  const badge = document.getElementById('pendingBadge');
  if (badge) {
    badge.textContent = count;
    badge.dataset.count = count;
  }
}

// ── Dashboard panelleri ──
function renderDashboardPanels() {
  const todayStr  = todayISOString();
  const todayList = allAppointments.filter(a => a.date === todayStr);
  const pending   = allAppointments.filter(a => a.status === 'pending').slice(0, 5);

  renderCompactList('todayList', todayList, 'Bugün için randevu yok.');
  renderCompactList('pendingList', pending,  'Bekleyen randevu yok.');
}

function renderCompactList(containerId, appts, emptyMsg) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!appts.length) {
    el.innerHTML = `<div class="empty-state"><span>✓</span><p>${emptyMsg}</p></div>`;
    return;
  }

  el.innerHTML = appts.map(a => `
    <div class="appt-row" data-id="${a.id}" onclick="openDetail('${a.id}')">
      <div class="appt-time">${a.time || '—'}</div>
      <div class="appt-info">
        <div class="appt-name">${escHtml(a.name)}</div>
        <div class="appt-meta">${serviceLabel(a.service)} · ${barberLabel(a.barber)}</div>
      </div>
      <div>${statusBadge(a.status)}</div>
    </div>
  `).join('');
}

// ── Randevular tablosu ──
let currentFilter = { status: 'all', barber: 'all', date: '' };

function renderAppointmentsTable(filter = currentFilter) {
  const tbody = document.getElementById('appointmentsBody');
  if (!tbody) return;

  let data = [...allAppointments];

  if (filter.status !== 'all') data = data.filter(a => a.status === filter.status);
  if (filter.barber !== 'all') data = data.filter(a => a.barber === filter.barber);
  if (filter.date)             data = data.filter(a => a.date === filter.date);

  // En yakın tarih önce
  data.sort((a, b) => {
    const da = (a.date || '') + (a.time || '');
    const db2 = (b.date || '') + (b.time || '');
    return da.localeCompare(db2);
  });

  const countEl = document.getElementById('apptCount');
  if (countEl) countEl.textContent = `${data.length} randevu listeleniyor`;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Bu kriterlere uygun randevu bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(a => `
    <tr onclick="openDetail('${a.id}')">
      <td class="td-datetime">
        <div class="td-date">${formatDate(a.date)}</div>
        <div class="td-time">${a.time || '—'}</div>
      </td>
      <td>
        <div class="td-name">${escHtml(a.name)}</div>
        <div class="td-phone">${escHtml(a.phone)}</div>
      </td>
      <td>${serviceLabel(a.service)}</td>
      <td>${barberLabel(a.barber)}</td>
      <td>${statusBadge(a.status)}</td>
      <td>
        <div class="action-btns" onclick="event.stopPropagation()">
          ${a.status === 'pending'  ? `<button class="action-btn approve"  onclick="updateStatus('${a.id}','approved')">Onayla</button>` : ''}
          ${a.status === 'approved' ? `<button class="action-btn complete" onclick="updateStatus('${a.id}','completed')">Tamamla</button>` : ''}
          ${a.status !== 'rejected' && a.status !== 'completed' ? `<button class="action-btn reject" onclick="updateStatus('${a.id}','rejected')">İptal</button>` : ''}
          <button class="action-btn detail" onclick="openDetail('${a.id}')">Detay</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Filtre setup
function setupFilters() {
  // Durum filtresi
  document.getElementById('statusFilter')?.addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('#statusFilter .filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter.status = pill.dataset.filter;
    renderAppointmentsTable(currentFilter);
  });

  // Berber filtresi
  document.getElementById('barberFilter')?.addEventListener('change', e => {
    currentFilter.barber = e.target.value;
    renderAppointmentsTable(currentFilter);
  });

  // Tarih filtresi
  document.getElementById('dateFilter')?.addEventListener('change', e => {
    currentFilter.date = e.target.value;
    renderAppointmentsTable(currentFilter);
  });

  // Temizle
  document.getElementById('clearFilters')?.addEventListener('click', () => {
    currentFilter = { status: 'all', barber: 'all', date: '' };
    document.querySelectorAll('#statusFilter .filter-pill').forEach((p, i) => p.classList.toggle('active', i === 0));
    document.getElementById('barberFilter').value = 'all';
    document.getElementById('dateFilter').value = '';
    renderAppointmentsTable(currentFilter);
  });

  // Yenile
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    renderAppointmentsTable(currentFilter);
  });
}

// ── Bugün timeline ──
function renderTodayTimeline() {
  const container = document.getElementById('todayTimeline');
  if (!container) return;

  const todayStr = todayISOString();
  const todayAppts = allAppointments
    .filter(a => a.date === todayStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (!todayAppts.length) {
    container.innerHTML = `<div class="empty-state"><span>☀️</span><p>Bugün için kayıtlı randevu yok.</p></div>`;
    return;
  }

  container.innerHTML = todayAppts.map(a => {
    const [hr, min] = (a.time || '00:00').split(':');
    return `
      <div class="timeline-item" onclick="openDetail('${a.id}')">
        <div class="timeline-time-col">
          <span class="timeline-hour">${hr}</span>
          <span class="timeline-minute">${min}</span>
        </div>
        <div class="timeline-content">
          <div class="timeline-name">${escHtml(a.name)}</div>
          <div class="timeline-service">${serviceLabel(a.service)}</div>
          <div class="timeline-footer">
            <span class="timeline-barber">${barberLabel(a.barber)}</span>
            <span class="timeline-phone">${escHtml(a.phone)}</span>
            <span class="timeline-status">${statusBadge(a.status)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Durum güncelleme ──
window.updateStatus = async function(id, newStatus) {
  try {
    await updateDoc(doc(db, 'appointments', id), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    // Modal açıksa kapat
    closeModal();
  } catch (err) {
    console.error('Durum güncellenemedi:', err);
    alert('Güncelleme sırasında bir hata oluştu.');
  }
};

// ── Detail Modal ──
window.openDetail = function(id) {
  const a = allAppointments.find(ap => ap.id === id);
  if (!a) return;

  const bodyEl   = document.getElementById('modalBody');
  const footerEl = document.getElementById('modalFooter');
  const overlay  = document.getElementById('detailModal');

  bodyEl.innerHTML = `
    <div class="modal-detail-grid">
      <div class="modal-detail-item">
        <label>Ad Soyad</label>
        <span>${escHtml(a.name)}</span>
      </div>
      <div class="modal-detail-item">
        <label>Telefon</label>
        <span><a href="tel:${escHtml(a.phone)}" style="color:var(--gold)">${escHtml(a.phone)}</a></span>
      </div>
      <div class="modal-detail-item">
        <label>Tarih</label>
        <span>${formatDate(a.date)}</span>
      </div>
      <div class="modal-detail-item">
        <label>Saat</label>
        <span>${a.time || '—'}</span>
      </div>
      <div class="modal-detail-item">
        <label>Hizmet</label>
        <span>${serviceLabel(a.service)}</span>
      </div>
      <div class="modal-detail-item">
        <label>Berber</label>
        <span>${barberLabel(a.barber)}</span>
      </div>
      <div class="modal-detail-item">
        <label>Durum</label>
        <span>${statusBadge(a.status)}</span>
      </div>
      <div class="modal-detail-item">
        <label>Kayıt Tarihi</label>
        <span>${a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString('tr-TR') : '—'}</span>
      </div>
      ${a.notes ? `
      <div class="modal-detail-item full">
        <label>Müşteri Notu</label>
        <div class="modal-notes">${escHtml(a.notes)}</div>
      </div>` : ''}
    </div>
  `;

  footerEl.innerHTML = `
    ${a.status === 'pending'  ? `<button class="action-btn approve"  onclick="updateStatus('${a.id}','approved')">✓ Onayla</button>` : ''}
    ${a.status === 'approved' ? `<button class="action-btn complete" onclick="updateStatus('${a.id}','completed')">✓ Tamamlandı</button>` : ''}
    ${a.status !== 'rejected' && a.status !== 'completed'
      ? `<button class="action-btn reject" onclick="updateStatus('${a.id}','rejected')">✕ İptal Et</button>` : ''}
    <button class="action-btn detail" onclick="closeModal()">Kapat</button>
  `;

  overlay.classList.add('active');
};

function closeModal() {
  document.getElementById('detailModal')?.classList.remove('active');
}
window.closeModal = closeModal;

document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('detailModal')?.addEventListener('click', e => {
  if (e.target.id === 'detailModal') closeModal();
});

// ── Yardımcı fonksiyonlar ──
function todayISOString() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function statusBadge(status) {
  const map = {
    pending:   'Bekleyen',
    approved:  'Onaylandı',
    completed: 'Tamamlandı',
    rejected:  'İptal',
  };
  return `<span class="status-badge ${status || 'pending'}">${map[status] || status}</span>`;
}

function serviceLabel(val) {
  const map = {
    klasik:  'Klasik Saç Kesimi',
    sacsakal:   'Saç + Sakal Paketi',
    vip:     'VIP Bakım Paketi',
    cocuk: 'Çocuk Kesimi',
    cilt: 'Cilt Bakımı',
    damat: 'Damat Paketi',
  };
  return map[val] || val || '—';
}

function barberLabel(val) {
  const map = {
    fatihtuncer: 'Fatih Tuncer',
    usta1: 'Şemsettin Sancak',
    usta2: 'Furkan Ormankaya',
    usta3: 'Berat Özbakır',
  };
  return map[val] || val || '—';
}

// ── Init ──
setupFilters();
