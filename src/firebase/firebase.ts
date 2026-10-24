import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC3YowDKup7hzGCRsFMmf0Ut9IrSJ-9kYs",
  authDomain: "cricket-quiz-arena-4f83f.firebaseapp.com",
  projectId: "cricket-quiz-arena-4f83f",
  storageBucket: "cricket-quiz-arena-4f83f.firebasestorage.app",
  messagingSenderId: "1089558844747",
  appId: "1:1089558844747:web:e5ed54ec79ecba643704ce",
  measurementId: "G-KE15GRHG2Y",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);

export default app;