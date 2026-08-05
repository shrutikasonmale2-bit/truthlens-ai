from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # CORS Error टाळण्यासाठी

# व्हिडिओ किंवा मोठ्या फाईल्ससाठी Max Size (उदा. 100MB Limit)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # १. फाईल (Image / Video) चेक करणे
        if 'file' in request.files:
            file = request.files['file']
            filename = file.filename
            
            if filename == '':
                return jsonify({"error": "No file selected"}), 400

            # फाईलचा प्रकार ओळखणे (Image vs Video)
            content_type = request.form.get('type', 'media')

            # इथे तुमचा Video Processing / Deepfake Detection Model चा कोड येईल
            # उदाहरणासाठी Dummy Response:
            return jsonify({
                "trust_score": 72,
                "risk_level": "Moderate Risk",
                "content_type": content_type,
                "message": f"Video '{filename}' analyzed successfully!"
            })

        # २. Text डेटासाठी
        data = request.get_json(silent=True) or {}
        text_content = data.get('content', '')

        return jsonify({
            "trust_score": 85,
            "risk_level": "Low Risk",
            "content_type": "text",
            "message": "Text analyzed successfully!"
        })

    except Exception as e:
        print("Server Error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)