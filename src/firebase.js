// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBtdBADi_XC3oy99tjBD7F2kjwbbjYh6fc",
  authDomain: "hr-db-2860e.firebaseapp.com",
  databaseURL: "https://hr-db-2860e-default-rtdb.firebaseio.com",
  projectId: "hr-db-2860e",
  storageBucket: "hr-db-2860e.firebasestorage.app",
  messagingSenderId: "514499745340",
  appId: "1:514499745340:web:62002418be57ada6b7d539",
  measurementId: "G-QJW917ZXE1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);