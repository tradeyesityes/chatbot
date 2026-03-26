import { supabase } from './supabaseService'

export type HandoverStatus = 'idle' | 'collecting_name' | 'collecting_phone' | 'collecting_email' | 'completed'

export interface HandoverData {
    name?: string
    phone?: string
    email?: string
    ticket_id?: string
}

export class HandoverService {
    private static normalizeArabic(text: string): string {
        if (!text) return '';
        return text
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[\u064B-\u0652]/g, '') // Remove harakat
            .trim();
    }

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
        channel: 'Web' | 'WhatsApp' | 'Telegram',
        likelyNew: boolean = false
    ): Promise<string | null> {
        if (!conversationId) return null;

        const normalizedText = this.normalizeArabic(text.toLowerCase());
        const baseKeywords = (keywords && keywords.length > 0) ? keywords : ['موظف', 'مساعدة', 'تحدث مع', 'خدمة عملاء', 'تواصل', 'مشرف'];
        const normalizedKeywords = baseKeywords.map(k => this.normalizeArabic(k.toLowerCase()));
        const isTrigger = normalizedKeywords.some(k => normalizedText.includes(k));

        // 1. Fetch current handover state
        let status: HandoverStatus = 'idle';
        let data: HandoverData = {};
        
        try {
            const { data: conv, error } = await supabase
                .from('conversations')
                .select('handover_status, handover_data')
                .eq('id', conversationId)
                .single();

            if (error) {
                console.error('[Handover] DB Fetch Error:', error);
                if ((error as any).code === '42703') {
                    if (isTrigger) return "⚠️ النظام يحتاج لتفعيل: يرجى تشغيل كود SQL المذكور سابقاً في Supabase (إضافة handover_status).";
                    return null;
                }
                // If it's a new conversation, it might not be in DB yet due to lag
                if (likelyNew) status = 'idle';
                else return null; 
            } else if (conv) {
                status = (conv.handover_status as HandoverStatus) || 'idle';
                data = (conv.handover_data as HandoverData) || {};
            }
        } catch (e) {
            console.error('[Handover] Critical Error:', e);
            if (likelyNew) status = 'idle';
            else return null;
        }

        console.log(`[Handover] Channel: ${channel}, Input: "${text}", Status: ${status}, isTrigger: ${isTrigger}`);

        // 2. State Machine
        if ((isTrigger || status !== 'idle') && status !== 'completed') {
            
            if (status === 'idle') {
                if (!supportEmail || supportEmail.trim() === '') {
                    return "عذراً، يجب على صاحب المتجر إعداد (البريد الإلكتروني للدعم) في الإعدادات لتفعيل نظام التحدث مع الموظفين والتذاكر.";
                }
                
                await this.updateState(conversationId, 'collecting_name', data);
                return "يسعدنا خدمتك وتحويلك للموظف المختص. من فضلك زودنا باسمك الكريم للبدء.";
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
                data.email = (normalizedText.includes('تخطي') || normalizedText.includes('skip')) ? 'N/A' : text;
                const ticketId = `T-${Math.floor(10000 + Math.random() * 90000)}`;
                data.ticket_id = ticketId;

                // Trigger Email Notification
                await this.triggerHandoverEmail(userId, data, text, channel);

                // Finalize
                await this.updateState(conversationId, 'idle', {}); // Reset
                return `تم إنشاء تذكرة برقم #${ticketId}. سيتواصل معك أحد موظفينا قريباً. شكراً لصبرك.`;
            }
        }

        return null;
    }

    private static async updateState(conversationId: string, status: HandoverStatus, data: HandoverData) {
        try {
            await supabase
                .from('conversations')
                .update({ 
                    handover_status: status, 
                    handover_data: data,
                    updated_at: new Date().toISOString()
                })
                .eq('id', conversationId);
        } catch (e) {
            console.error('[Handover] Failed to update state:', e);
        }
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
            console.error('[Handover] Failed to trigger email:', e);
        }
    }
}
