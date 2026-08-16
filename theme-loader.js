// LocalStorage मधून सेटिंग्स लोड करून ॲपवर अप्लाय करण्याचे काम ही फाईल करते
function applyGlobalSettings() {
  const savedSettings = JSON.parse(localStorage.getItem('appSettings')) || {
    theme: 'dark-saas',
    language: 'en'
  };

  // 1. Theme Apply करणे (Body वर Class जोडणे)
  document.body.classList.remove('theme-dark-saas', 'theme-midnight-purple', 'theme-cyber-neon', 'theme-light-clean');
  document.body.classList.add(`theme-${savedSettings.theme}`);

  // Light Mode निवडला असल्यास बॅकग्राउंडचा रंग बदलणे
  if (savedSettings.theme === 'light-clean') {
    document.body.style.backgroundColor = '#f3f4f6';
    document.body.style.color = '#1f2937';
  } else if (savedSettings.theme === 'midnight-purple') {
    document.body.style.backgroundColor = '#0f0826';
  } else if (savedSettings.theme === 'cyber-neon') {
    document.body.style.backgroundColor = '#050b14';
  } else {
    // Default Dark SaaS
    document.body.style.backgroundColor = '#0b0f19';
  }
}

// पेज लोड होताच सेटिंग्स लागू करा
document.addEventListener('DOMContentLoaded', applyGlobalSettings);
