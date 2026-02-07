import { supabase } from './supabaseService'

interface WhatsAppMessage {
    key: {
        remoteJid: string
        fromMe: boolean
        id: string
    }
    message: any
    messageTimestamp: number
}

class WhatsAppPollingService {
    private pollingInterval: number | null = null
    private processedMessages: Set<string> = new Set()
    private isRunning = false

    async startPolling(userId: string) {
        if (this.isRunning) {
            console.log('Polling already running')
            return
        }

        this.isRunning = true
        console.log('Starting WhatsApp polling service...')

        // Poll every 5 seconds
        this.pollingInterval = window.setInterval(async () => {
            await this.checkForNewMessages(userId)
        }, 5000)
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null
            this.isRunning = false
            console.log('Stopped WhatsApp polling service')
        }
    }

    private async checkForNewMessages(userId: string) {
        try {
            // Get user settings
            const { data: settings } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .eq('evolution_bot_enabled', true)
                .single()

            if (!settings || !settings.evolution_base_url || !settings.evolution_instance_name) {
                return
            }

            const cleanBaseUrl = settings.evolution_base_url.replace(/\/$/, '')
            const instanceName = settings.evolution_instance_name

            // Fetch recent messages from Evolution API
            const response = await fetch(
                `${cleanBaseUrl}/chat/findMessages/${instanceName}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': settings.evolution_global_api_key || settings.evolution_api_key
                    },
                    body: JSON.stringify({
                        where: {},
                        limit: 10
                    })
                }
            )

            if (!response.ok) {
                console.error('Failed to fetch messages:', response.statusText)
                return
            }

            const messages: WhatsAppMessage[] = await response.json()

            // Process new messages
            for (const msg of messages) {
                if (msg.key.fromMe) continue // Skip messages sent by us

                const messageId = msg.key.id
                if (this.processedMessages.has(messageId)) continue

                // Mark as processed
                this.processedMessages.add(messageId)

                // Extract text
                const text = this.extractText(msg.message)
                if (!text) continue

                console.log('New message:', text, 'from:', msg.key.remoteJid)

                // Generate and send response
                await this.handleMessage(userId, settings, msg.key.remoteJid, text)
            }

            // Keep only last 100 processed messages in memory
            if (this.processedMessages.size > 100) {
                const arr = Array.from(this.processedMessages)
                this.processedMessages = new Set(arr.slice(-100))
            }

        } catch (error) {
            console.error('Polling error:', error)
        }
    }

    private extractText(message: any): string {
        return message?.conversation ||
            message?.extendedTextMessage?.text ||
            message?.imageMessage?.caption ||
            message?.videoMessage?.caption ||
            message?.documentMessage?.caption || ''
    }

    private async handleMessage(
        userId: string,
        settings: any,
        remoteJid: string,
        incomingText: string
    ) {
        try {
            // Send typing indicator
            await this.sendPresence(settings, remoteJid, 'composing')

            // Get knowledge base
            const { data: files } = await supabase
                .from('user_files')
                .select('name, content')
                .eq('user_id', userId)

            const context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''

            // Generate AI response
            const aiResponse = await this.generateAIResponse(settings, context, incomingText)

            if (!aiResponse) {
                console.error('Failed to generate AI response')
                return
            }

            // Send response
            await this.sendMessage(settings, remoteJid, aiResponse)

            console.log('Sent auto-reply successfully')

        } catch (error) {
            console.error('Error handling message:', error)
        }
    }

    private async sendPresence(settings: any, remoteJid: string, presence: string) {
        const cleanBaseUrl = settings.evolution_base_url.replace(/\/$/, '')
        const instanceName = settings.evolution_instance_name

        await fetch(`${cleanBaseUrl}/message/sendPresence/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': settings.evolution_api_key
            },
            body: JSON.stringify({
                number: remoteJid,
                presence,
                delay: 1200
            })
        })
    }

    private async generateAIResponse(settings: any, context: string, question: string): Promise<string> {
        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء. أجب فقط بناءً على المعلومات التالية:\n\n${context}`

        if (settings.use_gemini && settings.gemini_api_key) {
            const model = settings.gemini_model_name || 'gemini-1.5-flash-latest'
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${settings.gemini_api_key}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `${systemPrompt}\n\nالسؤال: ${question}` }]
                        }]
                    })
                }
            )
            const result = await response.json()
            return result.candidates?.[0]?.content?.parts?.[0]?.text || ''

        } else if (settings.use_openai && settings.openai_api_key) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.openai_api_key}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ]
                })
            })
            const result = await response.json()
            return result.choices?.[0]?.message?.content || ''
        }

        return ''
    }

    private async sendMessage(settings: any, remoteJid: string, text: string) {
        const cleanBaseUrl = settings.evolution_base_url.replace(/\/$/, '')
        const instanceName = settings.evolution_instance_name

        await fetch(`${cleanBaseUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': settings.evolution_api_key
            },
            body: JSON.stringify({
                number: remoteJid,
                text,
                delay: 1200
            })
        })
    }
}

export const whatsappPollingService = new WhatsAppPollingService()
