import { supabase } from './supabaseService'

export interface UserSettings {
    openai_api_key: string | null
    gemini_api_key: string | null
}

export class SettingsService {
    static async getSettings(userId: string): Promise<UserSettings> {
        const { data, error } = await supabase
            .from('user_settings')
            .select('openai_api_key, gemini_api_key')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            throw error
        }

        return {
            openai_api_key: data?.openai_api_key || null,
            gemini_api_key: data?.gemini_api_key || null
        }
    }

    static async updateSettings(userId: string, settings: UserSettings): Promise<void> {
        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                ...settings,
                updated_at: new Date().toISOString()
            })

        if (error) throw error
    }
}
