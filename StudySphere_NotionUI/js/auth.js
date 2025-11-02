import { auth, provider, db } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { ref, set, get } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

const loginBtn = document.getElementById('loginBtn');
const emailSignupBtn = document.getElementById('emailSignupBtn');
const emailLoginBtn = document.getElementById('emailLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

async function ensureUserInDB(user) {
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
        set(userRef, { name: user.displayName || user.email, email: user.email });
    }
}

if (loginBtn) loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then(async res => {
            const user = res.user;
            await ensureUserInDB(user);
            localStorage.setItem('user', JSON.stringify(user));
            window.location.href='dashboard.html';
        }).catch(err=>alert(err.message));
});

if (emailSignupBtn) emailSignupBtn.addEventListener('click', async () => {
    const email = prompt('Email:'), password = prompt('Password:');
    if(!email||!password) return;
    createUserWithEmailAndPassword(auth,email,password).then(async res=>{
        const user = res.user;
        await ensureUserInDB(user);
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href='dashboard.html';
    }).catch(err=>alert(err.message));
});

if (emailLoginBtn) emailLoginBtn.addEventListener('click', async () => {
    const email = prompt('Email:'), password = prompt('Password:');
    if(!email||!password) return;
    signInWithEmailAndPassword(auth,email,password).then(async res=>{
        const user = res.user;
        await ensureUserInDB(user);
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href='dashboard.html';
    }).catch(err=>alert(err.message));
});

if (logoutBtn) logoutBtn.addEventListener('click',()=>{signOut(auth).then(()=>{localStorage.removeItem('user');window.location.href='index.html';})});

onAuthStateChanged(auth,user=>{
    const path=window.location.pathname.split('/').pop();
    if(!user && path!=='index.html') window.location.href='index.html';
});
