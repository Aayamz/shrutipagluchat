import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Setup VAPID keys if present
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@shrutipagluchat.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushNotificationToUser(
  recipientUserId: string,
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured. Push notification skipped.');
    return;
  }

  // Admin Supabase client to fetch recipient push subscriptions bypassing RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription_json')
    .eq('user_id', recipientUserId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return;
  }

  const notificationPayload = JSON.stringify(payload);

  const pushPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        sub.subscription_json as webpush.PushSubscription,
        notificationPayload
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription has expired or revoked -> cleanup
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id);
      } else {
        console.error('Push notification delivery error:', err);
      }
    }
  });

  await Promise.allSettled(pushPromises);
}
