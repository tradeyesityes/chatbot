import { Message, Conversation } from '../types'
import { supabase } from './supabaseService'

export class ChatService {
    /**
     * Fetches all conversations for a user
     */
    static async getConversations(userId: string): Promise<Conversation[]> {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching conversations:', error)
            return []
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            title: row.title,
            created_at: new Date(row.created_at)
        }))
    }

    /**
     * Creates a new conversation
     */
    static async createConversation(userId: string, title: string): Promise<Conversation> {
        const { data, error } = await supabase
            .from('conversations')
            .insert({ user_id: userId, title })
            .select()
            .single()

        if (error) throw error

        return {
            id: data.id,
            user_id: data.user_id,
            title: data.title,
            created_at: new Date(data.created_at)
        }
    }

    /**
     * Saves a single message to Supabase
     */
    static async saveMessage(userId: string, message: Message, conversationId?: string | null): Promise<void> {
        const { error } = await supabase
            .from('chat_messages')
            .insert({
                user_id: userId,
                role: message.role,
                content: message.content,
                conversation_id: conversationId || null
            })

        if (error) {
            console.error('Error saving message:', error)
            throw error
        }
    }

    /**
     * Fetches the chat history for a user/conversation
     */
    static async getMessages(userId: string, conversationId?: string | null): Promise<Message[]> {
        try {
            let query = supabase
                .from('chat_messages')
                .select('*')
                .eq('user_id', userId)

            if (conversationId) {
                query = query.eq('conversation_id', conversationId)
            } else {
                query = query.is('conversation_id', null)
            }

            const { data, error } = await query

            if (error) throw error

            // Map and sort locally
            const messages = (data || []).map((row: any) => ({
                id: row.id.toString(),
                role: row.role as 'user' | 'assistant' | 'model',
                content: row.content,
                timestamp: row.created_at ? new Date(row.created_at) : (row.id ? new Date(Number(row.id)) : new Date())
            }))

            // Sort by timestamp or fallback to id
            return messages.sort((a: Message, b: Message) => {
                const timeA = a.timestamp.getTime()
                const timeB = b.timestamp.getTime()
                if (timeA !== timeB) return timeA - timeB
                return Number(a.id) - Number(b.id)
            })
        } catch (error: any) {
            console.error('Error fetching messages:', error)
            return [] // Return empty instead of crashing the app
        }
    }

    /**
     * Clears chat history for a user or specific conversation
     */
    static async clearChat(userId: string, conversationId?: string): Promise<void> {
        let query = supabase
            .from('chat_messages')
            .delete()
            .eq('user_id', userId)

        if (conversationId) {
            query = query.eq('conversation_id', conversationId)
        } else {
            query = query.is('conversation_id', null)
        }

        const { error } = await query

        if (error) {
            console.error('Error clearing chat:', error)
            throw error
        }
    }

    /**
     * Deletes a conversation and all its associated messages
     */
    static async deleteConversation(userId: string, conversationId: string): Promise<void> {
        // First delete all messages in the conversation
        const { error: messagesError } = await supabase
            .from('chat_messages')
            .delete()
            .eq('user_id', userId)
            .eq('conversation_id', conversationId)

        if (messagesError) {
            console.error('Error deleting messages:', messagesError)
            throw messagesError
        }

        // Then delete the conversation itself
        const { error: conversationError } = await supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId)
            .eq('user_id', userId)

        if (conversationError) {
            console.error('Error deleting conversation:', conversationError)
            throw conversationError
        }
    }
}
