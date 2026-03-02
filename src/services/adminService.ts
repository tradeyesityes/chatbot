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
        const { email, user_id, is_deleted, ...updateData } = settings

        const { error } = await supabase
            .from('user_settings')
            .update(updateData)
            .eq('user_id', userId)

        if (error) throw error
    }

    static async toggleUserStatus(userId: string, enabled: boolean): Promise<void> {
        await this.updateUserSettings(userId, { is_enabled: enabled })
    }

    static async deleteUser(userId: string): Promise<void> {
        // Soft delete: keep row but mark as deleted and disabled
        await this.updateUserSettings(userId, {
            is_enabled: false,
            is_deleted: true
        })
    }
}
