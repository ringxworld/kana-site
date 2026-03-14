import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import serveStatic from 'serve-static';
import history from 'connect-history-api-fallback';

function ipadicRawMiddleware() {
  const handler = (req, res, next) => {
    const url = req.url || '';
    if (url.startsWith('/vendor/ipadic/') && url.endsWith('.gz')) {
      const diskPath = path.join(process.cwd(), 'public', url.replace(/^\/+/, ''));
      fs.readFile(diskPath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end('Not found');
        }
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Encoding', 'identity');
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate, no-transform');
        try {
          res.removeHeader('Content-Encoding');
        } catch {}
        res.end(data);
      });
      return;
    }
    next();
  };

  return {
    name: 'ipadic-raw-top',
    configureServer(server) {
      const stack = server.middlewares.stack;
      stack.unshift({ route: '', handle: handler });
    },
  };
}

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    headers: {
      'Cache-Control': 'no-transform',
    },
  },
  plugins: [
    react(),
    ipadicRawMiddleware(),
    {
      name: 'static-and-history',
      configureServer(server) {
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
  test: {
    environment: 'jsdom',
    setupFiles: './client/test/setup.ts',
    include: ['client/**/*.test.ts', 'client/**/*.test.tsx'],
    exclude: ['server/**', 'node_modules/**'],
  },
});
