import { auth, signOut } from './firebase.js';
import { updateProfile, updatePassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Helper function for Toast Messages
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.style.display = 'block';
  toast.style.background = type === 'success' ? '#22c55e' : '#ef4444';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// Check Active User Session
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in - Load Data
    const displayName = user.displayName || user.email.split('@')[0] || 'User';
    const email = user.email || '';
    const photoURL = user.photoURL || '';

    // Update Header UI
    const nameEl = document.getElementById('display-user-name');
    const emailEl = document.getElementById('display-user-email');
    if (nameEl) nameEl.innerText = displayName;
    if (emailEl) emailEl.innerText = email;

    // Populate Input Fields
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editPhoto = document.getElementById('edit-photo-url');
    
    if (editName) editName.value = displayName;
    if (editEmail) editEmail.value = email;
    if (editPhoto) editPhoto.value = photoURL;

    // Avatar Logic (Image vs Initials)
    const avatarImg = document.getElementById('user-avatar-img');
    const avatarInitials = document.getElementById('user-avatar-initials');

    if (photoURL && avatarImg && avatarInitials) {
      avatarImg.src = photoURL;
      avatarImg.style.display = 'block';
      avatarInitials.style.display = 'none';
    } else if (avatarImg && avatarInitials) {
      avatarImg.style.display = 'none';
      avatarInitials.style.display = 'flex';
      
      // Extract Initials (e.g. Shrutika Sonmale -> SS)
      const initials = displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
        
      avatarInitials.innerText = initials || 'U';
    }
  } else {
    // User is NOT logged in - Redirect to Login
    window.location.href = 'login.html';
  }
});

// Profile Details Update Event
const profileForm = document.getElementById('update-profile-form');
if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('edit-name').value;
    const newPhotoURL = document.getElementById('edit-photo-url').value;
    const user = auth.currentUser;

    if (user) {
      try {
        await updateProfile(user, {
          displayName: newName,
          photoURL: newPhotoURL
        });
        showToast('Profile updated successfully!', 'success');
        setTimeout(() => { location.reload(); }, 1000);
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  });
}

// Password Change Event
const passForm = document.getElementById('change-password-form');
if (passForm) {
  passForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const user = auth.currentUser;

    if (user) {
      try {
        await updatePassword(user, newPassword);
        showToast('Password updated successfully!', 'success');
        passForm.reset();
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  });
}

// Logout Event
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}
