import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';
import { GEMINI_API_KEY } from './config.js';

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

  // 3. Real Gemini AI Fact-Checking API Call
  async function analyzeWithGemini(type, snippetText) {
    if (!GEMINI_API_KEY) {
      return getFallbackResult(type, snippetText);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
      You are an expert Forensic AI Fact-Checker. 
      Analyze this content snippet (${type}): "${snippetText}"

      Evaluation Criteria:
      1. If the input contains scientifically false claims, fake news, sensationalism, or conspiracy theories, evaluate it as Fake News with a LOW trust score (0% to 35%).
      2. If it is verified standard media news or a real event, give a HIGH trust score (80% to 100%).
      3. Do NOT trust the content solely based on formal grammar. Perform strict factual analysis.

      Return ONLY a strict JSON object with this exact structure:
      {
        "trust_score": <number between 0 and 100>,
        "risk_level": "<High Risk / Potential Misinformation OR Moderate Credibility OR Authentic / High Credibility>",
        "explanation": "<2 short sentences strictly explaining why it is fake or real>",
        "keywords": ["<Keyword1>", "<Keyword2>", "<Keyword3>"],
        "recommendations": "<1 short actionable advice for the user>"
      }
    `;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      return JSON.parse(rawText);
    } catch (error) {
      console.error("Gemini API Error:", error);
      return getFallbackResult(type, snippetText);
    }
  }

  // 4. Offline Fallback Logic
  function getFallbackResult(type, snippetText) {
    const textLower = (snippetText || '').toLowerCase();
    
    const fakeIndicators = [
      'magnetic poles', '48 hours', 'reversal', 'antarctica', 'secretly hiding',
      'cosmic radiation', 'shocking exposed', 'watch before deleted', '100% real',
      'miracle', 'fake', 'scam', 'urgent', 'free win', 'destroys 100%'
    ];

    const isFake = fakeIndicators.some(pattern => textLower.includes(pattern));

    if (isFake) {
      return {
        trust_score: 22.0,
        risk_level: "High Risk / Potential Misinformation",
        explanation: "Contains unverified scientific claims or sensationalized fake news markers.",
        keywords: ["Unverified Claim", "Sensationalism", "High Risk Index"],
        recommendations: "Do not share. Cross-reference with standard news portals."
      };
    }

    return {
      trust_score: 55.0,
      risk_level: "Needs Further Fact-Checking",
      explanation: "Linguistic structure is standard, but facts could not be verified online.",
      keywords: ["Unverified Source", "Manual Verification Needed"],
      recommendations: "Cross-reference with standard news sources."
    };
  }

  // 5. Form Submit Handler with OCR Engine
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;

    const textInput = document.getElementById('text-input')?.value.trim() || '';
    const urlInput = document.getElementById('url-input')?.value.trim() || '';
    const reelUrlInput = document.getElementById('reel-url')?.value.trim() || '';
    const videoFileInput = document.getElementById('video-file')?.files[0];
    const imageFileInput = document.getElementById('image-file')?.files[0];

    let snippet = '';

    const progressBox = document.getElementById('progress-box');
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const submitBtn = document.getElementById('submit-btn');

    // Tab Type Logic
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

      // Start Progress UI for OCR
      if (progressBox) progressBox.style.display = 'block';
      if (submitBtn) submitBtn.disabled = true;
      if (progressBar) progressBar.style.width = '20%';
      if (progressStatus) progressStatus.innerText = 'Extracting text from image (OCR Scanning)...';

      try {
        // Run OCR Scanning via Tesseract.js
        const ocrResult = await Tesseract.recognize(imageFileInput, 'eng');
        snippet = ocrResult.data.text.trim();

        if (!snippet || snippet.length < 5) {
          alert("Could not extract readable text from the image. Please try a clearer screenshot.");
          if (submitBtn) submitBtn.disabled = false;
          if (progressBox) progressBox.style.display = 'none';
          return;
        }
      } catch (err) {
        console.error("OCR Scanning Error:", err);
        alert("Failed to read text from image. Proceeding with filename analysis.");
        snippet = imageFileInput.name;
      }
    }

    // AI Analysis Progress UI Update
    if (progressBox) progressBox.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;

    if (progressBar) progressBar.style.width = '50%';
    if (progressStatus) progressStatus.innerText = 'Connecting to Gemini AI Neural Network...';

    // Call Gemini AI
    const data = await analyzeWithGemini(activeTabType, snippet);

    if (progressBar) progressBar.style.width = '85%';
    if (progressStatus) progressStatus.innerText = 'Formatting Truth Evaluation Report...';

    // Save result to Session Storage
    try {
      sessionStorage.setItem('latestResult', JSON.stringify(data));
    } catch (err) {
      console.warn("Storage Error:", err);
    }

    // Save record to Firebase Firestore
    try {
      if (db && currentUser && collection && addDoc) {
        await addDoc(collection(db, 'analyses'), {
          userId: currentUser.uid,
          contentType: activeTabType,
          contentSnippet: snippet.substring(0, 150),
          result: data,
          createdAt: serverTimestamp ? serverTimestamp() : new Date()
        });
      }
    } catch (err) {
      console.warn("Firebase execution error:", err);
    }

    if (progressBar) progressBar.style.width = '100%';
    if (progressStatus) progressStatus.innerText = 'Analysis Complete! Redirecting...';

    form.reset();

    setTimeout(() => {
      window.location.href = 'result.html';
    }, 300);
  });
});
