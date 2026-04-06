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

		// --- Unified Handover Logic (v2.0) ---
		try {
			const { data: handoverData, error: handoverError } = await supabase.rpc('process_handover_message', {
				p_conversation_id: conversationId,
				p_message_text: incomingText,
				p_keywords: settings.handover_keywords || [],
				p_channel: 'WhatsApp'
			});

			if (handoverError) {
				console.error('[Worker] Handover RPC Error:', handoverError.message);
			} else if (handoverData && handoverData.length > 0) {
				const result = handoverData[0];
				const handoverResponse = result.response_text;

				if (handoverResponse) {
					console.log(`[Worker] Handover response: ${handoverResponse}`);
					
					// Send message via Evolution API
					await axios.post(`${cleanBaseUrl}/message/sendText/${settings.evolution_instance_name}`, {
						number: remoteJid,
						text: handoverResponse,
						delay: 1200
					}, { headers: { 'apikey': apiKey } });

					// Save response to DB via RPC
					if (settings.user_id && conversationId) {
						await supabase.rpc('save_whatsapp_message', {
							p_user_id: settings.user_id,
							p_conversation_id: conversationId,
							p_role: 'assistant',
							p_content: handoverResponse
						});
					}

					// If ticket completed, trigger email
					if (result.should_send_email) {
						supabase.functions.invoke('send-handover-email', {
							body: {
								userId: result.user_id,
								customerName: result.customer_name,
								customerEmail: result.customer_email,
								customerPhone: result.customer_phone,
								ticketId: result.ticket_id,
								message: incomingText,
								channel: 'WhatsApp'
							}
						}).catch(e => console.error('[Worker] Handover notification failed:', e.message));
					}
					return; // Stop processing further (no AI response)
				}
			}
		} catch (e) {
			console.error('[Worker] Handover processing exception:', e.message);
		}
		
		// --- RAG System (v2.0: Vector Search with Fallback) ---
		let context = '';
		const openaiKey = settings.openai_api_key || process.env.VITE_OPENAI_API_KEY;

		if (settings.user_id && openaiKey) {
			try {
				console.log(`[Worker] Generating embedding for: "${incomingText.substring(0, 30)}..."`);
				// 1. Generate Embedding
				const embRes = await axios.post('https://api.openai.com/v1/embeddings', {
					input: incomingText,
					model: 'text-embedding-3-small'
				}, { headers: { 'Authorization': `Bearer ${openaiKey}` } });
				
				const embedding = embRes.data.data[0].embedding;

				// 2. Vector Search via Supabase RPC
				const { data: segments, error: vError } = await supabase.rpc('match_file_segments', {
					query_embedding: embedding,
					match_threshold: 0.20,
					match_count: 8,
					p_user_id: settings.user_id
				});

				if (vError) throw vError;

				if (segments && segments.length > 0) {
					context = segments.map(s => s.content).join('\n\n---\n\n');
					console.log(`[Worker] Vector search found ${segments.length} segments.`);
				}
			} catch (err) {
				console.error(`[Worker] Vector search failed: ${err.message}. Falling back to keyword search.`);
			}
		}

		// Fallback: Keyword-based context scoring
		if (!context && settings.user_id) {
			const { data: files } = await supabase
				.from('user_files')
				.select('name, content')
				.eq('user_id', settings.user_id);
				
			const allContent = files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join('\n\n---\n\n') || '';
			context = buildKeywordContext(allContent, incomingText, 40000);
			console.log(`[Worker] Keyword fallback selected ${context.length} chars of context.`);
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

function buildKeywordContext(allContent, query, maxChars = 40000) {
	if (!allContent || allContent.length <= maxChars) return allContent;
	
	const paragraphs = allContent.split(/\n\s*\n/);
	const queryKeywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
	
	const scoredParagraphs = paragraphs.map(p => {
		let score = 0;
		const lowerP = p.toLowerCase();
		queryKeywords.forEach(kw => {
			if (lowerP.includes(kw)) score += 1;
		});
		return { text: p, score };
	});

	scoredParagraphs.sort((a, b) => b.score - a.score);
	
	let result = "";
	for (const p of scoredParagraphs) {
		if ((result.length + p.text.length) > maxChars) break;
		result += (result ? "\n\n---\n\n" : "") + p.text;
	}
	return result || allContent.substring(0, maxChars);
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
