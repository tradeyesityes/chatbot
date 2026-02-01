import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta.env as any).VITE_SUPABASE_URL || ''
const SUPABASE_KEY = (import.meta.env as any).VITE_SUPABASE_KEY || ''

const isValidUrl = (u: string) => /^https?:\/\//i.test(u)

const missingClientMessage = 'Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your .env'

const createMissingClient = (): any => {
	const msg = new Error(missingClientMessage)
	return {
		from: (_table: string) => ({
			insert: async () => ({ error: msg }),
			select: (_sel?: any) => ({
				eq: async () => ({ data: [], error: msg }),
			}),
			delete: () => ({
				eq: async () => ({ error: msg }),
			}),
		}),
	}
}

let client: SupabaseClient | any
if (SUPABASE_URL && SUPABASE_KEY && isValidUrl(SUPABASE_URL)) {
	client = createClient(SUPABASE_URL, SUPABASE_KEY)
} else {
	console.warn('⚠️', missingClientMessage)
	client = createMissingClient()
}

export const supabase = client
