// vite.config.js
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import serveStatic from 'serve-static';
import history from 'connect-history-api-fallback';

function ipadicRawMiddleware() {
  // Connect-compatible handler
  const handler = (req, res, next) => {
    const url = req.url || '';
    if (url.startsWith('/vendor/ipadic/') && url.endsWith('.gz')) {
      // Serve raw bytes from public/vendor/ipadic
      const diskPath = path.join(process.cwd(), 'public', url.replace(/^\/+/, ''));
      fs.readFile(diskPath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end('Not found');
        }
        // IMPORTANT: send raw gzip with identity encoding
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Encoding', 'identity');
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
        // Just in case anything upstream set it
        try {
          res.removeHeader('Content-Encoding');
        } catch {}
        // Explicitly write the bytes and finish
        res.end(data);
      });
      return; // handled
    }
    next();
  };

  return {
    name: 'ipadic-raw-top',
    configureServer(server) {
      // Insert at the VERY FRONT of the connect stack
      // (server.middlewares is a Connect app with a private .stack)
      const stack = server.middlewares.stack;
      stack.unshift({ route: '', handle: handler });
    },
  };
}

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    // Optional global safety — but the top-of-stack middleware is the fix
    headers: {
      // prevent proxies from “helpfully” transforming responses
      'Cache-Control': 'no-transform',
    },
  },
  plugins: [
    ipadicRawMiddleware(), // <-- installs the top-of-stack handler
    {
      name: 'static-and-history',
      configureServer(server) {
        // Normal static mounts (don’t set encodings here)
        server.middlewares.use('/vendor', serveStatic('public/vendor'));
        server.middlewares.use('/dict', serveStatic('public/dict'));
        server.middlewares.use('/js', serveStatic('public/js'));
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/vendor/ipadic/') && req.url.endsWith('.gz')) {
            res.setHeader('Content-Encoding', 'identity');
            res.setHeader('Cache-Control', 'no-transform');
          }
          next();
        });

        // SPA fallback, but exclude our static prefixes
        server.middlewares.use(
          history({
            rewrites: [
              { from: /^\/vendor\/.*/, to: (ctx) => ctx.parsedUrl.path },
              { from: /^\/dict\/.*/, to: (ctx) => ctx.parsedUrl.path },
              { from: /^\/js\/.*/, to: (ctx) => ctx.parsedUrl.path },
            ],
          })
        );
      },
    },
  ],
});
