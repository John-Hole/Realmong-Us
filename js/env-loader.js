/**
 * Environment Loader - Loads Firebase config from multiple sources
 * Project: Realmong Us
 * 
 * This file bridges between development (.env.local) and production (Vercel env vars)
 * 
 * Priority order:
 * 1. window.__FIREBASE_CONFIG__ (injected by Vercel or setup script)
 * 2. localStorage (development with manual setup)
 * 3. import.meta.env (Vite/modern build tools)
 * 4. Hardcoded fallback (DEPRECATED)
 */

export const loadFirebaseConfig = async () => {
  // Check if already loaded globally
  if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__) {
    return window.__FIREBASE_CONFIG__;
  }

  // Try localStorage (useful for development without .env support)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('firebase_config');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        window.__FIREBASE_CONFIG__ = config;
        return config;
      } catch (e) {
        console.error('Failed to parse stored Firebase config:', e);
      }
    }
  }

  // Try import.meta.env (Vite or similar)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      if (config.apiKey) {
        window.__FIREBASE_CONFIG__ = config;
        return config;
      }
    }
  } catch (e) {
    // import.meta not supported in some contexts
  }

  // Fallback: use hardcoded values (DEPRECATED - log warning)
  console.warn(
    '⚠️ WARNING: Using hardcoded Firebase config!\n' +
    'Set environment variables (.env.local or Vercel) instead.\n' +
    'Public API keys in source code are a security risk.\n' +
    'See .env.example for setup instructions.\n' +
    'Project: Realmong Us'
  );

  // Fallback to placeholder (project needs to be set up)
  return {
    apiKey: "AIzaSyBSbg2-cLl3SYG4odF2NYWWDtshoEv6lVo",
    authDomain: "realmong-us-g20b.firebaseapp.com",
    databaseURL: "https://realmong-us-g20b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "realmong-us-g20b",
    storageBucket: "realmong-us-g20b.firebasestorage.app",
    messagingSenderId: "200595572263",
    appId: "1:200595572263:web:62f7eeb3cca84df5b7f002",
    measurementId: "G-EB9910R23E"
  };
};

/**
 * Setup helper for development - store config in localStorage
 * Usage in browser console: setupFirebaseConfigDev(configObject)
 * 
 * Example:
 * setupFirebaseConfigDev({
 *   apiKey: "...",
 *   authDomain: "...",
 *   // ... other fields from .env.example
 * })
 */
export const setupFirebaseConfigDev = (config) => {
  if (!config.apiKey) {
    throw new Error('Invalid config: missing apiKey');
  }
  localStorage.setItem('firebase_config', JSON.stringify(config));
  window.__FIREBASE_CONFIG__ = config;
  console.log('✅ Firebase config saved to localStorage');
  console.log('Refresh the page to apply changes');
};

// Export for global access
if (typeof window !== 'undefined') {
  window.setupFirebaseConfigDev = setupFirebaseConfigDev;
}
