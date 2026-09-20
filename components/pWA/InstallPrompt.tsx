'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User installed PWA');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-surface-indigo/95 backdrop-blur-xl border border-primary/40 rounded-xl p-4 shadow-float flex items-center gap-3 animation-fadeIn">
      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white">Install ShrutiPagluChat</h4>
        <p className="text-xs text-ink-muted truncate">Get full-screen mobile app experience</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-green hover:bg-green-hover text-ink-dark text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-ink-muted hover:text-white p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
