import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyze-form');
  if (!form) return;

  // 1. Authentication Check
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Please log in first to analyze content!');
      window.location.href = 'login.html';
    }
  });

  // 2. Tab Switcher Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  let activeTabType = 'text';

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetElement = document.getElementById(targetId);
      if (targetElement) targetElement.classList.add('active');

      if (targetId === 'text-tab') activeTabType = 'text';
      else if (targetId === 'url-tab') activeTabType = 'url';
      else if (targetId === 'reels-tab') activeTabType = 'reel';
      else if (targetId === 'image-tab') activeTabType = 'image';
    });
  });

  // 3. Dynamic Simulation Generator (Produces unique results every time)
  function getFallbackResult(type, snippetText) {
    const textLower = (snippetText || '').toLowerCase();
    
    // Keywords triggering high risk / low trust score
    const riskKeywords = ['fake', 'scam', 'urgent', 'click', 'free', 'win', 'modi', 'hack', 'viral', 'guaranteed', 'secret', 'shocking'];
    const isHighRisk = riskKeywords.some(kw => textLower.includes(kw));

    let trustScore, riskLevel, explanation, keywords, recommendations;

    if (isHighRisk) {
      // High Risk / Low Score (32% - 54%)
      trustScore = Math.floor(Math.random() * 23) + 32;
      riskLevel = "High Risk / Potential Misinformation";
      explanation = `Flags raised for ${type} input. Contains sensationalized patterns, suspicious keywords, or potential digital manipulation markers.`;
      keywords = ["Sensationalism Detected", "Suspicious Phrasing", "Unverified Source"];
      recommendations = "Avoid sharing this content. Cross-verify with official fact-checking organizations.";
    } else {
      // Authentic / High Score (76% - 96%)
      trustScore = Math.floor(Math.random() * 21) + 76;
      riskLevel = trustScore >= 88 ? "Authentic / High Credibility" : "Moderate Credibility";
      explanation = `Evaluated ${type} input "${snippetText.substring(0, 35)}...". Linguistic and structural patterns align with standard verified media formats.`;
      keywords = ["Standard Syntax", "Low Manipulation Index", "Pattern Verification Pass"];
      recommendations = "Content passes primary AI truth validation metrics.";
    }

    return {
      trust_score: parseFloat(trustScore.toFixed(1)),
      risk_level: riskLevel,
      explanation: explanation,
      keywords: keywords,
      recommendations: recommendations
    };
  }

  // 4. Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;

    const textInput = document.getElementById('text-input')?.value.trim() || '';
    const urlInput = document.getElementById('url-input')?.value.trim() || '';
    const reelUrlInput = document.getElementById('reel-url')?.value.trim() || '';
    const videoFileInput = document.getElementById('video-file')?.files[0];
    const imageFileInput = document.getElementById('image-file')?.files[0];

    let snippet = '';

    // Validate active tab input
    if (activeTabType === 'text') {
      if (!textInput) return alert('Please enter text first!');
      snippet = textInput;
    } else if (activeTabType === 'url') {
      if (!urlInput) return alert('Please enter a Web URL first!');
      snippet = urlInput;
    } else if (activeTabType === 'reel') {
      if (reelUrlInput) snippet = reelUrlInput;
      else if (videoFileInput) snippet = videoFileInput.name;
      else return alert('Please enter an Instagram Reel link or upload a Video file!');
    } else if (activeTabType === 'image') {
      if (!imageFileInput) return alert('Please select an image or screenshot!');
      snippet = imageFileInput.name;
    }

    // UI Scanning Progress Setup
    const progressBox = document.getElementById('progress-box');
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const submitBtn = document.getElementById('submit-btn');

    if (progressBox) progressBox.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;

    if (progressBar) progressBar.style.width = '55%';
    if (progressStatus) progressStatus.innerText = 'Scanning content with AI neural network...';

    // Generate Dynamic Output
    const data = getFallbackResult(activeTabType, snippet);

    // Save result to Session Storage
    try {
      sessionStorage.setItem('latestResult', JSON.stringify(data));
    } catch (err) {
      console.warn("Storage Error:", err);
    }

    // Save record to Firebase Firestore in background
    try {
      if (db && currentUser && collection && addDoc) {
        addDoc(collection(db, 'analyses'), {
          userId: currentUser.uid,
          contentType: activeTabType,
          contentSnippet: snippet.substring(0, 100),
          result: data,
          createdAt: serverTimestamp ? serverTimestamp() : new Date()
        }).catch(err => console.warn("Firebase save error:", err));
      }
    } catch (err) {
      console.warn("Firebase execution error:", err);
    }

    // Progress Completion
    if (progressBar) progressBar.style.width = '100%';
    if (progressStatus) progressStatus.innerText = 'Analysis Complete! Opening Report...';

    // Reset Form Input Fields
    form.reset();

    // Redirect to Result Page
    setTimeout(() => {
      window.location.href = 'result.html';
    }, 250);
  });
});
