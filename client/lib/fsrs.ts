/**
 * FSRS-4.5 spaced repetition scheduler — client-side mirror.
 *
 * Pure functions only — no I/O, no browser APIs, no server imports.
 * This file must stay logically identical to server/src/services/fsrsService.ts.
 * If algorithm constants or formulas change, update both files together.
 *
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 */

// FSRS-4.5 default weights (17 parameters)
const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

const DECAY = -0.5;
const FACTOR = 19 / 81;
const TARGET_RETENTION = 0.9;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const MS_PER_DAY = 86_400_000;

export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type Rating = 1 | 2 | 3 | 4;

export interface FsrsState {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  dueAt: number;
  lastReviewAt: number | null;
}

export function newFsrsState(now: number): FsrsState {
  return {
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    dueAt: now,
    lastReviewAt: null,
  };
}

/** Forgetting curve: probability of recall after t elapsed days with stability S. */
export function retrievability(t: number, S: number): number {
  if (S <= 0) return 0;
  return Math.pow(1 + FACTOR * (t / S), DECAY);
}

/** Interval in days to reach target retention r given stability S. */
export function nextInterval(S: number, r: number = TARGET_RETENTION): number {
  if (S <= 0) return 1;
  const interval = (S / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
  return Math.max(1, Math.round(interval));
}

function clampDifficulty(d: number): number {
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, d));
}

function initialStability(rating: Rating): number {
  return Math.max(W[rating - 1], 0.1);
}

function initialDifficulty(rating: Rating): number {
  return clampDifficulty(W[4] - W[5] * (rating - 3));
}

function shortTermStability(S: number, rating: Rating): number {
  return S * Math.exp(W[17 - 1] * (rating - 3 + W[16 - 1]));
}

function recallStability(D: number, S: number, R: number, rating: Rating): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return (
    S *
    (Math.exp(W[8]) *
      (11 - D) *
      Math.pow(S, -W[9]) *
      (Math.exp(W[10] * (1 - R)) - 1) *
      hardPenalty *
      easyBonus +
      1)
  );
}

function forgetStability(D: number, S: number, R: number): number {
  return W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R));
}

function updateDifficulty(D: number, rating: Rating): number {
  const delta = W[6] * (rating - 3);
  const newD = D - delta + W[7] * (W[4] - D);
  return clampDifficulty(newD);
}

/** Schedule a card given its current FSRS state and a review rating (1–4). */
export function scheduleCard(state: FsrsState, rating: Rating, now: number): FsrsState {
  const elapsedDays =
    state.lastReviewAt != null ? Math.max(0, (now - state.lastReviewAt) / MS_PER_DAY) : 0;

  let newStability: number;
  let newDifficulty: number;
  let newState: CardState;
  let newReps = state.reps + 1;
  let newLapses = state.lapses;

  if (state.state === 'new') {
    newStability = initialStability(rating);
    newDifficulty = initialDifficulty(rating);
    newState = rating === 1 ? 'learning' : 'review';
  } else if (state.state === 'learning' || state.state === 'relearning') {
    newDifficulty = updateDifficulty(state.difficulty, rating);
    newStability = shortTermStability(state.stability, rating);
    newState = rating >= 3 ? 'review' : state.state;
  } else {
    const R = retrievability(elapsedDays, state.stability);
    newDifficulty = updateDifficulty(state.difficulty, rating);
    if (rating === 1) {
      newLapses += 1;
      newStability = forgetStability(state.difficulty, state.stability, R);
      newState = 'relearning';
    } else {
      newStability = recallStability(state.difficulty, state.stability, R, rating);
      newState = 'review';
    }
  }

  const scheduledDays =
    newState === 'review' ? nextInterval(newStability) : newState === 'learning' ? 0 : 1;

  return {
    stability: newStability,
    difficulty: newDifficulty,
    elapsedDays,
    scheduledDays,
    reps: newReps,
    lapses: newLapses,
    state: newState,
    dueAt: now + scheduledDays * MS_PER_DAY,
    lastReviewAt: now,
  };
}
