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

    static async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
        const { error } = await supabase
            .from('user_settings')
            .update(settings)
            .eq('user_id', userId)

        if (error) throw error
    }

    static async toggleUserStatus(userId: string, enabled: boolean): Promise<void> {
        await this.updateUserSettings(userId, { is_enabled: enabled })
    }

    static async deleteUser(userId: string): Promise<void> {
        // This only deletes settings, not the auth user.
        // Full user deletion usually requires admin-level access to auth.admin
        const { error } = await supabase
            .from('user_settings')
            .delete()
            .eq('user_id', userId)

        if (error) throw error
    }
}
