import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAGVsj2R1jPnpPG6qagbzSXmbeVvc-Lajo",
    authDomain: "corpr-ec92e.firebaseapp.com",
    projectId: "corpr-ec92e",
    storageBucket: "corpr-ec92e.firebasestorage.app",
    messagingSenderId: "563905451198"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Update Navbar on Auth State Change
onAuthStateChanged(auth, (user) => {
    const navLinks = document.querySelector('.nav-links');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    // Find if we already have the auth button
    let authBtnNav = document.getElementById('nav-auth-btn');
    let authBtnMob = document.getElementById('mob-auth-btn');

    if (user) {
        // User is signed in
        if (authBtnNav) {
            authBtnNav.textContent = 'Profile';
            authBtnNav.href = 'profile.html';
        } else if (navLinks) {
            authBtnNav = document.createElement('a');
            authBtnNav.id = 'nav-auth-btn';
            authBtnNav.href = 'profile.html';
            authBtnNav.textContent = 'Profile';
            navLinks.appendChild(authBtnNav);
        }

        if (authBtnMob) {
            authBtnMob.textContent = 'Profile';
            authBtnMob.href = 'profile.html';
        } else if (mobileMenu) {
            authBtnMob = document.createElement('a');
            authBtnMob.id = 'mob-auth-btn';
            authBtnMob.href = 'profile.html';
            authBtnMob.textContent = 'Profile';
            mobileMenu.appendChild(authBtnMob);
        }
    } else {
        // User is signed out
        if (authBtnNav) {
            authBtnNav.textContent = 'Log In';
            authBtnNav.href = 'auth.html';
        } else if (navLinks) {
            authBtnNav = document.createElement('a');
            authBtnNav.id = 'nav-auth-btn';
            authBtnNav.href = 'auth.html';
            authBtnNav.textContent = 'Log In';
            navLinks.appendChild(authBtnNav);
        }

        if (authBtnMob) {
            authBtnMob.textContent = 'Log In';
            authBtnMob.href = 'auth.html';
        } else if (mobileMenu) {
            authBtnMob = document.createElement('a');
            authBtnMob.id = 'mob-auth-btn';
            authBtnMob.href = 'auth.html';
            authBtnMob.textContent = 'Log In';
            mobileMenu.appendChild(authBtnMob);
        }
    }
});

export { app, auth, db };
