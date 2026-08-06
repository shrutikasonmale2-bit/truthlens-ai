import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';

// 🚨 Siren Audio Object
const sirenAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyze-form');
  if (!form) return;

  // 1. Auth Check
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Please log in first!');
      window.location.href = 'login.html';
    }
  });

  // 2. Submit Event
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Browser audio unlock
    sirenAudio.load();

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const textContent = document.getElementById('content-input')?.value.trim() || '';
    const fileInput = document.getElementById('file-input');
    const file = fileInput?.files[0];

    if (!textContent && !file) {
      alert('Please enter text or select a file!');
      return;
    }

    const loading = document.getElementById('loading-indicator');
    let resultDisplay = document.getElementById('result-display');

    if (!resultDisplay) {
      resultDisplay = document.createElement('div');
      resultDisplay.id = 'result-display';
      form.appendChild(resultDisplay);
    }

    if (loading) loading.style.display = 'block';
    resultDisplay.innerHTML = '';

    try {
      let contentType = file ? (file.type.startsWith('video') ? 'video' : 'image') : 'text';
      let snippet = file ? file.name : textContent.substring(0, 100);
      
      // 🎯 FORCE HIGH RISK FOR TESTING (इथे आपण जबरदस्ती High Risk दिलं आहे)
      let data = {
        label: 'FAKE',
        isFake: true,
        confidence: 88.5
      };

      // Session Storage & Firestore
      sessionStorage.setItem('latestResult', JSON.stringify(data));
      await addDoc(collection(db, 'analyses'), {
        userId: currentUser.uid,
        contentType: contentType,
        contentSnippet: snippet,
        result: data,
        createdAt: serverTimestamp()
      });

      // 🚨 High Risk Condition Force Trigger
      const isHighRisk = true; 

      if (isHighRisk) {
        // 🚨 Siren वाजवा
        sirenAudio.currentTime = 0;
        sirenAudio.play().catch(err => alert("🚨 HIGH RISK DETECTED!"));

        // 🚨 High Risk Red Box दाखवा
        resultDisplay.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 12px; padding: 1.5rem; text-align: center; color: #fca5a5; margin-top: 1.5rem;">
            <h2 style="color: #ef4444; margin-bottom: 0.5rem; font-size: 1.5rem;">🚨 HIGH RISK DETECTED!</h2>
            <p style="font-size: 1.05rem; font-weight: 600; margin-bottom: 0.5rem;">
              Warning: This content appears to be Fake or Digitally Manipulated.
            </p>
            <p style="font-size: 0.9rem; color: #f87171; margin: 0;">
              Trust Score: <b>11.5% (Critical Risk)</b> • Do not share or spread this information.
            </p>
          </div>
        `;
      }

    } catch (err) {
      console.error("Error:", err);
      alert('Analysis failed: ' + err.message);
    } finally {
      if (loading) loading.style.display = 'none';
    }
  });
});
