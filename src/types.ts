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
}
