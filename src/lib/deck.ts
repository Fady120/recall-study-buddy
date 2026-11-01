import type { GeneratedDeck, GeneratedQuizQuestion } from "../../shared/schema";
import { cardStatus, isDue, newSrsState, relearn, type SrsState } from "./srs";

export interface Card {
  id: string;
  front: string;
  back: string;
  topic: string;
  srs: SrsState;
}

export type QuizQuestion = GeneratedQuizQuestion & { id: string };

export interface QuizAttempt {
  at: number;
  score: number;
  total: number;
}

export interface Deck {
  id: string;
  title: string;
  summary: string;
  createdAt: number;
  cards: Card[];
  quiz: QuizQuestion[];
  quizHistory: QuizAttempt[];
}

export const NEW_CARDS_PER_SESSION = 20;

export function makeId(): string {
  return crypto.randomUUID();
}

export function deckFromGenerated(generated: GeneratedDeck, now = Date.now()): Deck {
  return {
    id: makeId(),
    title: generated.title,
    summary: generated.summary,
    createdAt: now,
    cards: generated.cards.map((c) => ({ ...c, id: makeId(), srs: newSrsState(now) })),
    quiz: generated.quiz.map((q) => ({ ...q, id: makeId() })),
    quizHistory: [],
  };
}

export interface DeckStats {
  total: number;
  new: number;
  learning: number;
  mastered: number;
  due: number;
  /** Share of cards that are mastered, 0-100. */
  mastery: number;
}

export function deckStats(deck: Deck, now = Date.now()): DeckStats {
  const stats = { total: deck.cards.length, new: 0, learning: 0, mastered: 0, due: 0, mastery: 0 };
  for (const card of deck.cards) {
    stats[cardStatus(card.srs)] += 1;
    if (isDue(card.srs, now)) stats.due += 1;
  }
  stats.mastery = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0;
  return stats;
}

/** Cards to study now: everything due that has been seen, plus a limited number of new ones. */
export function studyQueue(deck: Deck, now = Date.now()): Card[] {
  const due = deck.cards.filter((c) => isDue(c.srs, now));
  const seen = due.filter((c) => cardStatus(c.srs) !== "new").sort((a, b) => a.srs.due - b.srs.due);
  const fresh = due.filter((c) => cardStatus(c.srs) === "new").slice(0, NEW_CARDS_PER_SESSION);
  return [...seen, ...fresh];
}

/** After a quiz, cards on the topics you missed go back into review. */
export function applyQuizResult(deck: Deck, missedTopics: string[], score: number, now = Date.now()): Deck {
  const missed = new Set(missedTopics.map((t) => t.toLowerCase()));
  return {
    ...deck,
    cards: deck.cards.map((c) =>
      missed.has(c.topic.toLowerCase()) && cardStatus(c.srs) !== "new" ? { ...c, srs: relearn(c.srs, now) } : c,
    ),
    quizHistory: [...deck.quizHistory, { at: now, score, total: deck.quiz.length }],
  };
}

export function topics(deck: Deck): string[] {
  return [...new Set(deck.cards.map((c) => c.topic))];
}
