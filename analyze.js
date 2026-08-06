import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';

// 🚨 1. MP3 Audio Object
const sirenAudio = new Audio('siren.mp3');

// 🔊 2. Backup Digital Sound Generator (MP3 न चालल्यास हा १००% वाजतो)
function playFallbackAlarm() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();

    [0, 0.2, 0.4].forEach((time) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, audioCtx.currentTime + time);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + time + 0.15);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + time + 0.15);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime + time);
      osc.stop(audioCtx.currentTime + time + 0.15);
    });
  } catch (err) {
    console.log("Audio Context Error:", err);
  }
}

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

    // sound Preload
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
      
      // 🎯 High Risk Demo Data
      let data = { label: 'FAKE', isFake: true, confidence: 88.5 };

      // Save to Session Storage & Firestore
      sessionStorage.setItem('latestResult', JSON.stringify(data));
      await addDoc(collection(db, 'analyses'), {
        userId: currentUser.uid,
        contentType: contentType,
        contentSnippet: snippet,
        result: data,
        createdAt: serverTimestamp()
      });

      // 🚨 sound trigger with Fallback
      sirenAudio.currentTime = 0;
      const playPromise = sirenAudio.play();

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("MP3 play blocked/failed, switching to fallback sound:", err);
          // MP3 चा आवाज न आल्यास बॅकअप साउंड वाजेल
          playFallbackAlarm();
        });
      }

      // 🚨 Red High Risk UI
      resultDisplay.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 12px; padding: 1.5rem; text-align: center; color: #fca5a5; margin-top: 1.5rem;">
          <h2 style="color: #ef4444; margin-bottom: 0.5rem; font-size: 1.5rem;">🚨 HIGH RISK DETECTED!</h2>
          <p style="font-size: 1.05rem; font-weight: 600; margin-bottom: 0.5rem;">Warning: This content appears to be Fake or Manipulated.</p>
          <p style="font-size: 0.9rem; color: #f87171; margin: 0;">Trust Score: <b>11.5% (Critical Risk)</b></p>
        </div>
      `;

    } catch (err) {
      console.error("Submission Error:", err);
      alert('Error: ' + err.message);
    } finally {
      if (loading) loading.style.display = 'none';
    }
  });
});
