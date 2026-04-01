import { useState, useEffect } from 'react';
import { getConsentStatus, setConsentStatus, loadGTM } from '../../utils/gtm';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsentStatus() === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setConsentStatus('accepted');
    loadGTM();
    setVisible(false);
  };

  const handleReject = () => {
    setConsentStatus('rejected');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-5">
        <p className="text-sm text-gray-700 leading-relaxed">
          We use analytics cookies (Google Analytics) to understand how the site is used and improve the experience.
          We do not collect personally identifiable data.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
