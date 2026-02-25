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
            // Add a small random jitter (0-800ms) to avoid synchronized polling between instances
            await new Promise(r => setTimeout(r, Math.random() * 800))
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

            if (!settings) return

            // Poll for each enabled channel
            const channels = []
            if (settings.evolution_bot_enabled) channels.push({ type: 'whatsapp', instance: settings.evolution_instance_name || `user_${userId.substring(0, 8)}` })

            if (channels.length === 0) return

            let baseUrl = settings.evolution_base_url || import.meta.env.VITE_EVOLUTION_BASE_URL
            let globalKey = settings.evolution_global_api_key || import.meta.env.VITE_EVOLUTION_GLOBAL_API_KEY

            // AS A FINAL RESORT: Check the global_settings table in DB
            if (!baseUrl || !globalKey) {
                try {
                    // We import SettingsService here to avoid potential circular dependencies if any
                    const { SettingsService } = await import('./settingsService')
                    const globals = await SettingsService.getGlobalSettings()
                    baseUrl = baseUrl || globals['evolution_base_url']
                    globalKey = globalKey || globals['evolution_global_api_key']
                } catch (e) {
                    console.error('Failed to fetch global settings fallback:', e)
                }
            }

            const cleanBaseUrl = baseUrl.replace(/\/$/, '')
            const apiKey = globalKey || settings.evolution_api_key

            for (const channel of channels) {
                const instanceName = channel.instance
                const isInstagram = false

                // Try standard and v2 endpoints
                const endpoints = [
                    `${cleanBaseUrl}/chat/findMessages/${instanceName}`,
                    `${cleanBaseUrl}/v2/chat/findMessages/${instanceName}`
                ]

                let response = null
                let successfulUrl = (this as any)[`_cachedPollUrl_${channel.type}`] || null

                if (successfulUrl) {
                    try {
                        const resp = await fetch(successfulUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': apiKey
                            },
                            body: JSON.stringify({ where: {}, limit: 5 })
                        })
                        if (resp.ok) response = resp
                    } catch (e) {
                        (this as any)[`_cachedPollUrl_${channel.type}`] = null
                    }
                }

                if (!response) {
                    for (const url of endpoints) {
                        try {
                            const resp = await fetch(url, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'apikey': apiKey
                                },
                                body: JSON.stringify({ where: {}, limit: 5 })
                            })
                            if (resp.ok) {
                                response = resp
                                    ; (this as any)[`_cachedPollUrl_${channel.type}`] = url
                                break
                            }
                        } catch (e) {
                            console.warn(`Polling attempt failed at ${url}`)
                        }
                    }
                }

                if (!response || !response.ok) {
                    continue // Try next channel
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

                    // 1. LOCAL MEMORY CHECK
                    if (this.processedMessages.has(messageId)) continue

                    // 2. LOCAL STORAGE CHECK (for multiple tabs on same domain)
                    const storageKey = `wa_msg_${messageId}`
                    if (localStorage.getItem(storageKey)) {
                        this.processedMessages.add(messageId)
                        continue
                    }

                    // IGNORE OLD MESSAGES: Only process if timestamp is after our start time
                    const msgTime = msg.messageTimestamp
                    if (msgTime <= this.lastCheckTime) {
                        this.processedMessages.add(messageId)
                        localStorage.setItem(storageKey, '1')
                        continue
                    }

                    // 3. DATABASE CHECK & LOCK
                    // Try to register in DB - THIS IS OUR HARD LOCK
                    try {
                        const { error: insertError } = await supabase
                            .from('processed_whatsapp_messages' as any)
                            .insert({ msg_id: messageId })

                        if (insertError) {
                            // 23505 = unique_violation (another instance is already processing)
                            if (insertError.code === '23505') {
                                this.processedMessages.add(messageId)
                                localStorage.setItem(storageKey, '1')
                                continue
                            }
                            // If it's 42P01 (table doesn't exist), we log once and proceed 
                            // with duplication risk but service continuity
                        }
                    } catch (e) {
                        // Fail silently and proceed if anything else goes wrong with the DB check
                    }

                    console.log(`🆕 Processing NEW ${channel.type} message: ${messageId} at ${msgTime}`)
                    console.log('💬 Text:', this.extractText(msg.message))

                    // Mark as processed immediately locally
                    this.processedMessages.add(messageId)
                    localStorage.setItem(storageKey, '1')

                    // Extract text
                    const text = this.extractText(msg.message)
                    if (!text) continue

                    // Generate and send response
                    await this.handleMessage(userId, settings, msg.key.remoteJid, text, isInstagram)
                }
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
        incomingText: string,
        isInstagram: boolean = false
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
            console.log(`📤 Sending ${isInstagram ? 'Instagram' : 'WhatsApp'} response...`)
            await this.sendMessage(settings, remoteJid, aiResponse, isInstagram)

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

    private async sendMessage(settings: any, remoteJid: string, text: string, isInstagram: boolean = false) {
        const cleanBaseUrl = settings.evolution_base_url.replace(/\/$/, '')
        const instanceName = isInstagram ? settings.instagram_instance_name : settings.evolution_instance_name

        await fetch(`${cleanBaseUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': settings.evolution_global_api_key || settings.evolution_api_key
            },
            body: JSON.stringify({
                number: remoteJid,
                text,
                delay: 1200,
                linkPreview: !isInstagram // Instagram might not support linkPreview in the same way
            })
        })
    }
}

export const whatsappPollingService = new WhatsAppPollingService()
