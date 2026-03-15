/**
 * CardStore — abstract interface for flashcard persistence.
 *
 * Uses the REST API backend (cardStoreApi.ts).
 * VITE_API_URL must be set for the real app; demo routes use hardcoded data.
 */

import { useMemo } from 'react';
import type { Card, CardWithSchedule, Deck, DeckStats } from '../types/api';
import { createApiCardStore } from './cardStoreApi';

export interface CardStore {
  listDecks(): Promise<Deck[]>;
  createDeck(name: string, description?: string): Promise<Deck>;
  deleteDeck(id: number): Promise<void>;

  listCards(
    deckId: number,
    limit?: number,
    offset?: number
  ): Promise<{ cards: Card[]; total: number }>;
  addCard(deckId: number, front: string, back: string): Promise<Card>;
  deleteCard(deckId: number, cardId: number): Promise<void>;

  nextDue(deckId: number): Promise<CardWithSchedule | null>;
  submitReview(deckId: number, cardId: number, rating: 1 | 2 | 3 | 4): Promise<CardWithSchedule>;

  importPairs(deckId: number, pairs: Array<{ front: string; back: string }>): Promise<number>;
  deckStats(deckId: number): Promise<DeckStats>;
}

/** Returns the API CardStore backend (stable across renders). */
export function useCardStore(): CardStore {
  return useMemo(() => createApiCardStore(), []);
}
