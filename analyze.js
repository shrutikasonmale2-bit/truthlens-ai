import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyze-form');
  if (!form) return;

  // युझर लॉगिन चेकींग
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Please log in first to analyze content!');
      window.location.href = 'login.html';
    }
  });

  // फॉर्म सबमिट
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('You must be logged in to perform an analysis.');
      return;
    }

    const textContent = document.getElementById('content-input').value.trim();
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    // जर दोन्हीपैकी काहीच इनपुट नसेल तर
    if (!textContent && !file) {
      alert('कृपया टेक्स्ट पेस्ट करा किंवा इमेज/व्हिडिओ फाईल सेलेक्ट करा!');
      return;
    }

    const loading = document.getElementById('loading-indicator');
    if (loading) loading.style.display = 'block';

    try {
      let response;
      let contentType = 'text';
      let snippet = textContent.substring(0, 100);

      // जर फाईल सेलेक्ट केली असेल तर
      if (file) {
        contentType = file.type.startsWith('video') ? 'video' : 'image';
        snippet = file.name;

        const formData = new FormData();
        formData.append('type', contentType);
        formData.append('file', file);

        response = await fetch('http://127.0.0.1:5000/predict', {
          method: 'POST',
          body: formData
        });
      } else {
        // जर फक्त टेक्स्ट दिला असेल तर
        response = await fetch('http://127.0.0.1:5000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: contentType, content: textContent })
        });
      }

      if (!response.ok) throw new Error(`Server status: ${response.status}`);

      const data = await response.json();

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

      // रिझल्ट पेजवर पाठवा
      window.location.href = 'result.html';

    } catch (err) {
      console.error("Submission Error:", err);
      alert('Analysis failed: ' + err.message);
    } finally {
      if (loading) loading.style.display = 'none';
    }
  });
});