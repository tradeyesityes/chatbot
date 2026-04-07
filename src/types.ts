export type UserPlan = 'free' | 'pro';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  timestamp: Date;
}

export interface FileContext {
  id?: string | number;
  name: string;
  content: string;
  type?: string;
  size?: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  isLoggedIn: boolean;
  plan: UserPlan;
  is_admin?: boolean;
  is_super_admin?: boolean;
}

export type ConversationSource = 'webchat' | 'whatsapp' | 'public' | 'telegram';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  source?: ConversationSource;
  phone_number?: string | null;
  visitor_name?: string | null;
}
