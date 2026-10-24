// Astro integration that serves the assistant endpoint during `astro dev`, using the same
// handler as the Vercel Function. Production builds are unaffected (the site stays static).
// Settings come from .env / the shell, e.g. ASSISTANT_PROVIDER=mock to try it without an API key.
import { Readable } from 'node:stream';
import { loadEnv } from 'vite';

const HANDLER = '/src/server/assistant/handler.ts';

export default function assistantDevServer() {
  return {
    name: 'assistant-dev-api',
    hooks: {
      'astro:server:setup': ({ server }) => {
        let handle = null;
        let loadedFrom = null;
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !/^\/api\/assistant\/?(\?|$)/.test(req.url)) return next();
          try {
            const mod = await server.ssrLoadModule(HANDLER);
            // Re-create the handler only when the module was reloaded, so rate limits persist.
            if (mod !== loadedFrom) {
              const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };
              handle = mod.createAssistantHandler(env);
              loadedFrom = mod;
            }
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
            headers.set('x-forwarded-for', req.socket.remoteAddress ?? 'unknown');
            const request = new Request(`http://${req.headers.host}${req.url}`, {
              method: req.method,
              headers,
              body: req.method === 'POST' ? Readable.toWeb(req) : undefined,
              duplex: 'half',
            });
            const response = await handle(request);
            res.writeHead(response.status, Object.fromEntries(response.headers));
            if (!response.body) return res.end();
            const reader = response.body.getReader();
            // The visitor went away (closed the panel, pressed Stop): cancel, as a host would.
            res.on('close', () => { if (!res.writableFinished) reader.cancel().catch(() => {}); });
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          } catch (err) {
            next(err);
          }
        });
      },
    },
  };
}
