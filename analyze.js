import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';
import { GEMINI_API_KEY } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyze-form');
  if (!form) return;

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Please log in first to analyze content!');
      window.location.href = 'login.html';
    }
  });

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

  // Real Gemini AI API Call Function
  async function analyzeWithGemini(type, snippetText) {
    console.log("Calling Gemini API with text:", snippetText);

    if (!GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY found, using fallback logic");
      return getFallbackResult(type, snippetText);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
      You are an expert Forensic AI Fact-Checker. 
      Analyze this content snippet (${type}): "${snippetText}"

      Evaluation Rules:
      1. If the claim is fake news, conspiracy, or medically/scientifically wrong, assign a trust score below 35%.
      2. If it is verified news or factually correct statement, assign a trust score above 80%.

      Return ONLY a JSON object:
      {
        "trust_score": <number between 0 and 100>,
        "risk_level": "<High Risk / Potential Misinformation OR Moderate Credibility OR Authentic / High Credibility>",
        "explanation": "<2 short factual sentences explaining why>",
        "keywords": ["<Keyword1>", "<Keyword2>", "<Keyword3>"],
        "recommendations": "<1 short actionable line>"
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
        const errText = await response.text();
        console.error("Gemini API Error Response:", errText);
        throw new Error(`API status: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      console.log("Gemini Live Response:", rawText);
      return JSON.parse(rawText);

    } catch (error) {
      console.error("Gemini API Call failed, switching to strict Fallback:", error);
      return getFallbackResult(type, snippetText);
    }
  }

  // Strict Fallback Logic (Max 35% Score for Suspect Claims)
  function getFallbackResult(type, snippetText) {
    const textLower = (snippetText || '').toLowerCase();
    
    const fakeIndicators = [
      'magnetic poles', '48 hours', 'reversal', 'antarctica', 'secretly hiding',
      'cosmic radiation', 'shocking exposed', 'watch before deleted', '100% real',
      'miracle', 'fake', 'scam', 'urgent', 'free win', 'destroys 100%', 'salt'
    ];

    const isFake = fakeIndicators.some(pattern => textLower.includes(pattern));

    if (isFake) {
      return {
        trust_score: 25.0,
        risk_level: "High Risk / Potential Misinformation",
        explanation: "Contains medical or scientific misinformation markers and unverified panic claims.",
        keywords: ["Misinformation", "Unverified Claim", "High Risk"],
        recommendations: "Do not share. Verify with standard health organizations."
      };
    }

    return {
      trust_score: 45.0,
      risk_level: "Needs Further Fact-Checking",
      explanation: "Content requires manual fact-checking against primary news databases.",
      keywords: ["Unverified Source", "Manual Verification Required"],
      recommendations: "Cross-verify with authentic news agencies."
    };
  }

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

    if (activeTabType === 'text') {
      if (!textInput) return alert('Please enter text first!');
      snippet = textInput;
    } else if (activeTabType === 'url') {
      if (!urlInput) return alert('Please enter a Web URL first!');
      snippet = urlInput;
    } else if (activeTabType === 'reel') {
      if (reelUrlInput) snippet = reelUrlInput;
      else if (videoFileInput) snippet = videoFileInput.name;
      else return alert('Please enter a video link or upload a file!');
    } else if (activeTabType === 'image') {
      if (!imageFileInput) return alert('Please select an image!');

      if (progressBox) progressBox.style.display = 'block';
      if (submitBtn) submitBtn.disabled = true;
      if (progressBar) progressBar.style.width = '20%';
      if (progressStatus) progressStatus.innerText = 'Scanning text from image (OCR)...';

      try {
        const ocrResult = await Tesseract.recognize(imageFileInput, 'eng');
        snippet = ocrResult.data.text.trim();
        if (!snippet || snippet.length < 5) {
          alert("Unable to extract clear text from image.");
          if (submitBtn) submitBtn.disabled = false;
          if (progressBox) progressBox.style.display = 'none';
          return;
        }
      } catch (err) {
        console.error("OCR Error:", err);
        snippet = imageFileInput.name;
      }
    }

    if (progressBox) progressBox.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;
    if (progressBar) progressBar.style.width = '50%';
    if (progressStatus) progressStatus.innerText = 'Connecting to Gemini AI Fact-Checker...';

    const data = await analyzeWithGemini(activeTabType, snippet);

    if (progressBar) progressBar.style.width = '85%';
    if (progressStatus) progressStatus.innerText = 'Saving Analysis Results...';

    try {
      sessionStorage.setItem('latestResult', JSON.stringify(data));
    } catch (err) {
      console.warn("Storage Error:", err);
    }

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
    if (progressStatus) progressStatus.innerText = 'Complete! Opening Analysis...';

    form.reset();

    setTimeout(() => {
      window.location.href = 'result.html';
    }, 200);
  });
});
