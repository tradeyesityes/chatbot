import { supabase } from './supabaseService'

export type HandoverStatus = 'idle' | 'collecting_name' | 'collecting_phone' | 'collecting_email' | 'completed'

export interface HandoverData {
    name?: string
    phone?: string
    email?: string
    ticket_id?: string
}

export class HandoverService {
    /**
     * Checks if a message starts or continues a human handover process.
     * Returns a response string if handled, or null if the message should go to AI.
     */
    static async processMessage(
        userId: string, 
        conversationId: string | null, 
        text: string, 
        keywords: string[],
        supportEmail: string | null,
        channel: 'Web' | 'WhatsApp' | 'Telegram'
    ): Promise<string | null> {
        if (!conversationId || !supportEmail) return null;

        // 1. Fetch current handover state
        const { data: conv, error } = await supabase
            .from('conversations')
            .select('handover_status, handover_data')
            .eq('id', conversationId)
            .single();

        if (error || !conv) return null;

        let status = (conv.handover_status as HandoverStatus) || 'idle';
        let data = (conv.handover_data as HandoverData) || {};

        const lowerText = text.toLowerCase();
        const isTrigger = keywords.some(k => lowerText.includes(k.toLowerCase()));

        // 2. State Machine
        if (isTrigger && status === 'idle') {
            await this.updateState(conversationId, 'collecting_name', data);
            return "يسعدنا خدمتك وتحويلك لموظف المختص. من فضلك زودنا باسمك الكريم للبدء.";
        }

        if (status === 'collecting_name') {
            data.name = text;
            await this.updateState(conversationId, 'collecting_phone', data);
            return `شكراً ${text}. من فضلك زودنا برقم جوالك لنتمكن من التواصل معك.`;
        }

        if (status === 'collecting_phone') {
            data.phone = text;
            await this.updateState(conversationId, 'collecting_email', data);
            return "شكراً. من فضلك زودنا ببريدك الإلكتروني (اختياري، اكتب 'تخطي' للمتابعة).";
        }

        if (status === 'collecting_email') {
            data.email = lowerText.includes('تخطي') || lowerText.includes('skip') ? 'N/A' : text;
            const ticketId = `T-${Math.floor(10000 + Math.random() * 90000)}`;
            data.ticket_id = ticketId;

            // Trigger Email Notification
            await this.triggerHandoverEmail(userId, data, text, channel);

            // Finalize
            await this.updateState(conversationId, 'idle', {}); // Reset for future use or stay idle
            return `تم إنشاء تذكرة برقم #${ticketId}. سيتواصل معك أحد موظفينا قريباً عبر الجوال أو البريد الإلكتروني. شكراً لصبرك.`;
        }

        return null;
    }

    private static async updateState(conversationId: string, status: HandoverStatus, data: HandoverData) {
        await supabase
            .from('conversations')
            .update({ 
                handover_status: status, 
                handover_data: data,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId);
    }

    private static async triggerHandoverEmail(userId: string, data: HandoverData, lastMessage: string, channel: string) {
        try {
            await supabase.functions.invoke('send-handover-email', {
                body: {
                    userId,
                    customerName: data.name,
                    customerEmail: data.email,
                    customerPhone: data.phone,
                    ticketId: data.ticket_id,
                    message: lastMessage,
                    channel
                }
            });
        } catch (e) {
            console.error('Failed to trigger handover email:', e);
        }
    }
}
