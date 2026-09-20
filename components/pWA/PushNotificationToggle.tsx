'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationToggle() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setSubscribed(true);
      });
    });
  }, []);

  const toggleSubscription = async () => {
    if (!supported || loading) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } else {
        // Subscribe
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          alert('VAPID public key is not configured in .env');
          setLoading(false);
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Notification permission was denied.');
          setLoading(false);
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        // Send to backend
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        });

        if (res.ok) {
          setSubscribed(true);
        } else {
          console.error('Failed to save push subscription on server');
        }
      }
    } catch (err) {
      console.error('Error toggling push subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={toggleSubscription}
      disabled={loading}
      title={subscribed ? 'Push Notifications Enabled' : 'Enable Push Notifications'}
      className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-medium ${
        subscribed
          ? 'bg-green/15 text-green border-green/30 hover:bg-green/25'
          : 'bg-surface-indigo/60 text-ink-muted border-hairline hover:text-white hover:border-primary'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : subscribed ? (
        <Bell className="w-4 h-4 text-green" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">
        {subscribed ? 'Notifications On' : 'Enable Push'}
      </span>
    </button>
  );
}
