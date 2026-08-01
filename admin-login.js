// ============================================
// admin-login.js — Hardcoded giriş sistemi
// ============================================

import { auth, USERNAME_TO_EMAIL, DISPLAY_NAMES } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const USER_KEY = "kb_admin_user";

// Zaten giriş yapılmışsa direkt yönlendir
onAuthStateChanged(auth, user => {
  if (user) window.location.href = "admin.html";
});

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
form.addEventListener('submit', async e => {
  e.preventDefault();
  clearError();
  setLoading(true);

  const user     = userInput.value.trim();
  const password = passwordInput.value;
  const email    = USERNAME_TO_EMAIL[user];

  if (!email) {
    setLoading(false);
    showError("Kullanıcı adı veya şifre hatalı.");
    passwordInput.value = "";
    passwordInput.focus();
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem(USER_KEY, DISPLAY_NAMES[user] || user);
    window.location.href = "admin.html";
  } catch (err) {
    setLoading(false);
    showError("Kullanıcı adı veya şifre hatalı.");
    passwordInput.value = "";
    passwordInput.focus();
  }
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
