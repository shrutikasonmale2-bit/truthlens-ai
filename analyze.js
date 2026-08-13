import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';
import { GEMINI_API_KEY } from './config.js.txt';

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

  // Gemini AI API Call Function (Supports both English & Marathi output)
  async function analyzeWithGemini(type, snippetText) {
    console.log("Calling Gemini API with text:", snippetText);

    if (!GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY found, using fallback logic");
      return getFallbackResult(type, snippetText);
    }

    // Updated to stable model endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
      You are an expert Forensic AI Fact-Checker. 
      Analyze this content snippet (${type}): "${snippetText}"

      Evaluation Rules:
      1. If the input is too short, gibberish, or lacks a verifiable claim, set trust_score = 0, risk_level_en = "Insufficient Data", risk_level_mr = "अपुरी माहिती".
      2. If the claim is fake news, conspiracy, or medically/scientifically wrong, assign a trust score below 35%.
      3. If it is verified news or a factually correct statement, assign a trust score above 80%.

      IMPORTANT: Provide all textual outputs in BOTH English AND Marathi languages.

      Return ONLY a JSON object with no markdown formatting:
      {
        "trust_score": <number between 0 and 100>,
        "risk_level_en": "<High Risk / Potential Misinformation OR Moderate Credibility OR Authentic / High Credibility OR Insufficient Data>",
        "risk_level_mr": "<मराठीत जोखीम पातळी - उदा. उच्च जोखीम / असत्य माहिती OR मध्यम विश्वसनीयता OR अधिकृत / सत्य माहिती OR अपुरी माहिती>",
        "explanation_en": "<2 short factual sentences in English>",
        "explanation_mr": "<मराठीत २ स्पष्ट आणि सत्य वाक्ये>",
        "keywords_en": ["<Keyword1_EN>", "<Keyword2_EN>"],
        "keywords_mr": ["<Keyword1_MR>", "<Keyword2_MR>"],
        "recommendations_en": "<1 short line in English>",
        "recommendations_mr": "<मराठीत १ ओळीचा सल्ला>"
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
      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Invalid response format from Gemini API");
      }

      // Clean up markdown wrapping if present
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

      console.log("Gemini Live Response:", rawText);
      return JSON.parse(rawText);

    } catch (error) {
      console.error("Gemini API Call failed, switching to strict Fallback:", error);
      return getFallbackResult(type, snippetText);
    }
  }

  // Strict Fallback Logic with Dual-Language Fields
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
        risk_level_en: "High Risk / Potential Misinformation",
        risk_level_mr: "उच्च जोखीम / असत्य माहिती",
        explanation_en: "Contains medical or scientific misinformation markers and unverified panic claims.",
        explanation_mr: "यामध्ये वैद्यकीय किंवा वैज्ञानिक चुकीची माहिती आणि अपुष्ट भीतीदायक दावे समाविष्ट आहेत.",
        keywords_en: ["Misinformation", "Unverified Claim", "High Risk"],
        keywords_mr: ["असत्य माहिती", "अपुष्ट दावा", "उच्च जोखीम"],
        recommendations_en: "Do not share. Verify with standard health organizations.",
        recommendations_mr: "शेअर करू नका. अधिकृत आरोग्य संस्थांकडून पडताळणी करा."
      };
    }

    return {
      trust_score: 45.0,
      risk_level_en: "Needs Further Fact-Checking",
      risk_level_mr: "पुढील पडताळणी आवश्यक",
      explanation_en: "Content requires manual fact-checking against primary news databases.",
      explanation_mr: "प्राथमिक बातम्यांच्या डेटाबेसवर सामग्रीची मॅन्युअल पडताळणी आवश्यक आहे.",
      keywords_en: ["Unverified Source", "Manual Verification Required"],
      keywords_mr: ["अपुष्ट स्रोत", "मॅन्युअल पडताळणी आवश्यक"],
      recommendations_en: "Cross-verify with authentic news agencies.",
      recommendations_mr: "अधिकृत वृत्त संस्थांकडून पडताळून पहा."
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

    const resetUI = () => {
      if (submitBtn) submitBtn.disabled = false;
      if (progressBox) progressBox.style.display = 'none';
    };

    if (activeTabType === 'text') {
      if (!textInput) return alert('Please enter text first!');

      const wordCount = textInput.split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount < 3 || textInput.length < 15) {
        alert('Please enter at least a full sentence or 3 to 4 words for analysis (e.g., news claim or statement).');
        return;
      }

      snippet = textInput;
    } else if (activeTabType === 'url') {
      if (!urlInput) return alert('Please enter a Web URL first!');
      if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
      }
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
        if (typeof Tesseract === 'undefined') {
          throw new Error("Tesseract library is not loaded.");
        }
        const ocrResult = await Tesseract.recognize(imageFileInput, 'eng');
        snippet = ocrResult.data.text.trim();
        
        if (!snippet || snippet.length < 15) {
          alert("Extracted text from the image is too short to analyze. Please upload an image with clearer text.");
          resetUI();
          return;
        }
      } catch (err) {
        console.error("OCR Error:", err);
        alert("Failed to process image OCR. Falling back to image file name.");
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
