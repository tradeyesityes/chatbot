import { supabase } from './supabaseService'

export interface UserSettings {
    use_openai?: boolean
    openai_api_key: string | null
    use_gemini?: boolean
    gemini_api_key: string | null
    gemini_model_name?: string
    use_local_model?: boolean
    local_model_name?: string
    use_remote_ollama?: boolean
    ollama_api_key?: string | null
    ollama_base_url?: string
    use_whatsapp?: boolean
    whatsapp_number?: string | null
    whatsapp_message?: string | null
    evolution_base_url?: string | null
    evolution_api_key?: string | null
    evolution_global_api_key?: string | null
    evolution_instance_name?: string | null
    evolution_bot_enabled?: boolean
    is_admin?: boolean
    is_enabled?: boolean
    is_deleted?: boolean
    use_qdrant?: boolean
    qdrant_url?: string | null
    qdrant_api_key?: string | null
    qdrant_collection?: string
}

export class SettingsService {
    static async getSettings(userId: string): Promise<UserSettings> {
        let { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            throw error
        }

        const defaults: UserSettings = {
            use_openai: data?.use_openai ?? false,
            openai_api_key: data?.openai_api_key || null,
            use_gemini: data?.use_gemini ?? false,
            gemini_api_key: data?.gemini_api_key || null,
            gemini_model_name: data?.gemini_model_name || 'gemini-1.5-flash-latest',
            use_local_model: data?.use_local_model || false,
            local_model_name: data?.local_model_name || 'gpt-oss:120b',
            use_remote_ollama: data?.use_remote_ollama ?? true,
            ollama_api_key: data?.ollama_api_key || (import.meta.env.VITE_OLLAMA_API_KEY || null),
            ollama_base_url: data?.ollama_base_url || 'https://ollama.com',
            use_whatsapp: data?.use_whatsapp || false,
            whatsapp_number: data?.whatsapp_number || null,
            whatsapp_message: data?.whatsapp_message || 'مرحباً، أود الاستفسار عن...',
            evolution_base_url: data?.evolution_base_url || null,
            evolution_api_key: data?.evolution_api_key || null,
            evolution_global_api_key: data?.evolution_global_api_key || null,
            evolution_instance_name: data?.evolution_instance_name || null,
            evolution_bot_enabled: data?.evolution_bot_enabled || false,
            is_admin: data?.is_admin || false,
            is_enabled: data?.is_enabled ?? true,
            is_deleted: data?.is_deleted || false,
            use_qdrant: data?.use_qdrant || false,
            qdrant_url: data?.qdrant_url || null,
            qdrant_api_key: data?.qdrant_api_key || null,
            qdrant_collection: data?.qdrant_collection || 'segments'
        }

        // If no row exists, create it now so the user appears in admin dashboard (JOIN)
        if (!data) {
            console.log(`🆕 Initializing default settings for user: ${userId}`)
            await this.updateSettings(userId, defaults)
        }

        return defaults
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

    static async getGlobalSettings(): Promise<Record<string, string>> {
        const { data, error } = await supabase
            .from('global_settings')
            .select('key, value')

        if (error) {
            console.warn('Global settings table missing or error:', error.message)
            return {}
        }

        return (data || []).reduce((acc: any, item: any) => {
            acc[item.key] = item.value
            return acc
        }, {})
    }
}
