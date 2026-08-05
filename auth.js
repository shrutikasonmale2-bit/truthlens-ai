import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Helper function for Toast Notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.innerText = message;
  toast.style.display = 'block';
  toast.style.background = type === 'success' ? '#22c55e' : '#ef4444';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Password Toggle Logic (Show / Hide Password)
  const setupPasswordToggle = (toggleId, inputId) => {
    const toggleBtn = document.getElementById(toggleId);
    const passwordInput = document.getElementById(inputId);
    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleBtn.innerText = type === 'password' ? '👁️' : '🙈';
      });
    }
  };

  setupPasswordToggle('toggle-password-login', 'login-password');
  setupPasswordToggle('toggle-password-reg', 'reg-password');

  // 2. Registration Logic
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        showToast("Registration Successful! Redirecting to Login...", "success");
        
        // Wait 1.5 seconds and redirect to login page
        setTimeout(() => {
          window.location.href = 'login.html?registered=true';
        }, 1500);

      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }

  // 3. Login Logic
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    // Check if coming after successful registration
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
      showToast("Registration Complete! Please login now.", "success");
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Login Successful! Opening Dashboard...", "success");

        // Redirect directly to Dashboard
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);

      } catch (error) {
        // If account not registered or wrong details
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          showToast("Account not found! Redirecting to Registration...", "error");
          setTimeout(() => {
            window.location.href = 'register.html';
          }, 2000);
        } else {
          showToast(error.message, "error");
        }
      }
    });
  }

  // 4. Google Login Flow
  const googleBtn = document.getElementById('google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        await signInWithPopup(auth, googleProvider);
        showToast("Google Sign-in Successful!", "success");
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  }
});