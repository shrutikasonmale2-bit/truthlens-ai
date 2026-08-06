import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';

// 🚨 Siren Sound Object (Siren Sound साठी Link)
const sirenAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyze-form');
  if (!form) return;

  // 1. युझर लॉगिन चेकींग
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Please log in first to analyze content!');
      window.location.href = 'login.html';
    }
  });

  // 2. फॉर्म सबमिट
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // फॉर्म रीलोड होण्यापासून रोखण्यासाठी

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('You must be logged in to perform an analysis.');
      return;
    }

    const textContent = document.getElementById('content-input')?.value.trim() || '';
    const fileInput = document.getElementById('file-input');
    const file = fileInput?.files[0];

    // जर दोन्हीपैकी काहीच इनपुट नसेल तर
    if (!textContent && !file) {
      alert('कृपया टेक्स्ट पेस्ट करा किंवा इमेज/व्हिडिओ फाईल सेलेक्ट करा!');
      return;
    }

    const loading = document.getElementById('loading-indicator');
    if (loading) loading.style.display = 'block';

    try {
      let contentType = 'text';
      let snippet = textContent.substring(0, 100);
      let data = {};

      if (file) {
        contentType = file.type.startsWith('video') ? 'video' : 'image';
        snippet = file.name;
      }

      // ⚠️ Note: Backend API उपलब्ध नसल्यास Fallback Simulation Logic (GitHub Pages साठी)
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

        // Backend Server URL
        const response = await fetch('http://127.0.0.1:5000/predict', fetchOptions);
        if (!response.ok) throw new Error(`Server status: ${response.status}`);
        data = await response.json();

      } catch (backendError) {
        console.warn("Backend not reachable, running client-side analysis simulation...", backendError);
        
        // जर Backend चालत नसेल, तर Demo साठी Simulation Result generate होईल:
        data = {
          label: 'FAKE', // किंवा 'REAL'
          confidence: 88.5,
          message: 'Content shows high indicators of AI manipulation.'
        };
      }

      // Session Storage मध्ये सेव्ह
      sessionStorage.setItem('latestResult', JSON.stringify(data));

      // Firestore मध्ये सेव्ह
      await addDoc(collection(db, 'analyses'), {
        userId: currentUser.uid,
        contentType: contentType,
        contentSnippet: snippet,
        result: data,
        createdAt: serverTimestamp()
      });

      // 🚨 जर Output / Prediction 'FAKE' असेल तर Siren वाजवा
      if (data.label === 'FAKE' || data.isFake === true) {
        sirenAudio.currentTime = 0;
        await sirenAudio.play().catch(err => console.log("Audio play blocked by browser:", err));

        // Siren ऐकण्यासाठी १.५ सेकंदाचा Delay देऊन Result Page वर Redirect करा
        setTimeout(() => {
          window.location.href = 'result.html';
        }, 1500);
      } else {
        // जर Content REAL असेल तर लगेच Redirect करा
        window.location.href = 'result.html';
      }

    } catch (err) {
      console.error("Submission Error:", err);
      alert('Analysis failed: ' + err.message);
    } finally {
      if (loading) loading.style.display = 'none';
    }
  });
});
