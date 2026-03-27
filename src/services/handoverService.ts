import { supabase } from './supabaseService'

export type HandoverStatus = 'idle' | 'collecting_name' | 'collecting_phone' | 'collecting_email' | 'completed'

export interface HandoverData {
    name?: string
    phone?: string
    email?: string
    ticket_id?: string
}

// In-memory fallback
const sessionCache: Record<string, { status: HandoverStatus, data: HandoverData }> = {};

export class HandoverService {
    private static normalizeArabic(text: string): string {
        if (!text) return '';
        return text
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[\u064B-\u0652]/g, '')
            .trim();
    }

    static async processMessage(
        userId: string, 
        conversationId: string | null, 
        text: string, 
        keywords: string[],
        supportEmail: string | null,
        channel: 'Web' | 'WhatsApp' | 'Telegram',
        likelyNew: boolean = false
    ): Promise<string | null> {
        if (!conversationId) return null;

        const normalizedText = this.normalizeArabic(text.toLowerCase());
        
        // Manual aggressive keywords
        const manualKeywords = ['موظف', 'مساعده', 'تواصل', 'تحدث', 'خدمه عملاء', 'تذكره', 'مشرف'];
        const userKeywords = keywords.map(k => this.normalizeArabic(k.toLowerCase())).filter(k => k.length > 0);
        const allKeywords = userKeywords.length > 0 ? [...userKeywords, ...manualKeywords] : manualKeywords;
        
        const isTrigger = allKeywords.some(k => normalizedText.includes(k));

        let status: HandoverStatus = 'idle';
        let data: HandoverData = {};
        
        if (sessionCache[conversationId]) {
            status = sessionCache[conversationId].status;
            data = sessionCache[conversationId].data;
        } else {
            try {
                const { data: conv } = await supabase
                    .from('conversations')
                    .select('handover_status, handover_data')
                    .eq('id', conversationId)
                    .single();

                if (conv) {
                    status = (conv.handover_status as HandoverStatus) || 'idle';
                    data = (conv.handover_data as HandoverData) || {};
                }
            } catch (e) {
                // Ignore error, use default status
            }
        }

        console.log(`[Handover V1.4] Input: "${text}", Status: ${status}, Trigger: ${isTrigger}`);

        if ((isTrigger || status !== 'idle') && status !== 'completed') {
            if (status === 'idle') {
                if (!supportEmail || supportEmail.trim() === '') {
                    return "نظام التذاكر يحتاج لإضافة (إيميل الدعم) في إعدادات اللوحة لتنبيه الإدارة بطلبك.";
                }
                await this.updateState(conversationId, 'collecting_name', data);
                return "نحن في خدمتك وتحويلك للموظف المختص. من فضلك زودنا باسمك الكريم للبدء.";
            }

            if (status === 'collecting_name') {
                data.name = text;
                await this.updateState(conversationId, 'collecting_phone', data);
                return `شكراً ${text}. من فضلك زودنا برقم جوالك لنتمكن من التواصل معك.`;
            }

            if (status === 'collecting_phone') {
                data.phone = text;
                await this.updateState(conversationId, 'collecting_email', data);
                return "شكراً. من فضلك زودنا ببريدك الإلكتروني (اكتب 'تخطي' للمتابعة).";
            }

            if (status === 'collecting_email') {
                data.email = (normalizedText.includes('تخطي') || normalizedText.includes('skip')) ? 'N/A' : text;
                const ticketId = `T-${Math.floor(10000 + Math.random() * 90000)}`;
                data.ticket_id = ticketId;
                await this.triggerHandoverEmail(userId, data, text, channel);
                await this.updateState(conversationId, 'idle', {}); 
                return `تم إنشاء تذكرة برقم #${ticketId}. سيتواصل معك أحد موظفينا قريباً. شكراً لك.`;
            }
        }

        return null;
    }

    private static async updateState(conversationId: string, status: HandoverStatus, data: HandoverData) {
        sessionCache[conversationId] = { status, data };
        try {
            await supabase
                .from('conversations')
                .update({ handover_status: status, handover_data: data })
                .eq('id', conversationId);
        } catch (e) {}
    }

    private static async triggerHandoverEmail(userId: string, data: HandoverData, lastMessage: string, channel: string) {
        try {
            await supabase.functions.invoke('send-handover-email', {
                body: { userId, customerName: data.name, customerEmail: data.email, customerPhone: data.phone, ticketId: data.ticket_id, message: lastMessage, channel }
            });
        } catch (e) {}
    }
}
