import joblib
import re
import string
import os

class TrustAnalyzer:
    def __init__(self, model_name='model.pkl', vectorizer_name='vectorizer.pkl'):
        # सध्याच्या फाईलची डिरेक्टरी (Folder Path) शोधणे
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, model_name)
        vectorizer_path = os.path.join(base_dir, vectorizer_name)

        try:
            self.model = joblib.load(model_path)
            self.vectorizer = joblib.load(vectorizer_path)
            print(" ML Model and Vectorizer Loaded Successfully!")
        except Exception as e:
            print(f" Warning: Could not load model files. Error: {e}")
            self.model = None
            self.vectorizer = None

    def clean_text(self, text):
        text = text.lower()
        text = re.sub(r'https?://\S+|www\.\S+', '', text)
        text = re.sub(r'<.*?>+', '', text)
        text = re.sub(r'[%s]' % re.escape(string.punctuation), '', text)
        text = re.sub(r'\n', '', text)
        text = re.sub(r'\w*\d\w*', '', text)
        return text

    def analyze(self, text, input_type="text"):
        cleaned = self.clean_text(text)
        
        # संशयास्पद शब्दांची यादी
        suspicious_keywords = [
            "shocking", "unbelievable", "secret", "guaranteed", 
            "miracle", "conspiracy", "click here", "cure", "free", "viral"
        ]
        found_keywords = [word for word in suspicious_keywords if word in cleaned]
        
        # १. जर ML Model लोड झाले असेल तर ML Prediction चालवणे
        if self.model and self.vectorizer:
            vec = self.vectorizer.transform([cleaned])
            prob = self.model.predict_proba(vec)[0]
            truth_prob = prob[1]
            trust_score = round(truth_prob * 100, 2)
        else:
            # २. जर ML Model नसेल तर Dynamic Rule-Based Fallback
            if len(found_keywords) >= 2:
                trust_score = 20.0  # खूप जास्त संशयास्पद शब्द -> High Risk
            elif len(found_keywords) == 1:
                trust_score = 50.0  # १ संशयास्पद शब्द -> Medium Risk
            else:
                trust_score = 88.0  # एकही संशयास्पद शब्द नाही -> Low Risk / Real

        # Trust Score नुसार मेसेज ठरवणे
        if trust_score >= 80:
            risk_level = "Low Risk"
            prediction = "Real / Authentic"
            explanation = "The content aligns with patterns commonly associated with reliable and verified sources."
            recommendation = "Content appears authentic. Verify primary sources for additional validation."
        elif trust_score >= 45:
            risk_level = "Medium Risk"
            prediction = "Unverified / Mixed"
            explanation = "The content displays a mix of standard narrative structures and unverified assertions."
            recommendation = "Cross-reference claims with established media outlets before sharing."
        else:
            risk_level = "High Risk"
            prediction = "Potentially Fake / Suspicious"
            explanation = "High presence of sensational language, unverified claims, or suspicious phrasing."
            recommendation = "Exercise extreme caution. Do not distribute without independent verification."

        return {
            "prediction": prediction,
            "trust_score": trust_score,
            "confidence": round(max(trust_score, 100 - trust_score), 2),
            "risk_level": risk_level,
            "category": input_type.capitalize(),
            "explanation": explanation,
            "keywords": found_keywords if found_keywords else ["None detected"],
            "recommendations": recommendation
        }