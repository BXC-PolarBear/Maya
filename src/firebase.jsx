import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5IN0d5Y7FNjE2lrZjVzJ8itu6KBXMGWE",
  authDomain: "maya-9a168.firebaseapp.com",
  projectId: "maya-9a168",
  storageBucket: "maya-9a168.firebasestorage.app",
  messagingSenderId: "604233702653",
  appId: "1:604233702653:web:f303ef708d0ad9c49ef294",
  measurementId: "G-0T1V5XL8LK"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);