// ============================================
// script.js — King Barber ana sayfa JS
// ES Module — Firebase Firestore entegrasyonu
// ============================================

import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.mjs";
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firestore: dolu saatleri güncelle (berber bazlı) ──
const TOTAL_BARBERS = 4;

async function updateBusySlots(dateStr, selectedBarber = 'any') {
  const slotsContainer    = document.getElementById('timeSlots');
  const selectedTimeInput = document.getElementById('selectedTime');
  if (!slotsContainer) return;

  // Tüm slot'ları sıfırla
  slotsContainer.querySelectorAll('.time-slot').forEach(slot => {
    slot.classList.remove('busy', 'selected');
    slot.disabled = false;
  });
  if (selectedTimeInput) selectedTimeInput.value = '';
  if (!dateStr) return;

  slotsContainer.style.opacity       = '0.45';
  slotsContainer.style.pointerEvents = 'none';

  try {
    const q        = query(collection(db, 'appointments'), where('date', '==', dateStr));
    const snapshot = await getDocs(q);

    // İptal edilmişleri çıkar, saate göre grupla: { "11:30": ["ahmet", "any"], ... }
    const byTime = {};
    snapshot.docs.forEach(d => {
      const data = d.data();
      if (data.status === 'rejected') return;
      if (!byTime[data.time]) byTime[data.time] = [];
      byTime[data.time].push(data.barber);
    });

    const busyTimes = new Set();

    Object.entries(byTime).forEach(([time, barbers]) => {
      if (selectedBarber === 'any') {
        // "Fark Etmez" seçiliyse: toplam randevu sayısı usta sayısına ulaştıysa dolu
        if (barbers.length >= TOTAL_BARBERS) busyTimes.add(time);
      } else {
        // Belirli usta seçiliyse: sadece o ustanın randevusu varsa dolu
        if (barbers.includes(selectedBarber)) busyTimes.add(time);
      }
    });

    slotsContainer.querySelectorAll('.time-slot').forEach(slot => {
      if (busyTimes.has(slot.dataset.time)) {
        slot.classList.add('busy');
        slot.disabled = true;
      }
    });
  } catch (err) {
    console.error('Müsaitlik sorgulanamadı:', err);
  } finally {
    slotsContainer.style.opacity       = '';
    slotsContainer.style.pointerEvents = '';
  }
}

// ── Smooth Scroll (Lenis) ──────────────────────
const lenis = new Lenis({
  duration:  1.4,
  easing:    t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  touchMultiplier: 1.8,
  infinite:  false,
});

function rafLoop(time) {
  lenis.raf(time);
  requestAnimationFrame(rafLoop);
}
requestAnimationFrame(rafLoop);

// Lenis ile anchor scroll uyumu — native scroll yerine lenis kullanır
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {

  // ── Custom Cursor ──
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  let mouseX = 0, mouseY = 0, followerX = 0, followerY = 0;

  if (cursor && follower) {
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top  = mouseY + 'px';
    });

    function animateFollower() {
      followerX += (mouseX - followerX) * 0.12;
      followerY += (mouseY - followerY) * 0.12;
      follower.style.left = followerX + 'px';
      follower.style.top  = followerY + 'px';
      requestAnimationFrame(animateFollower);
    }
    animateFollower();

    document.querySelectorAll('a, button, .service-card, .time-slot, .barber-pill').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.transform   = 'translate(-50%, -50%) scale(2)';
        follower.style.transform = 'translate(-50%, -50%) scale(1.5)';
        follower.style.opacity   = '0.3';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.transform   = 'translate(-50%, -50%) scale(1)';
        follower.style.transform = 'translate(-50%, -50%) scale(1)';
        follower.style.opacity   = '0.5';
      });
    });
  }

  // ── Navbar scroll ──
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });

  // ── Hamburger Menu ──
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // Anchor scroll — Lenis modül seviyesinde hallediliyor

  // ── Hero Particles ──
  const particlesContainer = document.getElementById('particles');
  if (particlesContainer) {
    for (let i = 0; i < 40; i++) {
      const p    = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 3 + 1;
      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${Math.random() * 100}%;
        animation-duration: ${Math.random() * 15 + 10}s;
        animation-delay: ${Math.random() * 10}s;
      `;
      particlesContainer.appendChild(p);
    }
  }

  // ── Counter Animation ──
  function animateCounter(el) {
    const target   = parseInt(el.dataset.target);
    const duration = 2000;
    const step     = target / (duration / 16);
    let current    = 0;
    const timer    = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = Math.floor(current);
    }, 16);
  }

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-number[data-target]').forEach(el => counterObserver.observe(el));

  // ── Scroll Reveal (AOS) ──
  const aosObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('aos-visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('[data-aos]').forEach(el => aosObserver.observe(el));

  // ── Testimonials Slider ──
  const track         = document.getElementById('testimonialsTrack');
  const dotsContainer = document.getElementById('testiDots');
  const prevBtn       = document.getElementById('testiPrev');
  const nextBtn       = document.getElementById('testiNext');

  if (track) {
    const clip  = track.parentElement; // .testimonials-clip
    const cards = track.querySelectorAll('.testimonial-card');
    let current = 0;
    let perView, cardW, maxIndex;

    // Kart genişliğini clip wrapper'dan piksel olarak hesapla
    function calcSizes() {
      perView  = window.innerWidth <= 768 ? 1 : window.innerWidth <= 1024 ? 2 : 3;
      cardW    = (clip.offsetWidth - (24 * (perView - 1))) / perView;
      maxIndex = Math.max(0, cards.length - perView);

      // Her karta kesin genişlik ata — overflow'u engeller
      cards.forEach(c => {
        c.style.minWidth = cardW + 'px';
        c.style.width    = cardW + 'px';
      });
    }

    // Dot'ları oluştur
    function buildDots() {
      dotsContainer.innerHTML = '';
      for (let i = 0; i <= maxIndex; i++) {
        const dot = document.createElement('button');
        dot.className = 'testi-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      }
    }

    function goTo(index) {
      current = Math.max(0, Math.min(index, maxIndex));
      track.style.transform = `translateX(-${current * (cardW + 24)}px)`;
      dotsContainer.querySelectorAll('.testi-dot').forEach((d, i) => d.classList.toggle('active', i === current));
    }

    // İlk kurulum
    calcSizes();
    buildDots();

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));

    let autoSlide = setInterval(() => goTo(current < maxIndex ? current + 1 : 0), 4500);
    track.addEventListener('mouseenter', () => clearInterval(autoSlide));
    track.addEventListener('mouseleave', () => {
      autoSlide = setInterval(() => goTo(current < maxIndex ? current + 1 : 0), 4500);
    });

    // Ekran boyutu değişince yeniden hesapla
    window.addEventListener('resize', () => {
      calcSizes();
      buildDots();
      goTo(0);
    });
  }

  // ── Time Slots — tıklama dinleyicisi (event delegation) ──
  const slotsContainer    = document.getElementById('timeSlots');
  const selectedTimeInput = document.getElementById('selectedTime');

  slotsContainer?.addEventListener('click', e => {
    const slot = e.target.closest('.time-slot');
    if (!slot || slot.classList.contains('busy')) return;
    slotsContainer.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
    if (selectedTimeInput) selectedTimeInput.value = slot.dataset.time;
  });

  // ── Custom Datepicker ──
  const dateInput = document.getElementById('appointmentDate');
  initDatepicker(dateInput);

  // Seçili berberi oku
  function getSelectedBarber() {
    return document.querySelector('input[name="barber"]:checked')?.value || 'any';
  }

  // Tarih veya berber değişince slot'ları güncelle
  function refreshSlots() {
    const date   = dateInput?.value;
    const barber = getSelectedBarber();
    if (date) updateBusySlots(date, barber);
  }

  dateInput?.addEventListener('change', refreshSlots);

  // Berber radio butonları değişince de güncelle
  document.querySelectorAll('input[name="barber"]').forEach(radio => {
    radio.addEventListener('change', refreshSlots);
  });

  // ── Appointment Form — Firebase Firestore kayıt ──
  const form       = document.getElementById('appointmentForm');
  const modal      = document.getElementById('successModal');
  const closeModal = document.getElementById('closeModal');

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const selectedSlot = document.querySelector('.time-slot.selected');
      if (!selectedSlot) {
        highlightTimeError();
        return;
      }

      const btn = form.querySelector('.btn-submit');
      setSubmitting(btn, true);

      // Form verilerini topla
      const formData = {
        name:      form.querySelector('input[type="text"]').value.trim(),
        phone:     form.querySelector('input[type="tel"]').value.trim(),
        service:   form.querySelector('select').value,
        barber:    form.querySelector('input[name="barber"]:checked')?.value || 'any',
        date:      document.getElementById('appointmentDate').value,
        time:      selectedSlot.dataset.time,
        notes:     form.querySelector('textarea').value.trim(),
        status:    'pending',       // pending | approved | rejected | completed
        createdAt: serverTimestamp()
      };

      try {
        // Son kontrol: o saat hâlâ bu berber için boş mu?
        const checkQ    = query(
          collection(db, 'appointments'),
          where('date', '==', formData.date),
          where('time', '==', formData.time)
        );
        const checkSnap = await getDocs(checkQ);
        const existing  = checkSnap.docs
          .map(d => d.data())
          .filter(d => d.status !== 'rejected');

        let conflict = false;
        if (formData.barber === 'any') {
          conflict = existing.length >= TOTAL_BARBERS;
        } else {
          conflict = existing.some(d => d.barber === formData.barber);
        }

        if (conflict) {
          setSubmitting(btn, false);
          showFormError('Bu saat az önce doldu. Lütfen başka bir saat seçin.');
          await updateBusySlots(formData.date, formData.barber);
          return;
        }

        await addDoc(collection(db, 'appointments'), formData);

        // Başarılı
        form.reset();
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        modal.classList.add('active');
      } catch (err) {
        console.error('Randevu kaydedilemedi:', err);
        showFormError('Bir hata oluştu, lütfen tekrar deneyin.');
      } finally {
        setSubmitting(btn, false);
      }
    });
  }

  function setSubmitting(btn, loading) {
    btn.disabled = loading;
    btn.querySelector('.btn-text').textContent = loading ? 'Gönderiliyor...' : 'Randevu Onayla';
  }

  function highlightTimeError() {
    const slotsContainer = document.getElementById('timeSlots');
    slotsContainer.style.outline      = '2px solid rgba(255,80,80,0.6)';
    slotsContainer.style.borderRadius = '8px';
    slotsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { slotsContainer.style.outline = ''; }, 2200);
  }

  function showFormError(msg) {
    let errEl = document.getElementById('formError');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.id = 'formError';
      errEl.style.cssText = 'color:#ff6b6b;font-size:.85rem;text-align:center;margin-top:12px;';
      form.appendChild(errEl);
    }
    errEl.textContent = msg;
    setTimeout(() => { errEl.textContent = ''; }, 4000);
  }

  if (closeModal) closeModal.addEventListener('click', () => modal.classList.remove('active'));
  if (modal)      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

  // ── Marquee duplicate ──
  const marqueeTrack = document.querySelector('.marquee-track');
  if (marqueeTrack) marqueeTrack.innerHTML += marqueeTrack.innerHTML;

  // ── Active nav highlight ──
  const sections   = document.querySelectorAll('section[id]');
  const navLinksAll = document.querySelectorAll('.nav-link');
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinksAll.forEach(link => {
          link.classList.toggle('active-nav', link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(sec => navObserver.observe(sec));

  // ── Service card tilt ──
  document.querySelectorAll('.service-card').forEach(card => {
    card.style.transformStyle = 'preserve-3d';
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x    = ((e.clientX - rect.left) / rect.width  - 0.5) * 6;
      const y    = ((e.clientY - rect.top)  / rect.height - 0.5) * -6;
      card.style.transform = `translateY(-6px) rotateX(${y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(-6px)';
      setTimeout(() => { card.style.transform = ''; }, 350);
    });
  });

  // ── Gallery hover parallax ──
  document.querySelectorAll('.gallery-placeholder').forEach(item => {
    item.addEventListener('mousemove', e => {
      const rect = item.getBoundingClientRect();
      const x    = (e.clientX - rect.left - rect.width  / 2) / rect.width  * 12;
      const y    = (e.clientY - rect.top  - rect.height / 2) / rect.height * 12;
      item.style.backgroundPosition = `calc(50% + ${x}px) calc(50% + ${y}px)`;
    });
    item.addEventListener('mouseleave', () => { item.style.backgroundPosition = ''; });
  });

});

// ── Custom Datepicker ──────────────────────────────
function initDatepicker(hiddenInput) {
  if (!hiddenInput) return;

  const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  const display  = document.getElementById('datepickerDisplay');
  const dropdown = document.getElementById('datepickerDropdown');
  const titleEl  = document.getElementById('dpTitle');
  const grid     = document.getElementById('dpGrid');
  const prevBtn  = document.getElementById('dpPrev');
  const nextBtn  = document.getElementById('dpNext');
  const todayBtn = document.getElementById('dpToday');
  if (!display || !dropdown) return;

  const now      = new Date();
  const todayStr = toYMD(now);
  let viewYear   = now.getFullYear();
  let viewMonth  = now.getMonth();
  let selected   = null;

  function toYMD(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function renderGrid() {
    titleEl.textContent = `${TR_MONTHS[viewMonth]} ${viewYear}`;
    grid.innerHTML = '';

    const first     = new Date(viewYear, viewMonth, 1);
    // Pazartesi bazlı (0=Pt … 6=Pa)
    let startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays    = new Date(viewYear, viewMonth, 0).getDate();

    // Önceki ay dolgu
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = document.createElement('div');
      d.className = 'dp-day dp-other';
      d.textContent = prevDays - i;
      grid.appendChild(d);
    }

    // Bu ayın günleri
    for (let day = 1; day <= daysInMonth; day++) {
      const d    = document.createElement('div');
      const ymd  = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const past = ymd < todayStr;
      d.className = 'dp-day' + (past ? ' dp-disabled' : '') + (ymd === todayStr ? ' dp-today' : '') + (ymd === selected ? ' dp-selected' : '');
      d.textContent = day;
      if (!past) {
        d.addEventListener('click', () => selectDate(ymd));
      }
      grid.appendChild(d);
    }

    // Sonraki ay dolgu
    const filled = startOffset + daysInMonth;
    const remain = filled % 7 === 0 ? 0 : 7 - (filled % 7);
    for (let i = 1; i <= remain; i++) {
      const d = document.createElement('div');
      d.className = 'dp-day dp-other';
      d.textContent = i;
      grid.appendChild(d);
    }
  }

  function selectDate(ymd) {
    selected = ymd;
    hiddenInput.value = ymd;
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));

    const [y, m, day] = ymd.split('-');
    const dateObj = new Date(+y, +m - 1, +day);
    document.getElementById('datepickerText').textContent =
      `${String(+day).padStart(2,'0')} ${TR_MONTHS[+m-1]} ${y}`;
    display.classList.add('has-value');
    close();
    renderGrid();
  }

  function open() {
    renderGrid();
    dropdown.classList.add('open');
    display.classList.add('open');
  }

  function close() {
    dropdown.classList.remove('open');
    display.classList.remove('open');
  }

  display.addEventListener('click', () => {
    dropdown.classList.contains('open') ? close() : open();
  });

  prevBtn.addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderGrid();
  });

  nextBtn.addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderGrid();
  });

  todayBtn.addEventListener('click', () => selectDate(todayStr));

  document.addEventListener('click', e => {
    if (!document.getElementById('customDatepicker')?.contains(e.target)) close();
  });
}
