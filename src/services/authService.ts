import { User } from '../types'
import { supabase } from './supabaseService'

export class AuthService {
  static async login(email: string, password: string, captchaToken?: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken
      }
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

  static async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
  }

  static async signInWithMicrosoft(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
  }

  static async signUp(email: string, password: string, captchaToken?: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        emailRedirectTo: window.location.origin
      }
    })

    if (error) throw error
    if (!data.user) throw new Error('No user data returned')

    // If identities is an empty array, it means the user already exists
    // (Supabase returns 200/success for existing emails for security, but identities will be empty)
    if (data.user.identities && data.user.identities.length === 0) {
      throw new Error('هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.')
    }

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

  static async resetPassword(email: string, captchaToken?: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken
    })
    if (error) throw error
  }

  static async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: password
    })
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
