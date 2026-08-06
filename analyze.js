import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';

// 🚨 आपण प्रोजेक्टमध्ये सेव्ह केलेली लोकल MP3 फाईल:
const sirenAudio = new Audio('siren.mp3');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyze-form');
  if (!form) return;

  // Login Check
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Please log in first!');
      window.location.href = 'login.html';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Sound प्रीलोड करा जेणेकरून ब्राऊझर ब्लॉक करणार नाही
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
      
      // Demo Data (Testing साठी High Risk)
      let data = { label: 'FAKE', isFake: true };

      sessionStorage.setItem('latestResult', JSON.stringify(data));
      await addDoc(collection(db, 'analyses'), {
        userId: currentUser.uid,
        contentType: contentType,
        contentSnippet: snippet,
        result: data,
        createdAt: serverTimestamp()
      });

      // 🚨 local siren.mp3 प्ले करा
      sirenAudio.currentTime = 0;
      sirenAudio.play().catch(err => console.log("Audio play error:", err));

      // Red High Risk Display Box
      resultDisplay.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 12px; padding: 1.5rem; text-align: center; color: #fca5a5; margin-top: 1.5rem;">
          <h2 style="color: #ef4444; margin-bottom: 0.5rem; font-size: 1.5rem;">🚨 HIGH RISK DETECTED!</h2>
          <p style="font-size: 1.05rem; font-weight: 600;">Warning: This content appears to be Fake or Manipulated.</p>
        </div>
      `;

    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      if (loading) loading.style.display = 'none';
    }
  });
});
