// Path तपासा: जर firebase.js 'js' फोल्डरमध्ये असेल तर './js/firebase.js' करा
import { auth, db, collection, query, where, getDocs, onAuthStateChanged, doc, deleteDoc } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    const loadingElem = document.getElementById('loading-history');
    const historyContainer = document.getElementById('history-container') || document.querySelector('.glass-card');

    if (!user) {
      if (loadingElem) loadingElem.innerText = "Please log in first.";
      return;
    }

    try {
      const q = query(
        collection(db, 'analyses'), 
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        if (loadingElem) loadingElem.innerText = "No scan history found.";
        return;
      }

      let historyHTML = '';

      querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const docId = docSnap.id;

        // १. Trust Score ची अचूक व्हॅल्यू घेणे
        const rawScore = item.trust_score ?? item.trustScore ?? item.score ?? (item.result?.confidence || 0);
        const numericScore = typeof rawScore === 'number' ? rawScore : parseFloat(rawScore || 0);
        const scoreFormatted = numericScore.toFixed(1);

        // २. Risk Level चे लॉजिक (५०% पेक्षा कमी असल्यास High Risk)
        const isHighRisk = item.risk_level === 'HIGH RISK' || 
                           item.risk_level === 'High Manipulation Risk' || 
                           numericScore < 50.0 ||
                           item.result?.label === 'FAKE' || 
                           item.result?.isFake === true;

        const riskBadge = isHighRisk 
          ? `<span style="color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.15); padding: 4px 10px; border-radius: 6px; border: 1px solid #ef4444;">HIGH RISK</span>`
          : `<span style="color: #22c55e; font-weight: bold; background: rgba(34, 197, 94, 0.15); padding: 4px 10px; border-radius: 6px; border: 1px solid #22c55e;">LOW RISK</span>`;

        // ३. Snippet स्वच्छ करणे
        let rawSnippet = item.extracted_text || item.contentSnippet || item.text || item.scraped_snippet || 'No preview available';
        rawSnippet = rawSnippet.replace(/^"+|"+$/g, '').trim();

        historyHTML += `
          <div class="history-item" style="display: flex; justify-content: space-between; padding: 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.1); align-items: center; background: rgba(255,255,255,0.02); margin-bottom: 8px; border-radius: 8px;">
            <div style="max-width: 60%;">
              <span style="font-size: 0.75rem; background: #7c3aed; color: #fff; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 600;">${item.category || item.contentType || 'Text'}</span>
              <p style="margin-top: 0.6rem; color: #e2e8f0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;" title="${rawSnippet}">
                "${rawSnippet}"
              </p>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 1rem;">
              <div>
                <div style="font-size: 1.2rem; font-weight: bold; color: ${isHighRisk ? '#ef4444' : '#22c55e'}; margin-bottom: 0.3rem;">
                  ${scoreFormatted}%
                </div>
                <div>${riskBadge}</div>
              </div>
              <button class="delete-btn" data-id="${docId}" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; padding: 6px 10px; border-radius: 6px; cursor: pointer; margin-left: 10px;">
                Delete
              </button>
            </div>
          </div>
        `;
      });

      if (loadingElem && loadingElem.parentElement) {
        loadingElem.parentElement.innerHTML = historyHTML;
      } else if (historyContainer) {
        historyContainer.innerHTML = historyHTML;
      }

      // ४. Delete बटणासाठी Event Listeners
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          if (confirm('Are you sure you want to delete this scan record?')) {
            try {
              await deleteDoc(doc(db, 'analyses', id));
              const itemRow = e.target.closest('.history-item');
              if (itemRow) itemRow.remove();
            } catch (err) {
              console.error("Delete error:", err);
              alert("Failed to delete record.");
            }
          }
        });
      });

    } catch (error) {
      console.error("Error loading history:", error);
      if (loadingElem) loadingElem.innerText = "Failed to load history.";
    }
  });
});
