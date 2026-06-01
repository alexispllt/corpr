import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
const loginCard = document.getElementById('login-card');
const signupCard = document.getElementById('signup-card');
const resetCard = document.getElementById('reset-card');

const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const forgotPwdBtn = document.getElementById('forgot-password-link');
const backToLoginBtn = document.getElementById('back-to-login');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const resetForm = document.getElementById('reset-form');

const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const resetMsg = document.getElementById('reset-msg');

// Toggle UI
showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginCard.style.display = 'none';
    signupCard.style.display = 'block';
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signupCard.style.display = 'none';
    loginCard.style.display = 'block';
});

forgotPwdBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginCard.style.display = 'none';
    resetCard.style.display = 'block';
});

backToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetCard.style.display = 'none';
    loginCard.style.display = 'block';
});

// Helper: Show Error
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
}

// Check username availability
async function isUsernameAvailable(username) {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);
    return snapshot.empty;
}

// Format username
function formatUsername(input) {
    let clean = input.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!clean.startsWith('@')) clean = '@' + clean;
    return clean;
}

// Create user document if it doesn't exist (for SSO or new signups)
async function ensureUserDocument(user, additionalData = {}) {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
        const defaultUsername = '@' + user.uid.substring(0, 6);
        const username = additionalData.username || defaultUsername;
        const fullName = additionalData.fullName || user.displayName || 'Utilisateur';

        const userData = {
            uid: user.uid,
            fullName: fullName,
            username: username,
            email: user.email || '',
            joinDate: new Date(),
            subscriptionTier: "Free"
        };
        await setDoc(userRef, userData);
    }
}

// ---------------------------
// Login Flow
// ---------------------------
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    
    try {
        btn.disabled = true;
        btn.textContent = 'Logging in...';
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'profile.html';
    } catch (error) {
        console.error(error);
        showError(loginError, error.message);
        btn.disabled = false;
        btn.textContent = 'Log In';
    }
});

// ---------------------------
// Signup Flow
// ---------------------------
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    let username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const btn = document.getElementById('signup-btn');

    username = formatUsername(username);

    try {
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        const available = await isUsernameAvailable(username);
        if (!available) {
            throw new Error("Username is already taken.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await ensureUserDocument(userCredential.user, {
            fullName: name,
            username: username
        });

        window.location.href = 'profile.html';
    } catch (error) {
        console.error(error);
        showError(signupError, error.message);
        btn.disabled = false;
        btn.textContent = 'Sign Up';
    }
});

// ---------------------------
// Reset Password
// ---------------------------
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const btn = document.getElementById('reset-btn');

    try {
        btn.disabled = true;
        btn.textContent = 'Sending...';
        await sendPasswordResetEmail(auth, email);
        
        resetMsg.style.color = '#2ECC71';
        resetMsg.textContent = 'Password reset email sent!';
        resetMsg.style.display = 'block';
        
        setTimeout(() => {
            resetCard.style.display = 'none';
            loginCard.style.display = 'block';
            resetMsg.style.display = 'none';
            btn.disabled = false;
            btn.textContent = 'Send Reset Link';
        }, 3000);
    } catch (error) {
        console.error(error);
        resetMsg.style.color = '#E74C3C';
        showError(resetMsg, error.message);
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
    }
});

// ---------------------------
// Google SSO
// ---------------------------
const googleProvider = new GoogleAuthProvider();

async function handleGoogleLogin(errorElement) {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserDocument(result.user);
        window.location.href = 'profile.html';
    } catch (error) {
        console.error(error);
        showError(errorElement, error.message);
    }
}

document.getElementById('login-google').addEventListener('click', () => handleGoogleLogin(loginError));
document.getElementById('signup-google').addEventListener('click', () => handleGoogleLogin(signupError));

// ---------------------------
// Apple SSO
// ---------------------------
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

async function handleAppleLogin(errorElement) {
    try {
        const result = await signInWithPopup(auth, appleProvider);
        
        // Extract name if provided by Apple (only on first sign in usually)
        const additionalData = {};
        if (result._tokenResponse && result._tokenResponse.fullName) {
            const f = result._tokenResponse.fullName;
            additionalData.fullName = [f.firstName, f.lastName].filter(Boolean).join(' ');
        }
        
        await ensureUserDocument(result.user, additionalData);
        window.location.href = 'profile.html';
    } catch (error) {
        console.error(error);
        showError(errorElement, error.message);
    }
}

document.getElementById('login-apple').addEventListener('click', () => handleAppleLogin(loginError));
document.getElementById('signup-apple').addEventListener('click', () => handleAppleLogin(signupError));

