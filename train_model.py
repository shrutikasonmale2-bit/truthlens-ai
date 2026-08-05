import pandas as pd
import numpy as np
import re
import string
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>+', '', text)
    text = re.sub(r'[%s]' % re.escape(string.punctuation), '', text)
    text = re.sub(r'\n', '', text)
    text = re.sub(r'\w*\d\w*', '', text)
    return text

def train():
    try:
        fake_df = pd.read_csv('Fake.csv')
        true_df = pd.read_csv('True.csv')
    except Exception as e:
        print("Error reading CSV files. Ensure Fake.csv and True.csv exist.")
        return

    fake_df['label'] = 0
    true_df['label'] = 1

    df = pd.concat([fake_df, true_df], axis=0).reset_index(drop=True)
    df['text'] = df['text'].apply(clean_text)

    X = df['text']
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    vectorizer = TfidfVectorizer(max_features=5000)
    X_train_vec = vectorizer.fit_transform(X_train)

    model = LogisticRegression()
    model.fit(X_train_vec, y_train)

    joblib.dump(model, 'model.pkl')
    joblib.dump(vectorizer, 'vectorizer.pkl')
    print("Model and vectorizer trained and saved successfully.")

if __name__ == '__main__':
    train()