import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyDtXS_4meIBVh7L1Psz2VCgV9Kq0QnD3k8",
    databaseURL: "https://studyspheree-1da28-default-rtdb.firebaseio.com/",
    authDomain: "studyspheree-1da28.firebaseapp.com",
    projectId: "studyspheree-1da28",
    storageBucket: "studyspheree-1da28.firebasestorage.app",
    messagingSenderId: "520045957983",
    appId: "1:520045957983:web:8b57fda16800c10d16dcea"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getDatabase(app);