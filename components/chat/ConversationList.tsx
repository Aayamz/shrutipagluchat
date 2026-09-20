'use client';

import { Conversation } from '@/lib/types';
import { User, Image as ImageIcon } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onlineUserIds: Set<string>;
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onlineUserIds,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-64 text-ink-muted">
        <p className="text-sm font-medium text-white mb-1">No chats yet</p>
        <p className="text-xs">Search for a username above to start your first conversation!</p>
      </div>
    );
  }

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-1 p-2 overflow-y-auto">
      {conversations.map((conv) => {
        const other = conv.other_user;
        const isActive = conv.id === activeConversationId;
        const isOnline = other ? onlineUserIds.has(other.id) || other.status === 'online' : false;
        const lastMsg = conv.last_message;

        return (
          <div
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              isActive
                ? 'bg-primary text-white shadow-glow'
                : 'hover:bg-surface-hover text-ink-muted hover:text-white'
            }`}
          >
            {/* Avatar */}
            <div className="relative w-12 h-12 shrink-0">
              <div className="w-full h-full rounded-full bg-surface-onyx border border-hairline overflow-hidden flex items-center justify-center">
                {other?.avatar_url ? (
                  <img src={other.avatar_url} alt={other.display_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-ink-muted" />
                )}
              </div>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green border-2 border-canvas z-10" />
              )}
            </div>

            {/* Conversation Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-white'}`}>
                  {other?.display_name || 'Chat User'}
                </h4>
                {lastMsg && (
                  <span className={`text-[11px] shrink-0 ${isActive ? 'text-white/80' : 'text-ink-muted'}`}>
                    {formatTimestamp(lastMsg.created_at)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-1">
                <p className={`text-xs truncate flex items-center gap-1 ${isActive ? 'text-white/90' : 'text-ink-muted'}`}>
                  {lastMsg ? (
                    lastMsg.message_type === 'image' ? (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Photo</span>
                      </>
                    ) : (
                      lastMsg.content
                    )
                  ) : (
                    <span className="italic text-ink-muted/70">Tap to start messaging</span>
                  )}
                </p>

                {conv.unread_count && conv.unread_count > 0 ? (
                  <span className="bg-magenta text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                    {conv.unread_count}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
