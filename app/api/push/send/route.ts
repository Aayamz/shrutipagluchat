import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotificationToUser } from '@/lib/push/send-push';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientUserId, senderName, messagePreview, conversationId } = await req.json();

    if (!recipientUserId || !senderName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await sendPushNotificationToUser(recipientUserId, {
      title: `Message from ${senderName}`,
      body: messagePreview || 'Sent an attachment',
      icon: '/icons/icon-192.png',
      url: `/chat?c=${conversationId || ''}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
