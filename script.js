// ============================================
// script.js — King Barber ana sayfa JS
// ES Module — Firebase Firestore entegrasyonu
// ============================================

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

  // ── Smooth scroll ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

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
  const track        = document.getElementById('testimonialsTrack');
  const dotsContainer = document.getElementById('testiDots');
  const prevBtn      = document.getElementById('testiPrev');
  const nextBtn      = document.getElementById('testiNext');

  if (track) {
    const cards    = track.querySelectorAll('.testimonial-card');
    let current    = 0;
    let perView    = window.innerWidth <= 768 ? 1 : window.innerWidth <= 1024 ? 2 : 3;
    const maxIndex = Math.max(0, cards.length - perView);

    cards.forEach((_, i) => {
      if (i <= maxIndex) {
        const dot = document.createElement('button');
        dot.className = 'testi-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      }
    });

    function goTo(index) {
      current = Math.max(0, Math.min(index, maxIndex));
      const cardWidth = cards[0].offsetWidth + 24;
      track.style.transform = `translateX(-${current * cardWidth}px)`;
      dotsContainer.querySelectorAll('.testi-dot').forEach((d, i) => d.classList.toggle('active', i === current));
    }

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));

    let autoSlide = setInterval(() => goTo(current < maxIndex ? current + 1 : 0), 4500);
    track.addEventListener('mouseenter', () => clearInterval(autoSlide));
    track.addEventListener('mouseleave', () => {
      autoSlide = setInterval(() => goTo(current < maxIndex ? current + 1 : 0), 4500);
    });
    window.addEventListener('resize', () => {
      perView = window.innerWidth <= 768 ? 1 : window.innerWidth <= 1024 ? 2 : 3;
      goTo(0);
    });
  }

  // ── Time Slots ──
  const timeSlots       = document.querySelectorAll('.time-slot:not(.busy)');
  const selectedTimeInput = document.getElementById('selectedTime');
  timeSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      timeSlots.forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      if (selectedTimeInput) selectedTimeInput.value = slot.dataset.time;
    });
  });

  // ── Min date ──
  const dateInput = document.getElementById('appointmentDate');
  if (dateInput) {
    const today = new Date();
    dateInput.min = today.toISOString().split('T')[0];
  }

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
        date:      form.querySelector('input[type="date"]').value,
        time:      selectedSlot.dataset.time,
        notes:     form.querySelector('textarea').value.trim(),
        status:    'pending',       // pending | approved | rejected | completed
        createdAt: serverTimestamp()
      };

      try {
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
