import { supabase } from './supabaseService'

export class HandoverService {
    /**
     * Processes a message for human handover using the unified Supabase RPC.
     * This handles state transitions, keyword detection, and returns the bot's response.
     */
    static async processMessage(
        userId: string, 
        conversationId: string | null, 
        text: string, 
        keywords: string[],
        _supportEmail: string | null, // Kept for signature compatibility
        channel: 'Web' | 'WhatsApp' | 'Telegram'
    ): Promise<string | null> {
        if (!conversationId) return null;

        try {
            // Call the unified RPC
            const { data, error } = await supabase.rpc('process_handover_message', {
                p_conversation_id: conversationId,
                p_message_text: text,
                p_keywords: keywords,
                p_channel: channel
            });

            if (error) {
                console.error('[Handover RPC Error]', error);
                return null;
            }

            // The RPC returns a single row if a handover is triggered or in progress
            if (data && data.length > 0) {
                const result = data[0];

                // If the ticket was just completed, trigger the email notification
                if (result.should_send_email) {
                    await this.triggerHandoverEmail({
                        userId: result.user_id,
                        customerName: result.customer_name,
                        customerEmail: result.customer_email,
                        customerPhone: result.customer_phone,
                        ticketId: result.ticket_id,
                        message: text,
                        channel: channel
                    });
                }

                return result.response_text;
            }
        } catch (err: any) {
            console.error('[Handover Service Exception]', err);
        }

        return null;
    }

    private static async triggerHandoverEmail(payload: {
        userId: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        ticketId: string;
        message: string;
        channel: string;
    }) {
        try {
            await supabase.functions.invoke('send-handover-email', {
                body: payload
            });
        } catch (e) {
            console.error('[Handover Email Error]', e);
        }
    }
}
