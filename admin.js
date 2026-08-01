// ============================================
// admin.js — King Barber Admin Panel
// ============================================

import { db, app, auth } from "./firebase-config.js";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getMessaging,
  getToken
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase Console → Project Settings → Cloud Messaging → Web Push certificates'tan alınır
const VAPID_KEY = "BIiw-2oMjZn79Xi3SJ0-ajdGZSCRYrma4FZnxOxlQ3wZC-55kzJRrEKPvAqCH2XwA4XxdPp2k7bFZRDYNaES4IE";

// ── Auth guard: gerçek Firebase Authentication oturumu yoksa login'e yönlendir ──
const USER_KEY = "kb_admin_user";

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "admin-login.html";
    return;
  }
  initAdmin();
});

// ── Uygulama başlangıcı ──
function initAdmin() {
  setupUserInfo();
  setupNavigation();
  setupLogout();
  setupSidebarMobile();
  setupDashboardDate();
  setupAppInstall();
  loadAllAppointments();
  setupPushNotifications();
}

// ── Push bildirimleri (yeni randevu geldiğinde) ──
function setupPushNotifications() {
  const btn   = document.getElementById('notifyBtn');
  const label = document.getElementById('notifyBtnLabel');
  if (!btn || !label) return;

  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    btn.hidden = true;
    return;
  }
  if (VAPID_KEY === "BURAYA_VAPID_KEY_YAPISTIR") {
    console.warn('VAPID_KEY tanımlanmadı, push bildirimleri kurulmadı.');
    btn.hidden = true;
    return;
  }

  updateNotifyButton();

  btn.addEventListener('click', async () => {
    if (Notification.permission === 'denied') {
      alert('Bildirimler tarayıcı ayarlarından engellenmiş görünüyor. Adres çubuğundaki kilit/site bilgisi simgesinden bildirim iznini "İzin ver" olarak değiştirip sayfayı yenileyin.');
      return;
    }
    label.textContent = 'Açılıyor...';
    await registerPushToken();
    updateNotifyButton();
  });

  // İzin zaten verilmişse (önceki ziyaretten) token'ı sessizce tazele.
  if (Notification.permission === 'granted') registerPushToken();
}

function updateNotifyButton() {
  const btn   = document.getElementById('notifyBtn');
  const label = document.getElementById('notifyBtnLabel');
  if (!btn || !label) return;

  if (Notification.permission === 'granted') {
    label.textContent = 'Bildirimler Açık ✓';
    btn.classList.add('notify-on');
  } else if (Notification.permission === 'denied') {
    label.textContent = 'Bildirimler Engelli';
    btn.classList.remove('notify-on');
  } else {
    label.textContent = 'Bildirimleri Aç';
    btn.classList.remove('notify-on');
  }
}

async function registerPushToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);
    const fcmToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (fcmToken) {
      await setDoc(doc(db, 'fcmTokens', fcmToken), {
        user: sessionStorage.getItem(USER_KEY) || 'unknown',
        userAgent: navigator.userAgent,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error('Push bildirim kurulumu başarısız:', err);
    alert('Bildirimler açılamadı, lütfen tekrar deneyin.');
  }
}

// PWA kurulumu (buton sadece yönetici panelinde görünür)
function setupAppInstall() {
  const installBtn = document.getElementById('installAppBtn');
  const modal = document.getElementById('installModal');
  const body = document.getElementById('installModalBody');
  const actionBtn = document.getElementById('installModalAction');
  let deferredPrompt = null;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.error('Service worker kaydı başarısız:', err);
    });
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const closeModal = () => modal?.classList.remove('active');

  document.getElementById('installModalClose')?.addEventListener('click', closeModal);
  document.getElementById('installModalCancel')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (body) body.innerHTML = '<p>King Barber başarıyla cihazınıza yüklendi.</p>';
    if (actionBtn) actionBtn.hidden = true;
  });

  installBtn?.addEventListener('click', () => {
    if (!modal || !body || !actionBtn) return;
    actionBtn.hidden = true;

    if (isStandalone) {
      body.innerHTML = '<p>King Barber bu cihazda zaten uygulama olarak çalışıyor.</p>';
    } else if (isIos) {
      body.innerHTML = `
        <div class="install-guide">
          <p>iPhone/iPad'de kurulum Safari üzerinden yapılır:</p>
          <ol>
            <li>Bu sayfayı <strong>Safari</strong> ile açın.</li>
            <li>Alt menüdeki <strong>Paylaş</strong> simgesine dokunun.</li>
            <li><strong>Ana Ekrana Ekle</strong> seçeneğini seçin.</li>
            <li>Sağ üstteki <strong>Ekle</strong> düğmesine dokunun.</li>
          </ol>
        </div>`;
    } else if (deferredPrompt) {
      body.innerHTML = '<p>King Barber uygulamasını ana ekranınıza yükleyerek hızlıca açabilirsiniz.</p>';
      actionBtn.hidden = false;
    } else {
      body.innerHTML = `
        <p>Tarayıcınız otomatik kurulum penceresini göstermedi.</p>
        <p>Tarayıcı menüsünden <strong>Uygulamayı yükle</strong> veya <strong>Ana ekrana ekle</strong> seçeneğini kullanın.</p>`;
    }

    modal.classList.add('active');
  });

  actionBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    actionBtn.hidden = true;
    closeModal();
  });
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
    sessionStorage.removeItem(USER_KEY);
    signOut(auth).finally(() => {
      window.location.href = "admin-login.html";
    });
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
            Bu hesabın yönetici yetkisi yok gibi görünüyor. Doğru hesapla giriş yaptığınızdan emin olun.
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
      <td class="td-datetime" data-label="Tarih & Saat">
        <div class="td-date">${formatDate(a.date)}</div>
        <div class="td-time">${a.time || '—'}</div>
      </td>
      <td data-label="Müşteri">
        <div class="td-name">${escHtml(a.name)}</div>
        <div class="td-phone">${escHtml(a.phone)}</div>
      </td>
      <td data-label="Hizmet">${serviceLabel(a.service)}</td>
      <td data-label="Berber">${barberLabel(a.barber)}</td>
      <td data-label="Durum">${statusBadge(a.status)}</td>
      <td data-label="İşlemler">
        <div class="action-btns" onclick="event.stopPropagation()">
          ${a.status === 'pending'  ? `<button class="action-btn approve"  onclick="updateStatus('${a.id}','approved')">Onayla</button>` : ''}
          ${a.status === 'approved' ? `<button class="action-btn complete" onclick="updateStatus('${a.id}','completed')">Tamamla</button>` : ''}
          ${a.status !== 'rejected' && a.status !== 'completed' ? `<button class="action-btn reject" onclick="updateStatus('${a.id}','rejected')">İptal</button>` : ''}
          <button class="action-btn message" onclick="sendAppointmentMessage('${a.id}')">Mesaj Gönder</button>
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

// ── Müşteriye WhatsApp mesajı gönderme ──
window.sendAppointmentMessage = function(id) {
  const appointment = allAppointments.find(a => a.id === id);
  if (!appointment) return;

  const phone = normalizeWhatsAppPhone(appointment.phone);
  if (!phone) {
    alert('Müşterinin telefon numarası geçerli değil.');
    return;
  }

  const message = [
    `Merhaba ${appointment.name || 'değerli müşterimiz'},`,
    '',
    'King Barber randevunuz başarıyla oluşturulmuştur.',
    `Tarih: ${formatDate(appointment.date)}`,
    `Saat: ${appointment.time || '-'}`,
    `Hizmet: ${serviceLabel(appointment.service)}`,
    `Berber: ${barberLabel(appointment.barber)}`,
    '',
    'Belirtilen tarih ve saatte sizi salonumuzda bekliyoruz. Değişiklik olması durumunda lütfen bizimle iletişime geçin.',
    '',
    'King Barbers'
  ].join('\n');

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
};

function normalizeWhatsAppPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith('5')) digits = `90${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

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
    <button class="action-btn message" onclick="sendAppointmentMessage('${a.id}')">Mesaj Gönder</button>
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
