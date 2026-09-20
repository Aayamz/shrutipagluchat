export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline';
  last_seen: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_one: string;
  user_two: string;
  created_at: string;
  // Computed / joined fields
  other_user?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image';
  image_url: string | null;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  expires_at: string | null;
}

export interface PushSubscriptionData {
  id?: string;
  user_id: string;
  subscription_json: PushSubscriptionJSON;
  created_at?: string;
}

export interface PresenceState {
  user_id: string;
  username: string;
  display_name: string;
  status: 'online' | 'offline';
  online_at: string;
  typing?: boolean;
}
