// ============================================
// admin-login.js — Hardcoded giriş sistemi
// ============================================

import { USERS } from "./firebase-config.js";

const SESSION_KEY = "kb_admin_session";
const USER_KEY    = "kb_admin_user";

// Zaten giriş yapılmışsa direkt yönlendir
if (sessionStorage.getItem(SESSION_KEY) === "authenticated") {
  window.location.href = "admin.html";
}

const form          = document.getElementById('loginForm');
const userInput     = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn      = document.getElementById('loginBtn');
const loginError    = document.getElementById('loginError');
const togglePwd     = document.getElementById('togglePassword');

// Şifreyi göster/gizle
togglePwd.addEventListener('click', () => {
  const isText = passwordInput.type === 'text';
  passwordInput.type = isText ? 'password' : 'text';
  togglePwd.querySelector('.eye-show').style.display = isText ? ''     : 'none';
  togglePwd.querySelector('.eye-hide').style.display = isText ? 'none' : '';
});

// Giriş formu
form.addEventListener('submit', e => {
  e.preventDefault();
  clearError();
  setLoading(true);

  const user     = userInput.value.trim();
  const password = passwordInput.value;

  // Kısa gecikme — daha gerçekçi hissettirir
  setTimeout(() => {
    const account = USERS[user];
    if (account && account.password === password) {
      sessionStorage.setItem(SESSION_KEY, "authenticated");
      sessionStorage.setItem(USER_KEY, account.displayName);
      window.location.href = "admin.html";
    } else {
      setLoading(false);
      showError("Kullanıcı adı veya şifre hatalı.");
      passwordInput.value = "";
      passwordInput.focus();
    }
  }, 600);
});

function setLoading(loading) {
  loginBtn.disabled = loading;
  loginBtn.querySelector('.login-btn-text').style.display    = loading ? 'none' : '';
  loginBtn.querySelector('.login-btn-spinner').style.display = loading ? 'flex' : 'none';
}

function showError(msg) {
  loginError.textContent   = msg;
  loginError.style.display = 'block';
}

function clearError() {
  loginError.textContent   = '';
  loginError.style.display = 'none';
}
