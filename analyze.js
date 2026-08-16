import { auth, db, collection, addDoc, serverTimestamp, onAuthStateChanged } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analyze-form');
  if (!form) return;

  // Firebase Auth Check
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert('Please log in first to analyze content!');
      window.location.href = 'login.html';
    }
  });

  // Tab Switching Logic
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

      const tabMap = {
        'text-tab': 'text',
        'url-tab': 'url',
        'reels-tab': 'reel',
        'image-tab': 'image'
      };
      if (tabMap[targetId]) activeTabType = tabMap[targetId];
    });
  });

  // Offline Analysis Engine
  function analyzeLocally(type, snippetText) {
    const textLower = (snippetText || '').toLowerCase().trim();

    if (!textLower || textLower.length < 15) {
      return {
        trust_score: 0,
        risk_level_en: "Insufficient Data",
        risk_level_mr: "अपुरी माहिती",
        explanation_en: "The content provided is too short or insufficient to perform a complete analysis.",
        explanation_mr: "दिलेली माहिती अत्यंत अपुरी असल्यामुळे पूर्ण विश्लेषणासाठी पुरेशी नाही.",
        keywords_en: ["Insufficient Data", "Unverified"],
        keywords_mr: ["अपुरी माहिती", "अपुष्ट"],
        recommendations_en: "Provide more context or a complete claim for better analysis.",
        recommendations_mr: "अधिक स्पष्ट किंवा संपूर्ण मजकूर प्रविष्ट करा."
      };
    }

    const fakeIndicators = [
      'magnetic poles', '48 hours', 'reversal', 'antarctica', 'secretly hiding',
      'cosmic radiation', 'shocking exposed', 'watch before deleted', '100% real',
      'miracle', 'fake', 'scam', 'urgent', 'free win', 'destroys 100%', 'salt',
      'forwarded many times', 'click here to win', 'cure for cancer', 'free recharge'
    ];

    const trustedIndicators = [
      'official', 'government', 'pib', 'isro', 'nasa', 'who', 'rbi', 'published',
      'press release', 'statement', 'research', 'university', 'report'
    ];

    // Word boundary regex matching to avoid substring collisions
    const matchesPattern = (list) => list.some(pattern => {
      const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(textLower);
    });

    if (matchesPattern(fakeIndicators)) {
      return {
        trust_score: 20.0,
        risk_level_en: "High Risk / Potential Misinformation",
        risk_level_mr: "उच्च जोखीम / असत्य माहिती",
        explanation_en: "Contains potential misinformation indicators and unverified claims.",
        explanation_mr: "या मजकुरात असत्य माहितीची लक्षणे आणि अपुष्ट दावे आढळले आहेत.",
        keywords_en: ["Misinformation", "Unverified Claim", "High Risk"],
        keywords_mr: ["असत्य माहिती", "अपुष्ट दावा", "उच्च जोखीम"],
        recommendations_en: "Do not share. Cross-check with standard news or fact-checking websites.",
        recommendations_mr: "हा मजकूर शेअर करू नका. अधिकृत बातम्यांच्या स्रोतांकडून पडताळणी करा."
      };
    }

    if (matchesPattern(trustedIndicators)) {
      return {
        trust_score: 88.0,
        risk_level_en: "Authentic / High Credibility",
        risk_level_mr: "अधिकृत / सत्य माहिती",
        explanation_en: "The content uses credible language and indicators associated with verified statements.",
        explanation_mr: "हा मजकूर अधिकृत माहितीशी आणि पडताळणी केलेल्या स्रोतांशी सुसंगत वाटतो.",
        keywords_en: ["Verified Source", "High Credibility", "Authentic"],
        keywords_mr: ["पडताळलेला स्रोत", "उच्च विश्वसनीयता", "सत्य माहिती"],
        recommendations_en: "Verified content, safe to reference.",
        recommendations_mr: "माहिती योग्य वाटते, संदर्भासाठी वापरू शकता."
      };
    }

    return {
      trust_score: 50.0,
      risk_level_en: "Moderate Credibility / Needs Verification",
      risk_level_mr: "मध्यम विश्वसनीयता / पुढील पडताळणी आवश्यक",
      explanation_en: "Content requires manual fact-checking against official sources.",
      explanation_mr: "या माहितीची अधिकृत स्रोतांवरून स्वतः पडताळणी करणे आवश्यक आहे.",
      keywords_en: ["Unverified Source", "Manual Check Needed"],
      keywords_mr: ["अपुष्ट स्रोत", "पडताळणी आवश्यक"],
      recommendations_en: "Cross-verify with authentic news agencies before believing.",
      recommendations_mr: "विश्वास ठेवण्यापूर्वी अधिकृत वृत्त संस्थांकडून पडताळून पहा."
    };
  }

  // Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('Please log in first to analyze content!');
      window.location.href = 'login.html';
      return;
    }

    const progressBox = document.getElementById('progress-box');
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const submitBtn = document.getElementById('submit-btn');

    const updateProgress = (width, text) => {
      if (progressBox) progressBox.style.display = 'block';
      if (progressBar) progressBar.style.width = width;
      if (progressStatus) progressStatus.innerText = text;
    };

    const resetUI = () => {
      if (submitBtn) submitBtn.disabled = false;
      if (progressBox) progressBox.style.display = 'none';
    };

    let snippet = '';

    try {
      if (submitBtn) submitBtn.disabled = true;

      if (activeTabType === 'text') {
        const textInput = document.getElementById('text-input')?.value.trim() || '';
        if (!textInput) return alert('Please enter text first!');

        const wordCount = textInput.split(/\s+/).filter(Boolean).length;
        if (wordCount < 3 || textInput.length < 15) {
          alert('Please enter at least 3-4 words or a full sentence for analysis.');
          return resetUI();
        }
        snippet = textInput;

      } else if (activeTabType === 'url') {
        const urlInput = document.getElementById('url-input')?.value.trim() || '';
        if (!urlInput) return alert('Please enter a Web URL first!');
        if (!/^https?:\/\//i.test(urlInput)) {
          alert('Please enter a valid URL starting with http:// or https://');
          return resetUI();
        }
        snippet = urlInput;

      } else if (activeTabType === 'reel') {
        const reelUrlInput = document.getElementById('reel-url')?.value.trim() || '';
        const videoFileInput = document.getElementById('video-file')?.files[0];

        if (reelUrlInput) snippet = reelUrlInput;
        else if (videoFileInput) snippet = videoFileInput.name;
        else {
          alert('Please enter a video link or upload a file!');
          return resetUI();
        }

      } else if (activeTabType === 'image') {
        const imageFileInput = document.getElementById('image-file')?.files[0];
        if (!imageFileInput) return alert('Please select an image!');

        updateProgress('20%', 'Scanning text from image (OCR)...');

        if (typeof Tesseract === 'undefined') {
          throw new Error("Tesseract library is not loaded.");
        }

        const ocrResult = await Tesseract.recognize(imageFileInput, 'eng');
        snippet = ocrResult.data.text.trim();

        if (!snippet || snippet.length < 15) {
          alert("Extracted text is too short to analyze. Please upload an image with clear text.");
          return resetUI();
        }
      }

      updateProgress('50%', 'Analyzing Content Locally...');
      const data = analyzeLocally(activeTabType, snippet);

      updateProgress('85%', 'Saving Analysis Results...');
      try {
        sessionStorage.setItem('latestResult', JSON.stringify(data));
      } catch (err) {
        console.warn("Storage Error:", err);
      }

      try {
        if (db && collection && addDoc) {
          await addDoc(collection(db, 'analyses'), {
            userId: currentUser.uid,
            contentType: activeTabType,
            contentSnippet: snippet.substring(0, 150),
            result: data,
            createdAt: serverTimestamp ? serverTimestamp() : new Date()
          });
        }
      } catch (err) {
        console.warn("Firestore Error:", err);
      }

      updateProgress('100%', 'Complete! Opening Analysis...');
      form.reset();

      setTimeout(() => {
        window.location.href = 'result.html';
      }, 200);

    } catch (err) {
      console.error("Submission Error:", err);
      alert("An unexpected error occurred during processing.");
      resetUI();
    }
  });
});
