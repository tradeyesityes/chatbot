import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta.env as any).VITE_SUPABASE_URL || ''
const SUPABASE_KEY = (import.meta.env as any).VITE_SUPABASE_KEY || ''

const isValidUrl = (u: string) => /^https?:\/\//i.test(u)

const missingClientMessage = 'Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your .env'

const createMissingClient = (): any => {
	const msg = new Error(missingClientMessage)
	return {
		auth: {
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
			getSession: async () => ({ data: { session: null }, error: null }),
			getUser: async () => ({ data: { user: null }, error: msg }),
			signInWithPassword: async () => ({ data: { user: null }, error: msg }),
			signOut: async () => ({ error: msg }),
		},
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
if (SUPABASE_URL && SUPABASE_KEY) {
	// Attempt to use proxy if we are in local development to avoid NetworkError
	const useProxy = (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
	const finalUrl = useProxy ? '/api/supabase' : SUPABASE_URL

	console.log(`🔌 Initializing Supabase with URL: ${finalUrl} (Proxy: ${useProxy})`)
	client = createClient(finalUrl, SUPABASE_KEY)
} else {
	console.warn('⚠️', missingClientMessage)
	client = createMissingClient()
}

export const supabase = client
