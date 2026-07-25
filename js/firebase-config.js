import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Firebase Configuration for realmong-us-g20b
const firebaseConfig = {
  apiKey: "AIzaSyDJvLk7jYzBn5YoNIUlhTgwl0TAFMcpxVc",
  authDomain: "realmong-us-g20b.firebaseapp.com",
  databaseURL: "https://realmong-us-g20b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "realmong-us-g20b",
  storageBucket: "realmong-us-g20b.firebasestorage.app",
  messagingSenderId: "200595572263",
  appId: "1:200595572263:web:62f7eeb3cca84df5b7f002",
  measurementId: "G-EB9910R23E"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Explicitly set persistent storage across browser sessions (at least 7 days / permanent until logout)
setPersistence(auth, browserLocalPersistence).catch((e) => {
  console.warn("Firebase auth setPersistence error:", e);
});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

let authPromise = null;

function cacheRealUser(user) {
  try {
    const now = Date.now();
    const displayName = user.displayName || user.email || 'Utente';
    const displayEmail = user.email || user.displayName || 'Utente';
    
    // Maintain original login expiration window if already set
    let loginTime = now;
    let expiresAt = now + SEVEN_DAYS_MS;
    const existing = localStorage.getItem('realmong_user_cache');
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed && parsed.uid === user.uid && parsed.expiresAt && Date.now() < parsed.expiresAt) {
        loginTime = parsed.loginTime || now;
        expiresAt = parsed.expiresAt;
      }
    }

    localStorage.setItem('realmong_user_cache', JSON.stringify({
      uid: user.uid,
      displayName,
      email: displayEmail,
      isAnonymous: false,
      loginTime,
      expiresAt
    }));
  } catch (e) {}
}

function clearUserCache() {
  try {
    // Only remove cache if expired or explicitly called
    const existing = localStorage.getItem('realmong_user_cache');
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt) {
        return; // Valid within 7 days, keep cache
      }
    }
    localStorage.removeItem('realmong_user_cache');
  } catch (e) {}
}

export async function ensureAuth() {
  if (auth.currentUser) {
    if (!auth.currentUser.isAnonymous) {
      cacheRealUser(auth.currentUser);
    }
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        if (!user.isAnonymous) {
          cacheRealUser(user);
        }
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user);
        } catch (e) {
          console.error("Auto sign-in failed:", e);
          resolve(null);
        }
      }
    });
  });
}

export { db, auth, app, firebaseConfig };
