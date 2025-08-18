import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase configuration
// Note: Replace these with your actual Firebase config values
const firebaseConfig = {
  apiKey: "AIzaSyB502ULBhv7VqK4T8_Xn86ZxveUpiq3hms",
  authDomain: "genevision-app.firebaseapp.com",
  projectId: "genevision-app",
  storageBucket: "genevision-app.firebasestorage.app",
  messagingSenderId: "3352107010",
  appId: "1:3352107010:web:0fbc82ccf9663fec262f1b",
  measurementId: "G-M2DFNJJTS5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app