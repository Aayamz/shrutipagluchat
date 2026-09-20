'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { Search, X, User, MessageSquarePlus, Loader2 } from 'lucide-react';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onSelectUser: (user: Profile) => void;
}

export default function UserSearchModal({
  isOpen,
  onClose,
  currentUserId,
  onSelectUser,
}: UserSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const cleanQ = query.trim().toLowerCase().replace('@', '');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, status, last_seen, created_at')
        .neq('id', currentUserId)
        .or(`username.ilike.%${cleanQ}%,display_name.ilike.%${cleanQ}%`)
        .limit(10);

      if (!error && data) {
        setResults(data as Profile[]);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, currentUserId, supabase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-md flex items-center justify-center p-4 animation-fadeIn">
      <div className="w-full max-w-md bg-surface-indigo border border-hairline rounded-xl p-6 shadow-float flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-hairline mb-4">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-display font-semibold text-white">Start a New Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-white p-1 rounded-lg hover:bg-canvas/50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username (e.g. @shruti)"
            className="w-full bg-canvas/80 border border-hairline rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-ink-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          {loading && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {query.trim() && results.length === 0 && !loading && (
            <div className="text-center py-8 text-ink-muted text-xs">
              No users found matching "@{query}"
            </div>
          )}

          {!query.trim() && (
            <div className="text-center py-8 text-ink-muted text-xs">
              Type a username above to search for people.
            </div>
          )}

          {results.map((user) => (
            <div
              key={user.id}
              onClick={() => {
                onSelectUser(user);
                onClose();
              }}
              className="flex items-center justify-between p-3 rounded-lg bg-canvas/40 hover:bg-surface-hover border border-transparent hover:border-hairline cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 shrink-0">
                  <div className="w-full h-full rounded-full bg-surface-onyx border border-hairline overflow-hidden flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-ink-muted" />
                    )}
                  </div>
                  {user.status === 'online' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green border-2 border-canvas z-10" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-primary transition-all">
                    {user.display_name}
                  </h4>
                  <p className="text-xs text-ink-muted truncate">@{user.username}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 group-hover:bg-primary group-hover:text-white px-3 py-1 rounded-md transition-all">
                Chat
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
