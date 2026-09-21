import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyC8TsniuLodonZfiiSr1Bi0dEGKVZJmVWk",
  authDomain:        "kingbarber-d5486.firebaseapp.com",
  projectId:         "kingbarber-d5486",
  storageBucket:     "kingbarber-d5486.firebasestorage.app",
  messagingSenderId: "1013120080170",
  appId:             "1:1013120080170:web:30df53a820d22e4708e653",
  measurementId:     "G-5JXS0TYHVT"
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

export const USERNAME_TO_EMAIL = {
  "fatihtuncer":     "fatihtuncer@kingbarber.local",
  "semsettinsancak": "semsettinsancak@kingbarber.local",
  "furkanormankaya": "furkanormankaya@kingbarber.local",
  "beratozbakir":    "beratozbakir@kingbarber.local",
};

export const DISPLAY_NAMES = {
  "fatihtuncer":     "Fatih Tuncer",
  "semsettinsancak": "Şemsettin Sancak",
  "furkanormankaya": "Furkan Ormankaya",
  "beratozbakir":    "Berat Özbakır",
};

export const USERNAME_TO_BARBER = {
  "fatihtuncer":     "fatihtuncer",
  "semsettinsancak": "usta1",
  "furkanormankaya": "usta2",
  "beratozbakir":    "usta3",
};
