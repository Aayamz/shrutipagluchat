'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Conversation, Message } from '@/lib/types';
import MessageItem from './MessageItem';
import ImageUploader from './ImageUploader';
import { User, Send, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation;
  currentProfile: Profile;
  onBackMobile: () => void;
  onlineUserIds: Set<string>;
}

export default function ChatArea({
  conversation,
  currentProfile,
  onBackMobile,
  onlineUserIds,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const realTimeChannelRef = useRef<any>(null);
  const supabase = createClient();
  const other = conversation.other_user;

  const isOnline = other ? onlineUserIds.has(other.id) || other.status === 'online' : false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper to send broadcast events
  const sendBroadcast = (event: string, payload: any) => {
    if (realTimeChannelRef.current) {
      realTimeChannelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  };

  // Notify Service Worker of active conversation focus for notification suppression
  useEffect(() => {
    const notifySW = () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_ACTIVE_CHAT',
          conversationId: conversation.id,
          focused: document.hasFocus(),
        });
      }
    };

    notifySW();
    window.addEventListener('focus', notifySW);
    window.addEventListener('blur', notifySW);

    return () => {
      window.removeEventListener('focus', notifySW);
      window.removeEventListener('blur', notifySW);
    };
  }, [conversation.id]);

  // 1. Load initial messages & setup Realtime Channel
  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (isMounted) {
        if (!error && data) {
          setMessages(data as Message[]);

          // If document is focused, mark unread messages as read
          if (document.hasFocus()) {
            const unreadIds = data
              .filter((m: Message) => m.sender_id !== currentProfile.id && m.status !== 'read')
              .map((m: Message) => m.id);

            if (unreadIds.length > 0) {
              await supabase
                .from('messages')
                .update({ status: 'read' })
                .in('id', unreadIds);

              sendBroadcast('mark_read', {
                reader_id: currentProfile.id,
                message_ids: unreadIds,
              });
            }
          }
        }
        setLoadingMessages(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();

    // Setup Unified Realtime Channel (Postgres Changes + Broadcasts)
    const channel = supabase
      .channel(`chat_thread_${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg && newMsg.conversation_id === conversation.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // If received from other
            if (newMsg.sender_id !== currentProfile.id) {
              const isChatFocused = document.hasFocus();
              const targetStatus = isChatFocused ? 'read' : 'delivered';

              supabase
                .from('messages')
                .update({ status: targetStatus })
                .eq('id', newMsg.id);

              channel.send({
                type: 'broadcast',
                event: isChatFocused ? 'mark_read' : 'mark_delivered',
                payload: { sender_target_id: newMsg.sender_id, message_ids: [newMsg.id] },
              });
            }

            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMsg = payload.new as Message;
          if (updatedMsg && updatedMsg.conversation_id === conversation.id) {
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.user_id !== currentProfile.id) {
          setIsTyping(Boolean(payload.payload?.is_typing));
        }
      })
      .on('broadcast', { event: 'mark_delivered' }, (payload) => {
        const delivIds = payload.payload?.message_ids || [];
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentProfile.id &&
            m.status === 'sent' &&
            (delivIds.length === 0 || delivIds.includes(m.id))
              ? { ...m, status: 'delivered' }
              : m
          )
        );
      })
      .on('broadcast', { event: 'mark_read' }, (payload) => {
        const readIds = payload.payload?.message_ids || [];
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentProfile.id &&
            (readIds.length === 0 || readIds.includes(m.id))
              ? { ...m, status: 'read' }
              : m
          )
        );
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realTimeChannelRef.current = channel;
        }
      });

    return () => {
      isMounted = false;
      realTimeChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversation.id, currentProfile.id, supabase]);

  // Handle Typing Indicator Broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    sendBroadcast('typing', {
      user_id: currentProfile.id,
      is_typing: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendBroadcast('typing', {
        user_id: currentProfile.id,
        is_typing: false,
      });
    }, 2000);
  };

  // Send Message
  const handleSendMessage = async (
    e?: React.FormEvent,
    imageUrl?: string
  ) => {
    if (e) e.preventDefault();
    const contentText = inputText.trim();

    if (!contentText && !imageUrl) return;
    if (sending) return;

    setSending(true);
    setInputText('');

    // Clear typing indicator on send
    sendBroadcast('typing', {
      user_id: currentProfile.id,
      is_typing: false,
    });

    const isImage = Boolean(imageUrl);
    const expiresAt = isImage
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Initial status: 'delivered' if recipient is online, else 'sent'
    const initialStatus = isOnline ? 'delivered' : 'sent';

    try {
      const { data: newMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentProfile.id,
          content: isImage ? null : contentText,
          message_type: isImage ? 'image' : 'text',
          image_url: imageUrl || null,
          expires_at: expiresAt,
          status: initialStatus,
        })
        .select()
        .single();

      if (error) {
        alert(`Failed to send message: ${error.message}`);
        setSending(false);
        return;
      }

      // Optimistic append
      if (newMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }

      setTimeout(scrollToBottom, 100);

      // Trigger Web Push Notification asynchronously
      if (other) {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientUserId: other.id,
            senderName: currentProfile.display_name,
            messagePreview: isImage ? '📷 Sent a photo (expires in 24h)' : contentText,
            conversationId: conversation.id,
          }),
        }).catch((err) => console.warn('Push error:', err));
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleImageUploaded = (imageUrl: string) => {
    handleSendMessage(undefined, imageUrl);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas/60 relative">
      {/* Active Header */}
      <div className="h-16 px-4 bg-surface-indigo/90 border-b border-hairline flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 text-ink-muted hover:text-white rounded-lg hover:bg-canvas/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative w-10 h-10 shrink-0">
            <div className="w-full h-full rounded-full bg-surface-onyx border border-hairline overflow-hidden flex items-center justify-center">
              {other?.avatar_url ? (
                <img src={other.avatar_url} alt={other.display_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-ink-muted" />
              )}
            </div>
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green border-2 border-canvas z-10" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">{other?.display_name || 'Chat User'}</h3>
            <p className="text-xs text-ink-muted flex items-center gap-1.5">
              <span>@{other?.username}</span>
              <span>•</span>
              <span className={isOnline ? 'text-green font-medium' : 'text-ink-muted'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-ink-muted gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-ink-muted gap-3 my-auto">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-glow">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">This is the start of your 1:1 conversation</p>
              <p className="text-xs text-ink-muted mt-1">Send a message or a 24h self-destructing photo below!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isSender={msg.sender_id === currentProfile.id}
            />
          ))
        )}

        {/* Typing Indicator Bubble */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-ink-muted italic py-1 px-3 bg-surface-indigo/40 rounded-full w-fit animation-fadeIn">
            <span>{other?.display_name || 'User'} is typing</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary typing-dot-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary typing-dot-2" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary typing-dot-3" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Input Bar */}
      <div className="p-3 md:p-4 bg-surface-indigo/90 border-t border-hairline shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Image Upload Trigger */}
          <ImageUploader onImageUploaded={handleImageUploaded} disabled={sending} />

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message @${other?.username || 'user'}...`}
            className="flex-1 bg-canvas/80 border border-hairline rounded-xl px-4 py-3 text-sm text-white placeholder-ink-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="bg-primary hover:bg-primary-hover active:bg-primary-active text-white p-3 rounded-xl shadow-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
