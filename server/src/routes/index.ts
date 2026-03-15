import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { getConfig } from '../config/env';
import { sentenceRoutes } from './sentences';
import { deckRoutes } from './decks';
import { enrichRoutes } from './enrich';

const config = getConfig();

export const app = new Hono();

app.use('*', cors({ origin: config.CORS_ORIGIN }));
app.use('*', honoLogger());

app.get('/health', (c) => c.json({ ok: true }));

// Auth middleware — only enforced when KOTOBA_API_KEY is set
app.use('/api/v1/*', async (c, next) => {
  const requiredKey = config.KOTOBA_API_KEY;
  if (!requiredKey) return next();
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${requiredKey}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
});

app.route('/api/v1/sentences', sentenceRoutes);
app.route('/api/v1/sentences', enrichRoutes);
app.route('/api/v1/decks', deckRoutes);
