import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

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

	// Failover Logic: Redirect between Cloudflare and Coolify if one is broken
	const hostname = window.location.hostname
	const searchParams = new URLSearchParams(window.location.search)
	const isFailover = searchParams.get('failover') === 'true'

	if (!isFailover) {
		const cloudflareUrl = 'chatbot-1.pentalogin.workers.dev'
		const coolifyUrl = 'qgk48ccwskgc444ow04o4088.babclick.eu.org'

		if (hostname.includes('pentalogin.workers.dev')) {
			console.log('🔄 Failover: Redirecting to Coolify...')
			window.location.href = `https://${coolifyUrl}/?failover=true`
		} else if (hostname.includes('babclick.eu.org')) {
			console.log('🔄 Failover: Redirecting to Cloudflare...')
			window.location.href = `https://${cloudflareUrl}/?failover=true`
		}
	}
}

export const supabase = client
