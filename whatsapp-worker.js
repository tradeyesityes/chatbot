import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error('❌ Missing Supabase credentials in .env or .env.local');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const POLLING_INTERVAL = 5000;
let isPolling = false;

// Global set to avoid processing same message
const processedMessages = new Set();

async function startWorker() {
	console.log('🚀 Starting WhatsApp Backend Worker...');
	
	// Start polling loop
	setInterval(async () => {
		if (isPolling) return;
		isPolling = true;
		
		try {
			await pollAllUsers();
		} catch (error) {
			console.error('Worker polling error:', error.message);
		} finally {
			isPolling = false;
		}
	}, POLLING_INTERVAL);
}

async function pollAllUsers() {
	// 1. Fetch all users who have evolution bot enabled
	const { data: activeUsers, error } = await supabase
		.from('user_settings')
		.select('*')
		.eq('evolution_bot_enabled', true);
		
	if (error) {
		console.error('❌ Error fetching active users:', error.message);
		return;
	}
	
	if (!activeUsers || activeUsers.length === 0) return;
	
	// Fetch global settings if needed
    const { data: globalSettingsRows, error: globalErr } = await supabase
        .from('global_settings')
        .select('*');
        
    const globalSettings = {};
    if (!globalErr && globalSettingsRows) {
        globalSettingsRows.forEach(row => {
            globalSettings[row.key] = row.value;
        });
    }
	
	// 2. Poll for each user
	for (const settings of activeUsers) {
		
		const instanceName = settings.evolution_instance_name || (settings.user_id ? `user_${settings.user_id.substring(0, 8)}` : null);
		if (!instanceName) continue;
		
		const baseUrl = settings.evolution_base_url || globalSettings['evolution_base_url'] || process.env.VITE_EVOLUTION_BASE_URL;
		const globalKey = settings.evolution_global_api_key || globalSettings['evolution_global_api_key'] || process.env.VITE_EVOLUTION_GLOBAL_API_KEY;
		
		if (!baseUrl) continue;
		
		const cleanBaseUrl = baseUrl.replace(/\/$/, '');
		const apiKey = globalKey || settings.evolution_api_key;
		
        console.log(`[Worker Debug] Trying to poll ${instanceName} - URL: ${cleanBaseUrl} - APIKey: ${apiKey ? 'Y' : 'N'}`);
		await pollInstance(settings, cleanBaseUrl, apiKey, instanceName);
	}
	
	// Clear memory
	if (processedMessages.size > 500) {
		const arr = Array.from(processedMessages);
		processedMessages.clear();
		arr.slice(-100).forEach(id => processedMessages.add(id));
	}
}

async function pollInstance(settings, cleanBaseUrl, apiKey, instanceName) {
	const endpoints = [
		`${cleanBaseUrl}/chat/findMessages/${instanceName}`,
		`${cleanBaseUrl}/v2/chat/findMessages/${instanceName}`
	];
	
	let messages = [];
	let requestSuccess = false;
	
	for (const url of endpoints) {
		try {
			const resp = await axios.post(url, { where: {}, limit: 5 }, {
				headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
				timeout: 8000
			});
			
			if (resp.status >= 200 && resp.status < 300) {
				const responseData = resp.data;
                // console.log(`[Worker Debug] Raw response keys for ${instanceName}:`, Object.keys(responseData || {}));
				if (Array.isArray(responseData)) {
					messages = responseData;
				} else if (responseData.messages && Array.isArray(responseData.messages.records)) {
					messages = responseData.messages.records;
				} else if (responseData.messages && Array.isArray(responseData.messages)) {
                    // Added check for responseData.messages being the array directly
                    messages = responseData.messages;
                } else if (responseData.data && Array.isArray(responseData.data)) {
					messages = responseData.data;
				} else if (responseData.records && Array.isArray(responseData.records)) {
                    messages = responseData.records;
                } else {
                    console.log(`[Worker Debug] UNKNOWN RESPONSE FORMAT for ${instanceName}:`, JSON.stringify(responseData).substring(0, 200));
                }
				requestSuccess = true;
				break;
			}
		} catch (e) {
			console.log(`[Worker Debug] Polling ${url} failed for ${instanceName}: ${e.message}`);
		}
	}
	
	if (!requestSuccess || messages.length === 0) return;
	
    console.log(`[Worker Debug] Found ${messages.length} messages for ${instanceName}`);
	
	for (const msg of messages) {
		const messageId = msg.key.id;
		
		if (msg.key.fromMe) continue;
		if (processedMessages.has(messageId)) continue;
		
		// DB Lock to prevent duplicated reading
		try {
			const { error: insertError } = await supabase
				.from('processed_whatsapp_messages')
				.insert({ msg_id: messageId });
				
			if (insertError) {
				if (insertError.code === '23505') { // Unique violation
					processedMessages.add(messageId);
					continue;
				}
			}
		} catch (e) {
			// Ignore other DB errors and proceed
		}
		
		console.log(`🆕 [Worker] Processing message: ${messageId} for user ${settings.user_id}`);
		processedMessages.add(messageId);
		
		const text = extractText(msg.message);
		if (!text) continue;
		
		// Get or create a conversation record for this phone number
		const remoteJid = msg.key.remoteJid;
		const senderName = msg.pushName || msg.key.remoteJid.replace('@s.whatsapp.net', '');
		const convId = await getOrCreateWhatsAppConversation(settings.user_id, remoteJid, senderName);
		
		await handleMessage(settings, remoteJid, text, cleanBaseUrl, apiKey, convId);
	}
}

function extractText(message) {
	return message?.conversation ||
		   message?.extendedTextMessage?.text ||
		   message?.imageMessage?.caption ||
		   message?.videoMessage?.caption ||
		   message?.documentMessage?.caption || '';
}

/**
 * Gets the existing conversation for this WhatsApp phone number or creates a new one.
 * Uses an upsert pattern via unique index on (user_id, phone_number).
 */
async function getOrCreateWhatsAppConversation(userId, remoteJid, senderName) {
	if (!userId || !remoteJid) return null;
	
	try {
		const shortPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
		const title = senderName && senderName !== shortPhone
			? `${senderName} (${shortPhone})`
			: `واتساب: ${shortPhone}`;
			
		const { data: convId, error } = await supabase.rpc('get_or_create_whatsapp_conversation', {
			p_user_id: userId,
			p_phone: remoteJid,
			p_title: title,
			p_visitor_name: senderName || shortPhone
		});
		
		if (error) {
			console.error('[Worker] Error calling RPC get_or_create_whatsapp_conversation:', error.message);
			return null;
		}
		
		return convId;
	} catch (e) {
		console.error('[Worker] getOrCreateWhatsAppConversation error:', e.message);
		return null;
	}
}

async function handleMessage(settings, remoteJid, incomingText, cleanBaseUrl, apiKey, conversationId) {
	try {
		// Send composing state
		await axios.post(`${cleanBaseUrl}/message/sendPresence/${settings.evolution_instance_name}`, {
			number: remoteJid,
			presence: 'composing',
			delay: 1200
		}, { headers: { 'apikey': apiKey } }).catch(() => {});
		
		// Save incoming user message to DB via RPC
		if (settings.user_id && conversationId) {
			const { error } = await supabase.rpc('save_whatsapp_message', {
				p_user_id: settings.user_id,
				p_conversation_id: conversationId,
				p_role: 'user',
				p_content: incomingText
			});
			if (error) console.error('[Worker] Save user msg RPC error:', error.message);
		}

		// 1. Fetch current handover state
		const { data: conv, error: convError } = await supabase
			.from('conversations')
			.select('handover_status, handover_data')
			.eq('id', conversationId)
			.single();

		const normalizeArabic = (text) => {
			if (!text) return '';
			return text
				.replace(/[أإآ]/g, 'ا')
				.replace(/ة/g, 'ه')
				.replace(/ى/g, 'ي')
				.replace(/[\u064B-\u0652]/g, '')
				.trim();
		};

		let status = conv?.handover_status || 'idle';
		let data = conv?.handover_data || {};

		const incomingNormalized = normalizeArabic(incomingText.toLowerCase());
		const keywords = settings.handover_keywords || ['تواصل مع موظف', 'خدمة العملاء', 'موظف', 'مساعدة', 'تحدث مع', 'خدمة عملاء', 'تواصل', 'مشرف'];
		const normalizedKeywords = keywords.map(k => normalizeArabic(k.toLowerCase()));
		
		const isTrigger = normalizedKeywords.some(k => incomingNormalized.includes(k));

		console.log(`[Worker] Handover check: "${incomingText}", Status: ${status}, isTrigger: ${isTrigger}`);

		let handoverResponse = null;

		if ((isTrigger || status !== 'idle') && status !== 'completed') {
			if (status === 'idle') {
				if (!settings.support_email) {
					handoverResponse = "عذراً، يجب على صاحب المتجر إعداد (البريد الإلكتروني للدعم) في الإعدادات لتفعيل نظام التحدث مع الموظفين والتذاكر.";
				} else {
					status = 'collecting_name';
					handoverResponse = "يسعدنا خدمتك وتحويلك للموظف المختص. من فضلك زودنا باسمك الكريم للبدء.";
				}
			} else if (status === 'collecting_name') {
				data.name = incomingText;
				status = 'collecting_phone';
				handoverResponse = `شكراً ${incomingText}. من فضلك زودنا برقم جوالك لنتمكن من التواصل معك.`;
			} else if (status === 'collecting_phone') {
				data.phone = incomingText;
				status = 'collecting_email';
				handoverResponse = "شكراً. من فضلك زودنا ببريدك الإلكتروني (اختياري، اكتب 'تخطي' للمتابعة).";
			} else if (status === 'collecting_email') {
				data.email = (incomingNormalized.includes('تخطي') || incomingNormalized.includes('skip')) ? 'N/A' : incomingText;
				const ticketId = `T-${Math.floor(10000 + Math.random() * 90000)}`;
				data.ticket_id = ticketId;

				// Trigger Email Notification
				supabase.functions.invoke('send-handover-email', {
					body: {
						userId: settings.user_id,
						customerName: data.name,
						customerEmail: data.email,
						customerPhone: data.phone,
						ticketId: data.ticket_id,
						message: incomingText,
						channel: 'WhatsApp'
					}
				}).catch(e => console.error('[Worker] Handover notification failed:', e.message));

				status = 'idle';
				data = {};
				handoverResponse = `تم إنشاء تذكرة برقم #${ticketId}. سيتواصل معك أحد موظفينا قريباً. شكراً لصبرك.`;
			}
		}

		if (handoverResponse) {
			// Update state in DB
			await supabase.from('conversations').update({ 
				handover_status: status, 
				handover_data: data,
				updated_at: new Date().toISOString()
			}).eq('id', conversationId);

			console.log(`[Worker] Handover response: ${handoverResponse}`);
			
			// Send message via Evolution API
			await axios.post(`${cleanBaseUrl}/message/sendText/${settings.evolution_instance_name}`, {
				number: remoteJid,
				text: handoverResponse,
				delay: 1200
			}, { headers: { 'apikey': apiKey } });

			// Save response to DB
			if (settings.user_id && conversationId) {
				await supabase.rpc('save_whatsapp_message', {
					p_user_id: settings.user_id,
					p_conversation_id: conversationId,
					p_role: 'assistant',
					p_content: handoverResponse
				});
			}
			return;
		}
		
		// Fetch user files for RAG context
		let context = '';
		if (settings.user_id) {
			const { data: files } = await supabase
				.from('user_files')
				.select('name, content')
				.eq('user_id', settings.user_id);
				
			context = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || '';
		}
		
		// Generate AI Response
		const aiResponse = await generateAIResponse(settings, context, incomingText);
		
		if (!aiResponse) {
			console.log(`⚠️ [Worker] Empty AI response generated.`);
			return;
		}
		
		// Send WhatsApp Response
		await axios.post(`${cleanBaseUrl}/message/sendText/${settings.evolution_instance_name}`, {
			number: remoteJid,
			text: aiResponse,
			delay: 1200,
			linkPreview: true
		}, { headers: { 'apikey': apiKey } });
		
		// Save AI response to DB via RPC
		if (settings.user_id && conversationId) {
			const { error } = await supabase.rpc('save_whatsapp_message', {
				p_user_id: settings.user_id,
				p_conversation_id: conversationId,
				p_role: 'assistant',
				p_content: aiResponse
			});
			if (error) console.error('[Worker] Save assistant msg RPC error:', error.message);
		}
		
		console.log(`✅ [Worker] Sent reply successfully.`);
	} catch (error) {
		console.error(`❌ [Worker] Error handling message:`, error.message);
	}
}

async function generateAIResponse(settings, context, question) {
	const systemPrompt = `أنت مساعد ذكي لخدمة العملاء. أجب فقط بناءً على المعلومات التالية:\n\n${context}`;
	
	const geminiKey = settings.gemini_api_key || process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;
	const openaiKey = settings.openai_api_key || process.env.VITE_OPENAI_API_KEY;
	
	let useGemini = settings.use_gemini;
	let useOpenAI = settings.use_openai;
	const useOllama = settings.use_remote_ollama || settings.use_local_model;
	
	if (!useGemini && !useOpenAI && !useOllama) {
		if (geminiKey) useGemini = true;
		else if (openaiKey) useOpenAI = true;
	}
	
	try {
        // Ollama
        if (useOllama) {
            const baseUrl = settings.use_remote_ollama ? settings.ollama_base_url : 'http://localhost:11434';
            const model = settings.use_remote_ollama ? settings.local_model_name : (settings.local_model_name || 'llama3');
            
            const reqBody = {
               model: model,
               messages: [
                   { role: 'system', content: systemPrompt },
                   { role: 'user', content: question }
               ],
               stream: false 
            };
            
            const resp = await axios.post(`${baseUrl}/api/chat`, reqBody, {
                headers: settings.ollama_api_key ? { 'Authorization': `Bearer ${settings.ollama_api_key}` } : {}
            });
            return resp.data?.message?.content || '';
        }
		
		// Gemini
		if (useGemini && geminiKey) {
			const model = settings.gemini_model_name || 'gemini-1.5-flash';
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
			const resp = await axios.post(url, {
				contents: [{ parts: [{ text: `${systemPrompt}\n\nالسؤال: ${question}` }] }]
			});
			return resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
		}
		
		// OpenAI
		if (useOpenAI && openaiKey) {
			const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
				model: 'gpt-4o-mini',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: question }
				]
			}, { headers: { 'Authorization': `Bearer ${openaiKey}` } });
			return resp.data?.choices?.[0]?.message?.content || '';
		}
	} catch (e) {
		console.error(`[Worker] AI Generation Error:`, e?.response?.data || e.message);
	}
	
	return '';
}

startWorker();
