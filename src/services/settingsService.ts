import { supabase } from './supabaseService'

export interface UserSettings {
    use_openai?: boolean
    openai_api_key: string | null
    use_gemini?: boolean
    gemini_api_key: string | null
    use_local_model?: boolean
    local_model_name?: string
    use_remote_ollama?: boolean
    ollama_api_key?: string | null
    ollama_base_url?: string
}

export class SettingsService {
    static async getSettings(userId: string): Promise<UserSettings> {
        const { data, error } = await supabase
            .from('user_settings')
            .select('use_openai, openai_api_key, use_gemini, gemini_api_key, use_local_model, local_model_name, use_remote_ollama, ollama_api_key, ollama_base_url')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            throw error
        }

        return {
            use_openai: data?.use_openai ?? true,
            openai_api_key: data?.openai_api_key || null,
            use_gemini: data?.use_gemini ?? false,
            gemini_api_key: data?.gemini_api_key || null,
            use_local_model: data?.use_local_model || false,
            local_model_name: data?.local_model_name || 'gemma3:4b',
            use_remote_ollama: data?.use_remote_ollama || false,
            ollama_api_key: data?.ollama_api_key || null,
            ollama_base_url: data?.ollama_base_url || 'http://localhost:11434'
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
