'use client';

import { Profile, Conversation } from '@/lib/types';
import { User, LogOut, Search, MessageSquare } from 'lucide-react';
import ConversationList from './ConversationList';
import PushNotificationToggle from '../pWA/PushNotificationToggle';

interface SidebarProps {
  currentProfile: Profile | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenSearch: () => void;
  onSignOut: () => void;
  onlineUserIds: Set<string>;
}

export default function Sidebar({
  currentProfile,
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenSearch,
  onSignOut,
  onlineUserIds,
}: SidebarProps) {
  return (
    <aside className="w-full md:w-80 lg:w-96 bg-surface-indigo/90 border-r border-hairline flex flex-col h-full shrink-0">
      {/* App & User Header */}
      <div className="p-4 border-b border-hairline flex items-center justify-between bg-canvas/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 shrink-0">
            <div className="w-full h-full rounded-full bg-primary/20 border border-primary/40 overflow-hidden flex items-center justify-center">
              {currentProfile?.avatar_url ? (
                <img
                  src={currentProfile.avatar_url}
                  alt={currentProfile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green border-2 border-canvas z-10" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {currentProfile?.display_name || 'My Profile'}
            </h3>
            <p className="text-xs text-ink-muted truncate">
              @{currentProfile?.username || 'user'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <PushNotificationToggle />
          <button
            onClick={onSignOut}
            title="Log Out"
            className="p-2 text-ink-muted hover:text-red-400 hover:bg-canvas/60 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Start Chat Button */}
      <div className="p-3 border-b border-hairline bg-canvas/20">
        <button
          onClick={onOpenSearch}
          className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-glow transition-all flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>New Chat (Search Username)</span>
        </button>
      </div>

      {/* Conversations Section Header */}
      <div className="px-4 py-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-muted border-b border-hairline/40">
        <span>Direct Messages</span>
        <span className="text-xs text-primary font-bold">{conversations.length}</span>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onlineUserIds={onlineUserIds}
        />
      </div>
    </aside>
  );
}
