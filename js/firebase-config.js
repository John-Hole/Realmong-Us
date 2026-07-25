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
    localStorage.setItem('realmong_user_cache', JSON.stringify({
      uid: user.uid,
      displayName,
      email: displayEmail,
      isAnonymous: false,
      loginTime: now,
      expiresAt: now + SEVEN_DAYS_MS
    }));
  } catch (e) {}
}

function clearUserCache() {
  try {
    localStorage.removeItem('realmong_user_cache');
  } catch (e) {}
}

export function ensureAuth() {
  if (authPromise) return authPromise;
  authPromise = new Promise((resolve) => {
    if (auth.currentUser) {
      if (!auth.currentUser.isAnonymous) {
        cacheRealUser(auth.currentUser);
      } else {
        clearUserCache();
      }
      resolve(auth.currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        if (!user.isAnonymous) {
          cacheRealUser(user);
        } else {
          clearUserCache();
        }
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          clearUserCache();
          resolve(cred.user);
        } catch (e) {
          console.error("Auto sign-in failed:", e);
          clearUserCache();
          resolve(null);
        }
      }
    });
  });
  return authPromise;
}

export { db, auth, app, firebaseConfig };
