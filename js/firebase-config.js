// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// TODO: Replace the following with your app's Firebase project configuration
// You can find these in the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "AIzaSyDP523x9SZZ6MVkvL3tVbuv5SBpbzVsxr4",
  authDomain: "grest-among-us.firebaseapp.com",
  projectId: "grest-among-us",
  storageBucket: "grest-among-us.firebasestorage.app",
  messagingSenderId: "113254807143",
  appId: "1:113254807143:web:f9491251c65d4d717b46c2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
