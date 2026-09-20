import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // 1. Fetch expired image messages
    const { data: expiredMessages, error: fetchErr } = await supabaseAdmin
      .from('messages')
      .select('id, image_url')
      .eq('message_type', 'image')
      .lte('expires_at', new Date().toISOString());

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!expiredMessages || expiredMessages.length === 0) {
      return NextResponse.json({ deletedCount: 0, message: 'No expired images found' });
    }

    // 2. Delete storage files if image_url is stored in chat-images bucket
    const filePathsToDelete: string[] = [];
    expiredMessages.forEach((msg) => {
      if (msg.image_url) {
        const parts = msg.image_url.split('/chat-images/');
        if (parts[1]) {
          filePathsToDelete.push(parts[1]);
        }
      }
    });

    if (filePathsToDelete.length > 0) {
      await supabaseAdmin.storage.from('chat-images').remove(filePathsToDelete);
    }

    // 3. Delete expired message rows from database
    const expiredIds = expiredMessages.map((m) => m.id);
    const { error: deleteErr } = await supabaseAdmin
      .from('messages')
      .delete()
      .in('id', expiredIds);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: expiredIds.length,
      deletedFiles: filePathsToDelete.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
