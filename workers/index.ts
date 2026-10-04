type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  API_ORIGIN?: string;
};

function unavailable(status: number): Response {
  return Response.json({ detail: 'API 暫時無法使用，請聯絡網站管理者。' }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url);
    if (!incoming.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    let origin: URL;
    try {
      origin = new URL(env.API_ORIGIN || '');
      if (origin.protocol !== 'https:' || origin.username || origin.password ||
          origin.pathname !== '/' || origin.search || origin.hash || origin.origin === incoming.origin) {
        return unavailable(503);
      }
    } catch {
      return unavailable(503);
    }

    const target = new URL(incoming.pathname + incoming.search, origin);
    // Forward only API headers; browser cookies stay on the frontend origin.
    const headers = new Headers();
    for (const name of ['Authorization', 'Content-Type', 'Accept']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    try {
      const response = await fetch(target, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      });
      // API URLs must respond directly; do not forward credentials through redirects.
      if (response.status >= 300 && response.status < 400) return unavailable(502);
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Cache-Control', 'no-store');
      responseHeaders.delete('Set-Cookie');
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch {
      return unavailable(502);
    }
  },
};
