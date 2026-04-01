const GTM_ID = 'GTM-MCPLL8PN';
const CONSENT_KEY = 'cookie_consent';

export type ConsentStatus = 'accepted' | 'rejected' | null;

export function getConsentStatus(): ConsentStatus {
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === 'accepted' || value === 'rejected') return value;
  return null;
}

export function setConsentStatus(status: 'accepted' | 'rejected') {
  localStorage.setItem(CONSENT_KEY, status);
}

export function loadGTM() {
  if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`)) return;

  // 1. Inline script: define dataLayer + gtag + consent EXACTLY as Google documents it
  //    This must execute synchronously BEFORE the GTM script loads
  const consentScript = document.createElement('script');
  consentScript.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
  `;
  document.head.appendChild(consentScript);

  // 2. Load GTM script (async)
  const gtmScript = document.createElement('script');
  gtmScript.async = true;
  gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(gtmScript);

  // 3. GTM noscript fallback
  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);
}

export function initGTMIfConsented() {
  if (getConsentStatus() === 'accepted') {
    loadGTM();
  }
}
