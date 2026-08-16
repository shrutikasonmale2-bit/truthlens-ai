import os
import ssl
import json
import urllib.request
from urllib.parse import quote_plus, urlparse
from bs4 import BeautifulSoup
from PIL import Image
import pytesseract
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB Limit

# Google Fact-Check API Credentials
GOOGLE_FACTCHECK_API_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
GOOGLE_API_KEY = "AIzaSyD00bUiSsbIAwSodmiGBFFXHDDy9QzKBws"

# -------------------------------------------------------------
# 1. REAL-TIME GOOGLE FACT-CHECK API SEARCH
# -------------------------------------------------------------
def check_factcheck_api(query_text):
    try:
        if not query_text or len(query_text.strip()) < 4:
            return None
        
        encoded_query = quote_plus(query_text[:150])
        url = f"{GOOGLE_FACTCHECK_API_URL}?query={encoded_query}&key={GOOGLE_API_KEY}"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        context = ssl._create_unverified_context()
        
        with urllib.request.urlopen(req, timeout=6, context=context) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if "claims" in data and len(data["claims"]) > 0:
                first_claim = data["claims"][0]
                claim_text = first_claim.get("text", "")
                claim_review = first_claim.get("claimReview", [{}])[0]
                
                publisher = claim_review.get("publisher", {}).get("name", "Fact Checker")
                rating = claim_review.get("textualRating", "Unknown")
                review_url = claim_review.get("url", "")
                
                return {
                    "is_found": True,
                    "publisher": publisher,
                    "rating": rating,
                    "claim": claim_text,
                    "url": review_url
                }
    except Exception as e:
        print(f"Fact Check API Error: {e}")
    
    return None

# -------------------------------------------------------------
# 2. IMAGE ELA FORENSICS
# -------------------------------------------------------------
def analyze_image_ela(image_path, quality=90):
    try:
        original = Image.open(image_path).convert('RGB')
        resaved_path = 'temp_resaved.jpg'
        original.save(resaved_path, 'JPEG', quality=quality)
        resaved = Image.open(resaved_path)

        orig_np = np.array(original, dtype=np.float32)
        resaved_np = np.array(resaved, dtype=np.float32)
        diff = np.abs(orig_np - resaved_np)
        
        mean_error = np.mean(diff)
        if os.path.exists(resaved_path):
            os.remove(resaved_path)

        trust_score = max(5.0, min(95.0, 100.0 - (mean_error * 4.5)))
        return round(trust_score, 1), mean_error
    except Exception as e:
        return 50.0, 0.0

# -------------------------------------------------------------
# 3. MARATHI & ENGLISH NLP TEXT ANALYSIS
# -------------------------------------------------------------
def analyze_multilingual_text(text):
    text_lower = text.lower()
    marathi_clickbait = [
        'धक्कादायक', 'अविश्वसनीय', 'सावधान', 'व्हायरल', 'गुप्त', 'बातमी', 
        'नक्की शेअर करा', 'फुकट', 'मोफत', 'चमत्कार', 'सत्य', 'हे पहा', 
        'नक्की पहा', 'त्वरित', 'सावध राहा', 'सत्यता', 'ब्रेकिंग'
    ]
    english_clickbait = [
        'shocking', 'unbelievable', 'viral', 'secret', 'miracle', 'forwarded', 
        'breaking', 'urgent', 'free', 'guaranteed', '100%', 'alert', 'must watch'
    ]
    
    suspicious_keywords = marathi_clickbait + english_clickbait
    found_words = [w for w in suspicious_keywords if w in text_lower]
    matches = len(found_words)
    trust_score = max(15.0, round(90.0 - (matches * 15.0), 1))
    
    return trust_score, matches, found_words

# -------------------------------------------------------------
# API ROUTES
# -------------------------------------------------------------
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "engine": "TruthLens AI Universal Media Authenticity Engine",
        "status": "Active & Live Fact-Check Enabled"
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        input_type = (request.form.get('type') or data.get('type') or request.args.get('type') or 'text').lower()
        text_content = (data.get('content') or data.get('text') or request.form.get('content') or request.form.get('text') or '').strip()

        extracted_text = ""
        fact_check_result = None

        # A. IMAGE SCANNER (OCR + ELA + FACT-CHECK)
        if 'file' in request.files and input_type in ['image', 'screenshot']:
            file = request.files['file']
            temp_path = os.path.join('temp_' + file.filename)
            file.save(temp_path)

            try:
                img_pil = Image.open(temp_path)
                extracted_text = pytesseract.image_to_string(img_pil, lang='mar+eng').strip()
            except Exception as e:
                print(f"OCR Error: {e}")

            ela_score, ela_err = analyze_image_ela(temp_path)
            if os.path.exists(temp_path):
                os.remove(temp_path)

            search_query = extracted_text if extracted_text else text_content
            fact_check_result = check_factcheck_api(search_query)

            if fact_check_result:
                rating_lower = fact_check_result['rating'].lower()
                is_fake = any(w in rating_lower for w in ['fake', 'false', 'incorrect', 'misleading', 'खोटे'])
                trust_score = 15.0 if is_fake else 90.0
            else:
                trust_score = ela_score

            return jsonify({
                "prediction": "Real Fact-Check & Image Forensics",
                "trust_score": trust_score,
                "confidence": 95.0 if fact_check_result else 75.0,
                "risk_level": "HIGH RISK (खोटी बातमी/एडिटेड)" if trust_score < 50 else "LOW RISK (विश्वासार्ह)",
                "extracted_text": extracted_text if extracted_text else "प्रतिमेत मजकूर सापडला नाही",
                "fact_check_status": fact_check_result if fact_check_result else "गूगल डेटाबेसमध्ये नोंद नाही (पिक्सेल विश्लेषणानुसार निकाल)",
                "explanation": f"Fact-Checker Rating: {fact_check_result['rating']}" if fact_check_result else f"ELA Image Analysis Result: {trust_score}%"
            })

        # B. TEXT & NEWS FACT-CHECK SCANNER
        else:
            if not text_content:
                return jsonify({"error": "कृपया विश्लेषण करण्यासाठी मजकूर टाका."}), 400

            fact_check_result = check_factcheck_api(text_content)

            if fact_check_result:
                rating_lower = fact_check_result['rating'].lower()
                is_fake = any(w in rating_lower for w in ['fake', 'false', 'incorrect', 'misleading', 'असात्य', 'खोटे'])
                trust_score = 10.0 if is_fake else 90.0
                risk_level = "HIGH RISK (खोटी बातमी/Fake News)" if is_fake else "LOW RISK (खरी बातमी/Verified)"
                explanation = f"थेट Fact-Checker ({fact_check_result['publisher']}) कडून निकाल: बातमी ही '{fact_check_result['rating']}' ठरवली गेली आहे."
            else:
                trust_score, matches, found_words = analyze_multilingual_text(text_content)
                risk_level = "HIGH RISK" if trust_score < 50 else "LOW RISK"
                explanation = f"गूगल वर थेट नोंद नाही. मजकुरामध्ये {matches} संशयास्पद शब्द आढळले."

            return jsonify({
                "prediction": "Live Fact-Check Scan Complete",
                "trust_score": trust_score,
                "confidence": 92.0 if fact_check_result else 70.0,
                "risk_level": risk_level,
                "category": "रिअल-टाइम बातमी पडताळणी",
                "extracted_text": text_content,
                "fact_check_data": fact_check_result,
                "explanation": explanation
            })

    except Exception as e:
        return jsonify({"error": "Backend Error", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000, threaded=True)
