/**
 * Server-backed CardStore implementation (online mode).
 * Delegates to REST API helpers in client/types/api.ts.
 */

import type { CardStore } from './cardStore';
import {
  apiListDecks,
  apiCreateDeck,
  apiDeleteDeck,
  apiListCards,
  apiCreateCard,
  apiDeleteCard,
  apiNextDue,
  apiSubmitReview,
  apiDeckStats,
} from '../types/api';

export function createApiCardStore(): CardStore {
  return {
    listDecks: () => apiListDecks(),
    createDeck: (name, description) => apiCreateDeck({ name, description }),
    deleteDeck: (id) => apiDeleteDeck(id),

    listCards: (deckId, limit, offset) => apiListCards(deckId, limit, offset),
    addCard: (deckId, front, back) => apiCreateCard(deckId, { front, back }),
    deleteCard: (deckId, cardId) => apiDeleteCard(deckId, cardId),

    nextDue: (deckId) => apiNextDue(deckId),
    submitReview: (deckId, cardId, rating) => apiSubmitReview(deckId, { cardId, rating }),

    importPairs: async (deckId, pairs) => {
      let count = 0;
      for (const { front, back } of pairs) {
        if (!front.trim()) continue;
        try {
          await apiCreateCard(deckId, { front, back });
          count++;
        } catch {
          // skip
        }
      }
      return count;
    },

    deckStats: (deckId) => apiDeckStats(deckId),
  };
}
