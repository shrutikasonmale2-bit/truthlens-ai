import { auth, db, collection, query, where, getDocs, onAuthStateChanged } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. युझर लॉगिन असण्याची वाट पाहणे
  onAuthStateChanged(auth, async (user) => {
    const historyContainer = document.getElementById('history-container') || document.querySelector('.glass-card');
    const loadingElem = document.getElementById('loading-history');

    if (!user) {
      console.log("User not logged in.");
      if (loadingElem) loadingElem.innerText = "Please log in to view history.";
      return;
    }

    try {
      console.log("Fetching history for user:", user.uid);

      // 2. Firestore मधून सध्याच्या युझरचा डेटा आणणे
      const q = query(
        collection(db, 'analyses'), 
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        if (loadingElem) loadingElem.innerText = "No scan history found.";
        return;
      }

      // 3. डेटा फॉरमॅट करून HTML तयार करणे
      let historyHTML = '';

      querySnapshot.forEach((doc) => {
        const item = doc.data();

        // High Risk / Fake चेकिंग
        const isFake = item.result?.label === 'FAKE' || item.result?.isFake === true;
        
        // Trust Score Calc
        const confidence = item.result?.confidence || 88.5;
        const score = isFake ? (100 - confidence).toFixed(1) : confidence;

        // Risk Level Badge
        const riskBadge = isFake 
          ? `<span style="color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.15); padding: 4px 10px; border-radius: 6px; border: 1px solid #ef4444;">HIGH RISK</span>`
          : `<span style="color: #22c55e; font-weight: bold; background: rgba(34, 197, 94, 0.15); padding: 4px 10px; border-radius: 6px; border: 1px solid #22c55e;">LOW RISK</span>`;

        const type = item.contentType || 'Text';
        const snippet = item.contentSnippet || 'No preview available';

        historyHTML += `
          <div class="history-item" style="display: flex; justify-content: space-between; padding: 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.1); align-items: center; background: rgba(255,255,255,0.02); margin-bottom: 8px; border-radius: 8px;">
            <div style="max-width: 65%;">
              <span style="font-size: 0.75rem; background: #7c3aed; color: #fff; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 600;">${type}</span>
              <p style="margin-top: 0.6rem; color: #e2e8f0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">
                "${snippet}"
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.2rem; font-weight: bold; color: ${isFake ? '#ef4444' : '#22c55e'}; margin-bottom: 0.3rem;">
                ${score}%
              </div>
              <div>${riskBadge}</div>
            </div>
          </div>
        `;
      });

      // 4. "Loading history..." काढणे आणि टेबलमध्ये दाखवणे
      if (loadingElem && loadingElem.parentElement) {
        loadingElem.parentElement.innerHTML = historyHTML;
      } else if (historyContainer) {
        historyContainer.innerHTML = historyHTML;
      }

    } catch (error) {
      console.error("Error loading history:", error);
      if (loadingElem) loadingElem.innerText = "Failed to load history.";
    }
  });
});
