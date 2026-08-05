import { auth, db, collection, query, where, getDocs, onAuthStateChanged } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  // १. युझर लॉगिन असण्याची वाट पाहणे
  onAuthStateChanged(auth, async (user) => {
    const historyContainer = document.getElementById('history-container') || document.querySelector('.metric-grid') || document.querySelector('.glass-card');

    if (!user) {
      console.log("User not logged in.");
      return;
    }

    try {
      console.log("Fetching history for user:", user.uid);

      // २. Firestore मधून सध्याच्या युझरचा डेटा आणणे
      const q = query(collection(db, 'analyses'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // जर कोणतीही हिस्ट्री नसेल तर
        const loadingElem = document.getElementById('loading-history');
        if (loadingElem) loadingElem.innerText = "No scan history found.";
        return;
      }

      // ३. मिळालेला डेटा HTML मध्ये दाखवणे
      let historyHTML = '';
      querySnapshot.forEach((doc) => {
        const item = doc.data();
        const score = item.result?.trust_score ?? item.result?.score ?? '--';
        const risk = item.result?.risk_level ?? item.result?.risk ?? 'N/A';
        const type = item.contentType || 'Text';
        const snippet = item.contentSnippet || 'No preview available';

        historyHTML += `
          <div class="history-item" style="display: flex; justify-content: space-between; padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); align-items: center;">
            <div>
              <span style="font-size: 0.8rem; background: #7c3aed; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${type}</span>
              <p style="margin-top: 0.5rem; color: #ccc;">"${snippet}..."</p>
            </div>
            <div style="text-align: right;">
              <h3 style="color: #7c3aed; margin: 0;">${score}%</h3>
              <small style="color: #aaa;">Risk: ${risk}</small>
            </div>
          </div>
        `;
      });

      // ४. "Loading history..." ऐवजी ओरिजिनल डेटा दाखवणे
      const loadingElem = document.getElementById('loading-history');
      if (loadingElem) {
        loadingElem.parentElement.innerHTML = historyHTML;
      } else if (historyContainer) {
        historyContainer.innerHTML = historyHTML;
      }

    } catch (error) {
      console.error("Error loading history:", error);
      const loadingElem = document.getElementById('loading-history');
      if (loadingElem) loadingElem.innerText = "Failed to load history.";
    }
  });
});