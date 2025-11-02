
// Using the config from your other files
const firebaseConfig = {
    apiKey: "AIzaSyDtXS_4meIBVh7L1Psz2VCgV9Kq0QnD3k8",
    authDomain: "studyspheree-1da28.firebaseapp.com",
    databaseURL: "https://studyspheree-1da28-default-rtdb.firebaseio.com/",
    projectId: "studyspheree-1da28",
    storageBucket: "studyspheree-1da28.firebasestorage.app",
    messagingSenderId: "520045957983",
    appId: "1:520045957983:web:8b57fda16800c10d16dcea"
};

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
    getAuth,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    updateProfile // <-- IMPORTED
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Modal Elements
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const alertModal = document.getElementById('alertModal');
const alertMessage = document.getElementById('alertMessage');

// Buttons
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const closeLogin = document.getElementById('closeLogin');
const closeSignup = document.getElementById('closeSignup');
const loginSubmit = document.getElementById('loginSubmit');
const signupSubmit = document.getElementById('signupSubmit');
const getStarted = document.getElementById('getStarted');
const googleLogin = document.getElementById('googleLogin');
const alertCloseBtn = document.getElementById('alertCloseBtn');

// --- Custom Alert Function ---
function showAlert(message) {
    alertMessage.textContent = message;
    alertModal.style.display = "flex";
}
alertCloseBtn.onclick = () => (alertModal.style.display = "none");

// ---------- Show/Hide Modals ----------
loginBtn.onclick = () => (loginModal.style.display = "flex");
signupBtn.onclick = () => (signupModal.style.display = "flex");
closeLogin.onclick = () => (loginModal.style.display = "none");
closeSignup.onclick = () => (signupModal.style.display = "none");

window.onclick = e => {
    if (e.target === loginModal) loginModal.style.display = "none";
    if (e.target === signupModal) signupModal.style.display = "none";
    if (e.target === alertModal) alertModal.style.display = "none"; // Close alert on overlay click
};

// ---------- Email Login ----------
loginSubmit.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!email || !password) {
        showAlert("Please enter email and password.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'dashboard.html';
    } catch (error) {
        showAlert(error.message);
    }
});

// ---------- Email Signup (Updated) ----------
signupSubmit.addEventListener('click', async () => {
    const name = document.getElementById('signupName').value.trim(); // <-- GET NAME
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    if (!name || !email || !password) {
        showAlert("Please fill in all fields.");
        return;
    }

    try {
        // 1. Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // 2. Update profile with name
        await updateProfile(userCredential.user, {
            displayName: name
        });

        // 3. Redirect
        window.location.href = 'dashboard.html';
    } catch (error) {
        showAlert(error.message);
    }
});

// ---------- Google Login ----------
googleLogin.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        window.location.href = 'dashboard.html';
    } catch (err) {
        showAlert(err.message);
    }
});

// ---------- Get Started ----------
getStarted.addEventListener('click', () => {
    // 'Get Started' now opens the signup modal
    signupModal.style.display = "flex";
});
