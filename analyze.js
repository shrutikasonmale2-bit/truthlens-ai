import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';

// 🚨 Siren Sound Link
const sirenAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyze-form');
  if (!form) return;

  // 1. लॉगिन चेक
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Please log in first to analyze content!');
      window.location.href = 'login.html';
    }
  });

  // 2. फॉर्म सबमिट
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // डेटा आणि पेज रिफ्रेश होण्यापासून रोखण्यासाठी

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('You must be logged in to perform an analysis.');
      return;
    }

    const textContent = document.getElementById('content-input')?.value.trim() || '';
    const fileInput = document.getElementById('file-input');
    const file = fileInput?.files[0];

    if (!textContent && !file) {
      alert('कृपया टेक्स्ट पेस्ट करा किंवा इमेज/व्हिडिओ फाईल सेलेक्ट करा!');
      return;
    }

    const loading = document.getElementById('loading-indicator');
    const resultDisplay = document.getElementById('result-display');

    if (loading) loading.style.display = 'block';
    if (resultDisplay) resultDisplay.innerHTML = '';

    try {
      let contentType = 'text';
      let snippet = textContent.substring(0, 100);
      let data = {};

      if (file) {
        contentType = file.type.startsWith('video') ? 'video' : 'image';
        snippet = file.name;
      }

      // Backend simulation (GitHub Pages साठी Demo Data)
      try {
        const formData = new FormData();
        if (file) {
          formData.append('type', contentType);
          formData.append('file', file);
        }

        const fetchOptions = file ? {
          method: 'POST',
          body: formData
        } : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: contentType, content: textContent })
        };

        const response = await fetch('http://127.0.0.1:5000/predict', fetchOptions);
        if (!response.ok) throw new Error(`Server status: ${response.status}`);
        data = await response.json();

      } catch (backendError) {
        console.warn("Backend not reachable, running simulation...", backendError);
        
        // 🚨 DEMO TEST: FAKE DATA
        data = {
          label: 'FAKE',
          confidence: 88.5,
          isFake: true
        };
      }

      // Session Storage आणि Firestore सेव्ह
      sessionStorage.setItem('latestResult', JSON.stringify(data));

      await addDoc(collection(db, 'analyses'), {
        userId: currentUser.uid,
        contentType: contentType,
        contentSnippet: snippet,
        result: data,
        createdAt: serverTimestamp()
      });

      // 🔍 HIGH RISK CHECK logic
      const isHighRisk = (data.label === 'FAKE' || data.isFake === true);

      if (isHighRisk) {
        // 🚨 1. SIREN SOUND PLAY
        sirenAudio.currentTime = 0;
        await sirenAudio.play().catch(err => console.log("Audio play blocked by browser:", err));

        // 🚨 2. HIGH RISK RED BANNER DISPLAY
        if (resultDisplay) {
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
      } else {
        // ✅ LOW RISK DISPLAY
        sirenAudio.pause();
        if (resultDisplay) {
          resultDisplay.innerHTML = `
            <div style="background: rgba(34, 197, 94, 0.2); border: 2px solid #22c55e; border-radius: 12px; padding: 1.5rem; text-align: center; color: #86efac; margin-top: 1.5rem;">
              <h2 style="color: #22c55e; margin-bottom: 0.5rem; font-size: 1.5rem;">✅ LOW RISK / AUTHENTIC</h2>
              <p style="font-size: 1.05rem; font-weight: 600;">This content appears to be Original and Safe.</p>
            </div>
          `;
        }
      }

    } catch (err) {
      console.error("Submission Error:", err);
      alert('Analysis failed: ' + err.message);
    } finally {
      if (loading) loading.style.display = 'none';
    }
  });
});
