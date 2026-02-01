import { User } from '../types'
import { supabase } from './supabaseService'

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error('No user data returned')

    return {
      id: data.user.id,
      username: email.split('@')[0], // Default username
      email: data.user.email || email,
      isLoggedIn: true,
      plan: 'free' // Default plan, could be fetched from DB later
    }
  }

  static async signUp(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error('No user data returned')

    return {
      id: data.user.id,
      username: email.split('@')[0],
      email: data.user.email || email,
      isLoggedIn: true,
      plan: 'free'
    }
  }

  static async verifyOtp(email: string, token: string): Promise<User> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    })

    if (error) throw error
    if (!data.user) throw new Error('No user data returned')

    return {
      id: data.user.id,
      username: email.split('@')[0],
      email: data.user.email || email,
      isLoggedIn: true,
      plan: 'free'
    }
  }

  static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  static async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    return {
      id: session.user.id,
      username: session.user.email?.split('@')[0] || 'User',
      email: session.user.email!,
      isLoggedIn: true,
      plan: 'free'
    }
  }
}
