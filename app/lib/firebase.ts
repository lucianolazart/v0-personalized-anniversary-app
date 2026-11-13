// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWv7BcveYyLrunVPiC6-w7g73qHQSBv5g",
  authDomain: "aniversario-69645.firebaseapp.com",
  projectId: "aniversario-69645",
  storageBucket: "aniversario-69645.firebasestorage.app",
  messagingSenderId: "740496781708",
  appId: "1:740496781708:web:f002497b2b7452c78ee6a9"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };