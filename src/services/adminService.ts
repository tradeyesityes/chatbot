import { supabase } from './supabaseService'
import { UserSettings } from './settingsService'

export interface AdminUser extends UserSettings {
    user_id: string
    email?: string
}

export class AdminService {
    static async getUsers(): Promise<AdminUser[]> {
        // Fetch settings and emails from the view
        const { data: settings, error: settingsError } = await supabase
            .from('admin_user_view')
            .select('*')

        if (settingsError) throw settingsError

        return settings || []
    }

    static async updateUserSettings(userId: string, settings: any): Promise<void> {
        // Clone and remove fields that are not in the database table
        const { 
            email, 
            user_id, 
            is_deleted, 
            created_at, 
            updated_at, 
            last_sign_in_at, 
            ...updateData 
        } = settings

        const { error } = await supabase
            .from('user_settings')
            .update(updateData)
            .eq('user_id', userId)

        if (error) throw error
    }

    static async toggleUserStatus(userId: string, enabled: boolean): Promise<void> {
        await this.updateUserSettings(userId, { is_enabled: enabled })
    }

    static async toggleUserFreeze(userId: string, frozen: boolean): Promise<void> {
        await this.updateUserSettings(userId, { is_frozen: frozen })
    }

    static async deleteUser(userId: string): Promise<void> {
        // Soft delete: keep row but mark as deleted and disabled
        await this.updateUserSettings(userId, {
            is_enabled: false,
            is_deleted: true
        })
    }

    static async getUserFiles(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('user_files')
            .select('name, type, size, created_at')
            .eq('user_id', userId)

        if (error) throw error
        return data || []
    }

    static async getUserConversations(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    }

    static async getConversationMessages(userId: string, conversationId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', userId)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return data || []
    }

    static async getFileContent(userId: string, fileName: string): Promise<string> {
        const { data, error } = await supabase
            .from('user_files')
            .select('content')
            .eq('user_id', userId)
            .eq('name', fileName)
            .single()

        if (error) throw error
        return data?.content || ''
    }
}
