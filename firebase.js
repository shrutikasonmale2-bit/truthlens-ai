import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp, 
  doc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVKgimpr63ghhRQl-enrh-v7dx3zQCQ_w",
  authDomain: "patientdata-a6358.firebaseapp.com",
  databaseURL: "https://patientdata-a6358-default-rtdb.firebaseio.com",
  projectId: "patientdata-a6358",
  storageBucket: "patientdata-a6358.firebasestorage.app",
  messagingSenderId: "575579871883",
  appId: "1:575579871883:web:7446c5c94d4e346d78128e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp, 
  doc, 
  deleteDoc 
};
