import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getConfig } from '../config/env';
import { getDb } from '../db/client';
import { cards, cardScheduling } from '../db/schema';
import { newFsrsState } from '../services/fsrsService';
import { toCard } from '../services/deckService';
import { getFurigana, getTranslation } from '../services/enrichService';

export const enrichRoutes = new Hono();

const enrichSchema = z.object({
  text: z.string().min(1).max(1000),
});

const captureSchema = z.object({
  text: z.string().min(1).max(1000),
  deckId: z.number().int().positive(),
});

enrichRoutes.post('/enrich', zValidator('json', enrichSchema), async (c) => {
  const { text } = c.req.valid('json');
  const { OLLAMA_URL, OLLAMA_MODEL } = getConfig();

  const [furigana, translation] = await Promise.all([
    getFurigana(text),
    getTranslation(text, OLLAMA_URL, OLLAMA_MODEL),
  ]);

  return c.json({
    original: text,
    furigana,
    translation,
    translationModel: OLLAMA_MODEL,
    furiganaSource: 'kuroshiro',
  });
});

enrichRoutes.post('/capture', zValidator('json', captureSchema), async (c) => {
  const { text, deckId } = c.req.valid('json');
  const { OLLAMA_URL, OLLAMA_MODEL } = getConfig();

  const [furigana, translation] = await Promise.all([
    getFurigana(text),
    getTranslation(text, OLLAMA_URL, OLLAMA_MODEL),
  ]);

  const db = getDb();
  const card = db
    .insert(cards)
    .values({
      deckId,
      front: text,
      back: translation,
      createdAt: Math.floor(Date.now() / 1000),
      translationModel: OLLAMA_MODEL,
      furiganaSource: 'kuroshiro',
      enrichedAt: Date.now(),
    })
    .returning()
    .get();

  const fsrs = newFsrsState(Date.now());
  db.insert(cardScheduling)
    .values({
      cardId: card.id,
      stability: fsrs.stability,
      difficulty: fsrs.difficulty,
      elapsedDays: fsrs.elapsedDays,
      scheduledDays: fsrs.scheduledDays,
      reps: fsrs.reps,
      lapses: fsrs.lapses,
      state: fsrs.state,
      dueAt: fsrs.dueAt,
      lastReviewAt: fsrs.lastReviewAt,
    })
    .run();

  return c.json({
    card: toCard(card),
    original: text,
    furigana,
    translation,
    translationModel: OLLAMA_MODEL,
    furiganaSource: 'kuroshiro',
  }, 201);
});
