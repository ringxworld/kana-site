import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { importSentences, listSentences } from '../services/sentenceService';

export const sentenceRoutes = new Hono();

const listQuerySchema = z.object({
  q: z.string().optional(),
  source: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const importBodySchema = z.object({
  text: z.string().min(1, 'text is required'),
  source: z.string().optional(),
});

sentenceRoutes.get('/', zValidator('query', listQuerySchema), (c) => {
  const result = listSentences(c.req.valid('query'));
  return c.json(result);
});

sentenceRoutes.post('/import', zValidator('json', importBodySchema), (c) => {
  const result = importSentences(c.req.valid('json'));
  return c.json(result, 201);
});
