import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Blob } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
const displayName = document.getElementById('display-name');
const displayUsername = document.getElementById('display-username');
const displayTier = document.getElementById('display-tier');
const avatarImg = document.getElementById('avatar-img');

const inputName = document.getElementById('input-name');
const inputUsername = document.getElementById('input-username');
const inputEmail = document.getElementById('input-email');
const inputJoined = document.getElementById('input-joined');

const profileForm = document.getElementById('profile-form');
const saveBtn = document.getElementById('save-btn');
const logoutBtn = document.getElementById('logout-btn');
const statusMsg = document.getElementById('status-msg');
const avatarUpload = document.getElementById('avatar-upload');

let currentUserDoc = null;
let newAvatarBlob = null;
let originalUsername = '';

// Helper: Show Status
function showStatus(message, isError = false) {
    statusMsg.textContent = message;
    statusMsg.style.color = isError ? '#E74C3C' : '#2ECC71';
    statusMsg.style.display = 'block';
    setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
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

// Compress Image using Canvas
function compressImage(file, maxSizeKB = 100) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Max dimensions
                const MAX_SIZE = 400;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
            img.onerror = (e) => reject(e);
        };
        reader.onerror = (e) => reject(e);
    });
}

// Load User Data
async function loadUserData(user) {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
        const data = snap.data();
        currentUserDoc = data;
        originalUsername = data.username || '';
        
        // Populate display
        displayName.textContent = data.fullName || 'User';
        displayUsername.textContent = data.username || '@username';
        displayTier.textContent = (data.subscriptionTier || 'Free') + ' Tier';
        
        if (data.subscriptionTier === 'Premium') {
            displayTier.style.color = '#F39C12'; // Gold
            displayTier.style.background = 'rgba(243, 156, 18, 0.2)';
        }
        
        // Populate inputs
        inputName.value = data.fullName || '';
        inputUsername.value = data.username || '';
        inputEmail.value = data.email || '';
        
        if (data.joinDate) {
            const date = data.joinDate.toDate ? data.joinDate.toDate() : new Date(data.joinDate);
            inputJoined.value = date.toLocaleDateString();
        }
        
        // Load Avatar
        if (data.avatarData) {
            // Firestore Blob -> Base64
            try {
                if (typeof data.avatarData.toBase64 === 'function') {
                    avatarImg.src = 'data:image/jpeg;base64,' + data.avatarData.toBase64();
                }
            } catch(e) { console.error("Avatar load error", e); }
        }
    } else {
        // Fallback if doc missing but Auth exists
        displayName.textContent = user.displayName || 'User';
        inputEmail.value = user.email || '';
    }
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserData(user);
    } else {
        // Redirect to login if not logged in
        window.location.href = 'auth.html';
    }
});

// Avatar Upload
avatarUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Processing...';
        
        const compressedBlob = await compressImage(file);
        
        // Preview locally
        const previewUrl = URL.createObjectURL(compressedBlob);
        avatarImg.src = previewUrl;
        
        // Convert to ArrayBuffer -> Uint8Array -> Firestore Blob
        const arrayBuffer = await compressedBlob.arrayBuffer();
        newAvatarBlob = Blob.fromUint8Array(new Uint8Array(arrayBuffer));
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    } catch (err) {
        console.error(err);
        showStatus('Error processing image', true);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
});

// Save Changes
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const newName = inputName.value.trim();
        const newUsername = formatUsername(inputUsername.value);
        
        const updates = {};
        let needsUpdate = false;
        
        if (newName !== currentUserDoc.fullName) {
            updates.fullName = newName;
            needsUpdate = true;
        }
        
        if (newUsername !== originalUsername) {
            const available = await isUsernameAvailable(newUsername);
            if (!available) {
                throw new Error("Username is already taken.");
            }
            updates.username = newUsername;
            needsUpdate = true;
        }
        
        if (newAvatarBlob) {
            updates.avatarData = newAvatarBlob;
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            await updateDoc(userRef, updates);
            showStatus('Profile updated successfully!');
            
            // Update local state
            if (updates.fullName) {
                currentUserDoc.fullName = updates.fullName;
                displayName.textContent = updates.fullName;
            }
            if (updates.username) {
                originalUsername = updates.username;
                currentUserDoc.username = updates.username;
                displayUsername.textContent = updates.username;
            }
            if (updates.avatarData) {
                newAvatarBlob = null; // reset
            }
        } else {
            showStatus('No changes to save.');
        }
        
    } catch (error) {
        console.error(error);
        showStatus(error.message, true);
    }
    
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // Observer will redirect
    } catch (error) {
        console.error("Logout error", error);
    }
});
