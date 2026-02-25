import { UserSettings } from './settingsService'

export class InstagramService {
    private static GRAPH_API_URL = 'https://graph.instagram.com'
    private static GRAPH_FB_API_URL = 'https://graph.facebook.com/v21.0'

    /**
     * Sends a text message back to a user on Instagram
     */
    static async sendMessage(settings: UserSettings, recipientId: string, text: string): Promise<boolean> {
        if (!settings.instagram_access_token) {
            console.error('Instagram access token is missing')
            return false
        }

        try {
            const response = await fetch(`${this.GRAPH_FB_API_URL}/me/messages?access_token=${settings.instagram_access_token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient: { id: recipientId },
                    message: { text: text },
                }),
            })

            const data = await response.json()
            if (!response.ok) {
                console.error('Meta API Error Sending Message:', data)
                return false
            }

            return true
        } catch (error) {
            console.error('Failed to send Instagram message:', error)
            return false
        }
    }

    /**
     * Generates the OAuth URL for Instagram connection
     */
    static getOAuthUrl(appId: string, redirectUri: string): string {
        // We use Facebook Login for Business to get Instagram Messaging permissions
        const scopes = [
            'instagram_basic',
            'instagram_manage_messages',
            'pages_show_list',
            'pages_manage_metadata',
            'pages_messaging'
        ].join(',')

        return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`
    }

    /**
     * Exchanges auth code for a short-lived token, then a long-lived one
     * Note: This usually requires a backend/edge function to keep client_secret safe.
     * For this MVP, we might expect the user to provide their own backend or handle it via Edge Function.
     */
}
