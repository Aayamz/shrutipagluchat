'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, Conversation } from '@/lib/types';
import Sidebar from '@/components/chat/Sidebar';
import ChatArea from '@/components/chat/ChatArea';
import UserSearchModal from '@/components/chat/UserSearchModal';
import InstallPrompt from '@/components/pWA/InstallPrompt';
import { MessageSquare, Loader2 } from 'lucide-react';

function ChatContent() {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // 1. Authenticate user & load Profile + Conversations
  useEffect(() => {
    let isMounted = true;

    const initChat = async () => {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.push('/login');
        return;
      }

      // Fetch Profile
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profErr || !profile) {
        // Retry or fallback
        console.error('Error loading profile:', profErr);
      }

      if (isMounted && profile) {
        setCurrentProfile(profile as Profile);
      }

      // Fetch Conversations
      await fetchConversations(user.id);

      if (isMounted) setLoading(false);
    };

    initChat();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  // Fetch Conversations helper
  const fetchConversations = async (userId: string) => {
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user_one.eq.${userId},user_two.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error || !convs) return;

    // Fetch other user profile & last message for each conversation
    const populatedConvs = await Promise.all(
      convs.map(async (c) => {
        const otherId = c.user_one === userId ? c.user_two : c.user_one;
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherId)
          .single();

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...c,
          other_user: otherProfile as Profile,
          last_message: lastMsg || undefined,
        };
      })
    );

    setConversations(populatedConvs);

    // Auto-select conversation if query parameter `c` exists
    const queryConvId = searchParams.get('c');
    if (queryConvId && populatedConvs.some((c) => c.id === queryConvId)) {
      setActiveConversationId(queryConvId);
      setShowMobileChat(true);
    }
  };

  // Sync browser URL search params with activeConversationId for Service Worker notification suppression
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = activeConversationId ? `/chat?c=${activeConversationId}` : '/chat';
      window.history.replaceState(null, '', url);
    }
  }, [activeConversationId]);

  const [onlinePresences, setOnlinePresences] = useState<Map<string, { active_conversation_id?: string | null }>>(new Map());
  const presenceChannelRef = useRef<any>(null);

  // 2. Global Presence & Realtime Listener
  useEffect(() => {
    if (!currentProfile) return;

    // Presence channel
    const presenceChannel = supabase.channel('online_users');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set<string>();
        const presencesMap = new Map<string, { active_conversation_id?: string | null }>();

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) {
              onlineIds.add(p.user_id);
              presencesMap.set(p.user_id, { active_conversation_id: p.active_conversation_id });
            }
          });
        });
        setOnlineUserIds(onlineIds);
        setOnlinePresences(presencesMap);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          presenceChannelRef.current = presenceChannel;
          await presenceChannel.track({
            user_id: currentProfile.id,
            active_conversation_id: activeConversationId,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Realtime listener for incoming conversations & messages
    const globalMsgChannel = supabase
      .channel(`user_global_${currentProfile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as any;
          setConversations((prev) => {
            const convIndex = prev.findIndex((c) => c.id === newMsg.conversation_id);
            if (convIndex === -1) {
              fetchConversations(currentProfile.id);
              return prev;
            }
            const targetConv = { ...prev[convIndex], last_message: newMsg };
            const updated = [...prev];
            updated.splice(convIndex, 1);
            return [targetConv, ...updated];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const newC = payload.new as any;
          if (newC.user_one === currentProfile.id || newC.user_two === currentProfile.id) {
            fetchConversations(currentProfile.id);
          }
        }
      )
      .subscribe();

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(globalMsgChannel);
    };
  }, [currentProfile, supabase]);

  // Update presence track when active conversation changes
  useEffect(() => {
    if (currentProfile && presenceChannelRef.current) {
      presenceChannelRef.current.track({
        user_id: currentProfile.id,
        active_conversation_id: activeConversationId,
        online_at: new Date().toISOString(),
      });
    }
  }, [activeConversationId, currentProfile]);

  // Handle selecting a user from search -> start or find conversation
  const handleSelectUserFromSearch = async (targetUser: Profile) => {
    if (!currentProfile) return;

    // 1. Check local state first
    const existing = conversations.find((c) => c.other_user?.id === targetUser.id);
    if (existing) {
      setActiveConversationId(existing.id);
      setShowMobileChat(true);
      return;
    }

    const u1 = currentProfile.id < targetUser.id ? currentProfile.id : targetUser.id;
    const u2 = currentProfile.id < targetUser.id ? targetUser.id : currentProfile.id;

    // 2. Query DB directly for existing conversation between these 2 users
    const { data: dbConv } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user_one.eq.${u1},user_two.eq.${u2}),and(user_one.eq.${u2},user_two.eq.${u1})`)
      .maybeSingle();

    if (dbConv) {
      const convWithOther: Conversation = {
        ...dbConv,
        other_user: targetUser,
      };
      setConversations((prev) => {
        if (prev.some((c) => c.id === dbConv.id)) return prev;
        return [convWithOther, ...prev];
      });
      setActiveConversationId(dbConv.id);
      setShowMobileChat(true);
      return;
    }

    // 3. Insert new conversation if not found
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        user_one: u1,
        user_two: u2,
      })
      .select()
      .maybeSingle();

    if (error) {
      // Gracefully handle duplicate key constraint by re-fetching existing conversation
      const { data: retryConv } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user_one.eq.${u1},user_two.eq.${u2}),and(user_one.eq.${u2},user_two.eq.${u1})`)
        .maybeSingle();

      if (retryConv) {
        const convWithOther: Conversation = {
          ...retryConv,
          other_user: targetUser,
        };
        setConversations((prev) => [convWithOther, ...prev.filter((c) => c.id !== retryConv.id)]);
        setActiveConversationId(retryConv.id);
        setShowMobileChat(true);
        return;
      }

      alert(`Could not start conversation: ${error.message}`);
      return;
    }

    if (newConv) {
      const createdConv: Conversation = {
        ...newConv,
        other_user: targetUser,
      };
      setConversations((prev) => [createdConv, ...prev]);
      setActiveConversationId(createdConv.id);
      setShowMobileChat(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm text-ink-muted">Loading ShrutiPagluChat...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-canvas overflow-hidden flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Desktop always visible, Mobile hidden when active chat is open) */}
        <div className={`h-full ${showMobileChat ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
          <Sidebar
            currentProfile={currentProfile}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => {
              setActiveConversationId(id);
              setShowMobileChat(true);
            }}
            onOpenSearch={() => setSearchModalOpen(true)}
            onSignOut={handleSignOut}
            onlineUserIds={onlineUserIds}
          />
        </div>

        {/* Chat Area Pane */}
        <div className={`flex-1 h-full ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation && currentProfile ? (
            <ChatArea
              conversation={activeConversation}
              currentProfile={currentProfile}
              onBackMobile={() => setShowMobileChat(false)}
              onlineUserIds={onlineUserIds}
              onlinePresences={onlinePresences}
            />
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center flex-1 text-center p-8 bg-canvas/60 text-ink-muted">
              <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary shadow-glow">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                ShrutiPagluChat
              </h2>
              <p className="text-sm max-w-sm">
                Select a conversation from the left sidebar or search for a username to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {currentProfile && (
        <UserSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          currentUserId={currentProfile.id}
          onSelectUser={handleSelectUserFromSearch}
        />
      )}

      {/* PWA Installation Prompt Banner */}
      <InstallPrompt />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-white gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm text-ink-muted">Loading ShrutiPagluChat...</span>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
