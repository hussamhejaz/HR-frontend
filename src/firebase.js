// src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * CRA (react-scripts) friendly config:
 * 1) Put your keys in .env like:
 *    REACT_APP_FB_API_KEY=...
 *    REACT_APP_FB_AUTH_DOMAIN=...
 *    REACT_APP_FB_DATABASE_URL=...
 *    REACT_APP_FB_PROJECT_ID=...
 *    REACT_APP_FB_STORAGE_BUCKET=...
 *    REACT_APP_FB_MESSAGING_SENDER_ID=...
 *    REACT_APP_FB_APP_ID=...
 *    REACT_APP_FB_MEASUREMENT_ID=...
 * 2) Or hardcode below if you prefer (not recommended).
 */
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY || "AIzaSyBtdBADi_XC3oy99tjBD7F2kjwbbjYh6fc",
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN || "hr-db-2860e.firebaseapp.com",
  databaseURL: process.env.REACT_APP_FB_DATABASE_URL || "https://hr-db-2860e-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FB_PROJECT_ID || "hr-db-2860e",
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET || "hr-db-2860e.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID || "514499745340",
  appId: process.env.REACT_APP_FB_APP_ID || "1:514499745340:web:62002418be57ada6b7d539",
  measurementId: process.env.REACT_APP_FB_MEASUREMENT_ID || "G-QJW917ZXE1",
};

let app;
export function getFirebaseApp() {
  if (!app) app = getApps()[0] || initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

// default export is optional; some code may import default
export default getFirebaseApp;
