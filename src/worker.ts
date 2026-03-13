
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    console.log(`[Worker] Incoming request: ${request.method} ${path}`);

    // Proxy for Ollama Cloud
    if (path.startsWith('/api/ollama-cloud/')) {
      const targetUrl = 'https://ollama.com' + path.replace('/api/ollama-cloud', '') + url.search;
      console.log(`[Worker] Proxying to Ollama Cloud: ${targetUrl}`);
      return forwardRequest(request, targetUrl);
    }

    // Proxy for OpenAI
    if (path.startsWith('/api/openai/')) {
      const targetUrl = 'https://api.openai.com/v1' + path.replace('/api/openai', '') + url.search;
      console.log(`[Worker] Proxying to OpenAI: ${targetUrl}`);
      return forwardRequest(request, targetUrl);
    }

    // Proxy for Supabase
    if (path.startsWith('/api/supabase/')) {
      const targetUrl = 'https://rawobjxsbzpmlwwhmsec.supabase.co' + path.replace('/api/supabase', '') + url.search;
      console.log(`[Worker] Proxying to Supabase: ${targetUrl}`);
      return forwardRequest(request, targetUrl);
    }

    // Default: Serve static assets from the [assets] directory
    // In a Worker with [assets], env.ASSETS is the binding to the asset server
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function forwardRequest(request: Request, targetUrl: string): Promise<Response> {
  const newHeaders = new Headers(request.headers);
  // Important: Remove the host header to let the fetch set it correctly for the target
  newHeaders.delete('host');
  // Also delete refere to avoid potential CORS issues on target
  newHeaders.delete('referer');

  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'follow',
  });

  try {
    const response = await fetch(newRequest);
    const responseHeaders = new Headers(response.headers);
    
    // Add CORS headers to the response to ensure the frontend can read it
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[Worker] Proxy error: ${error.message}`);
    return new Response(JSON.stringify({ error: 'Proxy Error', details: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
