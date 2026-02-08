import { supabase } from './supabaseService'
import { OllamaService } from './ollamaService'

const ollamaService = new OllamaService()

interface WhatsAppMessage {
    key: {
        remoteJid: string
        fromMe: boolean
        id: string
    }
    message: any
    messageTimestamp: number
}

interface UserFile {
    name: string
    content: string
}

class WhatsAppPollingService {
    private pollingInterval: number | null = null
    private processedMessages: Set<string> = new Set()
    private isRunning = false
    private isChecking = false
    private lastCheckTime = 0

    async startPolling(userId: string) {
        if (this.isRunning) {
            console.log('⚠️ Polling already running')
            return
        }

        this.isRunning = true
        // Initialize lastCheckTime to NOW (in seconds) to avoid processing history
        this.lastCheckTime = Math.floor(Date.now() / 1000)

        console.log('🚀 Starting WhatsApp polling service for user:', userId, 'Filter Time:', this.lastCheckTime)

        // Initial check
        this.checkForNewMessages(userId)

        // Use a more robust polling approach with setTimeout
        this.runPolling(userId)
    }

    private runPolling(userId: string) {
        if (!this.isRunning) return

        this.pollingInterval = window.setTimeout(async () => {
            await this.checkForNewMessages(userId)
            this.runPolling(userId)
        }, 5000) as unknown as number
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval)
            this.pollingInterval = null
            this.isRunning = false
            console.log('🛑 Stopped WhatsApp polling service')
        }
    }

    private async checkForNewMessages(userId: string) {
        if (this.isChecking) return // Prevent overlapping checks
        this.isChecking = true

        try {
            // Get user settings
            const { data: settings, error: settingsError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .eq('evolution_bot_enabled', true)
                .maybeSingle()

            if (settingsError) {
                console.error('❌ Error fetching settings:', settingsError)
                return
            }

            if (!settings) {
                // User might have logged out or disabled the bot
                // console.log('Bot disabled or settings not found')
                return
            }

            if (!settings.evolution_base_url || !settings.evolution_instance_name) {
                console.warn('⚠️ WhatsApp Info missing')
                return
            }

            const cleanBaseUrl = settings.evolution_base_url.replace(/\/$/, '')
            const instanceName = settings.evolution_instance_name
            const apiKey = settings.evolution_global_api_key || settings.evolution_api_key

            // console.log(`🔍 Checking messages for ${instanceName}...`)

            // Fetch recent messages from Evolution API
            const response = await fetch(
                `${cleanBaseUrl}/chat/findMessages/${instanceName}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': apiKey
                    },
                    body: JSON.stringify({
                        where: {},
                        limit: 5
                    })
                }
            )

            if (!response.ok) {
                console.error('❌ Failed to fetch messages:', response.status, response.statusText)
                return
            }

            let messages: WhatsAppMessage[] = []

            // Handle different response structures
            const responseData = await response.json()
            if (Array.isArray(responseData)) {
                messages = responseData
            } else if (responseData.messages && Array.isArray(responseData.messages.records)) {
                // Evolution API v2 structure
                messages = responseData.messages.records
            } else if (responseData.data && Array.isArray(responseData.data)) {
                messages = responseData.data
            }

            // process messages
            for (const msg of messages) {
                const messageId = msg.key.id

                if (msg.key.fromMe) continue

                if (this.processedMessages.has(messageId)) continue

                // IGNORE OLD MESSAGES: Only process if timestamp is after our start time
                const msgTime = msg.messageTimestamp
                if (msgTime <= this.lastCheckTime) {
                    // console.log(`⏩ Skipping old message: ${messageId} (${msgTime} <= ${this.lastCheckTime})`)
                    this.processedMessages.add(messageId) // Also mark as seen
                    continue
                }

                console.log(`🆕 Processing NEW message: ${messageId} at ${msgTime}`)
                console.log('💬 Text:', this.extractText(msg.message))

                // Mark as processed immediately to prevent double processing
                this.processedMessages.add(messageId)

                // Update lastCheckTime to newest message seen to shrink our window
                if (msgTime > this.lastCheckTime) {
                    // We don't update lastCheckTime globally yet to ensure we don't miss peers in the same batch
                }

                // Extract text
                const text = this.extractText(msg.message)
                if (!text) continue

                // Generate and send response
                await this.handleMessage(userId, settings, msg.key.remoteJid, text)
            }

            // Keep only last 100 processed messages in memory
            if (this.processedMessages.size > 100) {
                const arr = Array.from(this.processedMessages)
                this.processedMessages = new Set(arr.slice(-100))
            }

        } catch (error) {
            console.error('❌ Polling fatal error:', error)
        } finally {
            this.isChecking = false
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
        console.log('--- Handling Message ---')
        console.log('User:', userId)
        console.log('From:', remoteJid)

        try {
            // Send typing indicator
            await this.sendPresence(settings, remoteJid, 'composing')

            // Get knowledge base
            const { data: files } = await supabase
                .from('user_files')
                .select('name, content')
                .eq('user_id', userId)

            const context = files?.map((f: UserFile) => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || ''
            console.log(`📚 Context loaded from ${files?.length || 0} files`)

            // Generate AI response
            console.log('🤖 Generating AI response...')
            // Generate AI response
            console.log('🤖 Generating AI response...')
            const aiResponse = await this.generateAIResponse(settings, context, incomingText, files || [])

            if (!aiResponse) {
                console.error('❌ Failed to generate AI response (Empty)')
                return
            }
            console.log('✨ AI Response ready')

            // Send response
            console.log('📤 Sending WhatsApp response...')
            await this.sendMessage(settings, remoteJid, aiResponse)

            console.log('✅ Sent auto-reply successfully')

        } catch (error) {
            console.error('❌ Error handling message:', error)
        }
    }

    private async sendPresence(settings: any, remoteJid: string, presence: string) {
        const cleanBaseUrl = settings.evolution_base_url.replace(/\/$/, '')
        const instanceName = settings.evolution_instance_name

        try {
            await fetch(`${cleanBaseUrl}/message/sendPresence/${instanceName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': settings.evolution_global_api_key || settings.evolution_api_key
                },
                body: JSON.stringify({
                    number: remoteJid,
                    presence,
                    delay: 1200
                })
            })
        } catch (e) {
            console.error('Error sending presence:', e)
        }
    }

    private async generateAIResponse(settings: any, context: string, question: string, files: any[] = []): Promise<string> {
        const systemPrompt = `أنت مساعد ذكي لخدمة العملاء. أجب فقط بناءً على المعلومات التالية:\n\n${context}`

        const geminiKey = settings.gemini_api_key || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY
        const openaiKey = settings.openai_api_key || import.meta.env.VITE_OPENAI_API_KEY

        // Determine which model to use
        // specific preference > key existence
        let useGemini = settings.use_gemini
        let useOpenAI = settings.use_openai

        // If no specific preference is saved, default to whatever key is available
        // If no specific preference is saved, default to whatever key is available
        if (!useGemini && !useOpenAI && !settings.use_remote_ollama && !settings.use_local_model) {
            if (geminiKey) useGemini = true
            else if (openaiKey) useOpenAI = true
        }

        console.log(`🤖 AI Selection: Gemini=${useGemini}, OpenAI=${useOpenAI}, Ollama=${settings.use_remote_ollama || settings.use_local_model}`)

        try {
            // 1. Ollama (Remote or Local)
            if (settings.use_remote_ollama || settings.use_local_model) {
                console.log('✨ Using Ollama...')
                const isRemote = settings.use_remote_ollama
                const baseUrl = (isRemote ? settings.ollama_base_url : 'http://localhost:11434') || 'http://localhost:11434'
                const model = isRemote ? settings.local_model_name : (settings.local_model_name || 'llama3')
                const apiKey = settings.ollama_api_key

                // Configure service
                ollamaService.setBaseUrl(baseUrl)
                ollamaService.setModel(model)
                ollamaService.setApiKey(apiKey)

                // Generate response using existing service (handles proxy automatically)
                return await ollamaService.generateResponse(question, [], files)
            }

            // 2. Gemini
            if (useGemini && geminiKey) {
                console.log('✨ Using Gemini...')
                // Use v1beta for newer models like 1.5-flash
                const model = settings.gemini_model_name || 'gemini-1.5-flash'
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
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
                if (result.error) {
                    console.error('Gemini API Error:', result.error)
                    return ''
                }
                return result.candidates?.[0]?.content?.parts?.[0]?.text || ''

            } else if (useOpenAI && openaiKey) {
                console.log('✨ Using OpenAI...')
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`
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
                if (result.error) {
                    console.error('OpenAI API Error:', result.error)
                    return ''
                }
                return result.choices?.[0]?.message?.content || ''
            } else {
                console.warn('⚠️ No active AI service found (missing keys or configuration)')
            }
        } catch (e) {
            console.error('AI Generation Error:', e)
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
                'apikey': settings.evolution_global_api_key || settings.evolution_api_key
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
