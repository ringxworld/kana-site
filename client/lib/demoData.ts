import { newFsrsState } from './fsrs';
import type { Deck, CardWithSchedule } from '../types/api';

export const DEMO_DECK: Deck = {
  id: 1,
  name: 'Japanese Basics',
  description: 'Demo deck — greetings and everyday vocabulary',
  createdAt: 0,
};

const PAIRS: [string, string][] = [
  ['ありがとう', 'Thank you'],
  ['すみません', "Excuse me / I'm sorry"],
  ['はじめまして', 'Nice to meet you'],
  ['おはようございます', 'Good morning'],
  ['こんにちは', 'Hello / Good afternoon'],
  ['こんばんは', 'Good evening'],
  ['いただきます', "Let's eat (said before meals)"],
  ['ただいま', "I'm home"],
  ['よろしくお願いします', 'Please treat me well'],
  ['水', 'Water (みず)'],
];

// dueAt: 0 so all cards are always "due" in demo mode
export const DEMO_CARDS: CardWithSchedule[] = PAIRS.map(([front, back], i) => ({
  id: i + 1,
  deckId: DEMO_DECK.id,
  front,
  back,
  createdAt: 0,
  noteType: null,
  tags: [],
  extraFields: {},
  scheduling: { cardId: i + 1, ...newFsrsState(0) },
}));
