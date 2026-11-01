// Spaced repetition based on SM-2, with four answer buttons like Anki.
// Intervals are in days; `due` is a Unix timestamp in milliseconds.

export type Grade = "again" | "hard" | "good" | "easy";

export interface SrsState {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: number;
  lastReviewed?: number;
}

export const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const MIN_EASE = 1.3;
export const MASTERED_INTERVAL = 21;

export function newSrsState(now = Date.now()): SrsState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now };
}

export function review(state: SrsState, grade: Grade, now = Date.now()): SrsState {
  let { ease, interval, reps, lapses } = state;

  if (grade === "again") {
    // Forgotten: start over, and see it again in a few minutes.
    return {
      ease: Math.max(MIN_EASE, ease - 0.2),
      interval: 0,
      reps: 0,
      lapses: lapses + 1,
      due: now + 10 * MINUTE,
      lastReviewed: now,
    };
  }

  if (grade === "hard") {
    interval = reps === 0 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2));
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else if (grade === "good") {
    interval = reps === 0 ? 2 : reps === 1 ? 5 : Math.max(interval + 1, Math.round(interval * ease));
  } else {
    interval = reps === 0 ? 4 : Math.max(interval + 1, Math.round(interval * ease * 1.3));
    ease += 0.15;
  }

  return { ease, interval, reps: reps + 1, lapses, due: now + interval * DAY, lastReviewed: now };
}

/** Human-readable preview of when a grade would schedule the card next. */
export function previewInterval(state: SrsState, grade: Grade, now = Date.now()): string {
  const ms = review(state, grade, now).due - now;
  if (ms < DAY) return `${Math.max(1, Math.round(ms / MINUTE))}m`;
  const days = Math.round(ms / DAY);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export type CardStatus = "new" | "learning" | "mastered";

export function cardStatus(state: SrsState): CardStatus {
  if (state.reps === 0 && state.lapses === 0 && !state.lastReviewed) return "new";
  return state.interval >= MASTERED_INTERVAL ? "mastered" : "learning";
}

export function isDue(state: SrsState, now = Date.now()): boolean {
  return state.due <= now;
}

/** Puts a card back into review right away, e.g. after a wrong quiz answer. */
export function relearn(state: SrsState, now = Date.now()): SrsState {
  return { ...state, interval: 0, reps: 0, due: now, ease: Math.max(MIN_EASE, state.ease - 0.1) };
}
