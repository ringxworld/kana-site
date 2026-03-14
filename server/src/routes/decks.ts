import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { listDecks, createDeck, deleteDeck, listCards, createCard, deleteCard } from '../services/deckService';
import { nextDue, submitReview, deckStats } from '../services/reviewService';
import { importApkg } from '../services/ankiImportService';

export const deckRoutes = new Hono();

const createDeckSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const createCardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

const submitReviewSchema = z.object({
  cardId: z.number().int().positive(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

const listCardsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ─── Decks ────────────────────────────────────────────────────────────────────

deckRoutes.get('/', (c) => c.json(listDecks()));

deckRoutes.post('/', zValidator('json', createDeckSchema), (c) => {
  const deck = createDeck(c.req.valid('json'));
  return c.json(deck, 201);
});

deckRoutes.delete('/:id', (c) => {
  deleteDeck(Number(c.req.param('id')));
  return c.body(null, 204);
});

// ─── Cards ────────────────────────────────────────────────────────────────────

deckRoutes.get('/:id/cards', zValidator('query', listCardsSchema), (c) => {
  const { limit = 50, offset = 0 } = c.req.valid('query');
  return c.json(listCards(Number(c.req.param('id')), limit, offset));
});

deckRoutes.post('/:id/cards', zValidator('json', createCardSchema), (c) => {
  const card = createCard(Number(c.req.param('id')), c.req.valid('json'));
  return c.json(card, 201);
});

deckRoutes.delete('/:id/cards/:cid', (c) => {
  deleteCard(Number(c.req.param('cid')));
  return c.body(null, 204);
});

// ─── Review ───────────────────────────────────────────────────────────────────

deckRoutes.get('/:id/review', (c) => {
  const card = nextDue(Number(c.req.param('id')));
  if (!card) return c.body(null, 204);
  return c.json(card);
});

deckRoutes.post('/:id/review', zValidator('json', submitReviewSchema), (c) => {
  const result = submitReview(c.req.valid('json'));
  return c.json(result);
});

// ─── Stats ────────────────────────────────────────────────────────────────────

deckRoutes.get('/:id/stats', (c) =>
  c.json(deckStats(Number(c.req.param('id')))),
);

// ─── Anki import ──────────────────────────────────────────────────────────────

deckRoutes.post('/import/apkg', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const deckName = typeof body['deckName'] === 'string' ? body['deckName'].trim() : '';

  if (!file || typeof file === 'string') {
    return c.json({ error: 'file is required' }, 400);
  }
  if (!deckName) {
    return c.json({ error: 'deckName is required' }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = importApkg(buffer, deckName);
  return c.json(result, 201);
});
