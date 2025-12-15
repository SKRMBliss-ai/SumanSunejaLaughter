import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// ==========================================
// FIREBASE CONFIGURATION
// Project: sumansunejalaughter-178eb
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyAdbX_vlYt9Nh3U9s5cxdye7td9P5XgDrI",
  authDomain: "sumansunejalaughter-178eb.firebaseapp.com",
  projectId: "sumansunejalaughter-178eb",
  storageBucket: "sumansunejalaughter-178eb.firebasestorage.app",
  messagingSenderId: "498377085294",
  appId: "1:498377085294:web:210a6402b37595a532317f",
  measurementId: "G-0NQ0GZD6HE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Initialize Analytics conditionally to prevent crashes (e.g. ad blockers)
let analyticsInstance = null;
if (typeof window !== 'undefined') {
  try {
    analyticsInstance = getAnalytics(app);
  } catch (e) {
    console.warn("Firebase Analytics failed to load:", e);
  }
}
export const analytics = analyticsInstance;

