// ============================================
// firebase-config.js — Firebase yapılandırması
// Firebase konsolundan aldığınız değerleri
// aşağıdaki alanlara yapıştırın.
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyC8TsniuLodonZfiiSr1Bi0dEGKVZJmVWk",
  authDomain:        "kingbarber-d5486.firebaseapp.com",
  projectId:         "kingbarber-d5486",
  storageBucket:     "kingbarber-d5486.firebasestorage.app",
  messagingSenderId: "1013120080170",
  appId:             "1:1013120080170:web:30df53a820d22e4708e653",
  measurementId:     "G-5JXS0TYHVT"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// ── Berber giriş bilgileri ──────────────────────
export const USERS = {
  "fatihtuncer":      { password: "Buglemsu.2015",          displayName: "Fatih Tuncer" },
  "semsettinsancak":  { password: "Semsettin.1905",       displayName: "Şemsettin Sancak" },
  "furkanormankaya":  { password: "Furkan.1907",    displayName: "Furkan Ormankaya" },
  "beratozbakir":     { password: "Berat3131", displayName: "Berat Özbakır" },
};
