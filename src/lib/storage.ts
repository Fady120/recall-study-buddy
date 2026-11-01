import { useCallback, useSyncExternalStore } from "react";
import type { Deck } from "./deck";
import { sampleDeck } from "./sampleDeck";

// Decks live in the browser's localStorage, so the app needs no database.
const KEY = "recall.decks.v1";
const SEEDED_KEY = "recall.seeded.v1";

const listeners = new Set<() => void>();
let cache: Deck[] | undefined;

function read(): Deck[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Deck[]) : [];
    if (!localStorage.getItem(SEEDED_KEY)) {
      // First visit: start with a demo deck so the app works before any API key is set.
      cache = [sampleDeck(), ...cache];
      localStorage.setItem(SEEDED_KEY, "1");
      localStorage.setItem(KEY, JSON.stringify(cache));
    }
  } catch {
    cache = cache ?? [sampleDeck()];
  }
  return cache;
}

function write(decks: Deck[]) {
  cache = decks;
  try {
    localStorage.setItem(KEY, JSON.stringify(decks));
  } catch {
    // Storage full or blocked: keep working in memory for this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDecks() {
  const decks = useSyncExternalStore(subscribe, read);
  const saveDeck = useCallback((deck: Deck) => {
    const current = read();
    const exists = current.some((d) => d.id === deck.id);
    write(exists ? current.map((d) => (d.id === deck.id ? deck : d)) : [deck, ...current]);
  }, []);
  const deleteDeck = useCallback((id: string) => write(read().filter((d) => d.id !== id)), []);
  return { decks, saveDeck, deleteDeck };
}

export function isDeck(value: unknown): value is Deck {
  const d = value as Deck;
  return (
    typeof d === "object" &&
    d !== null &&
    typeof d.id === "string" &&
    typeof d.title === "string" &&
    Array.isArray(d.cards) &&
    Array.isArray(d.quiz) &&
    d.cards.every((c) => typeof c.front === "string" && typeof c.back === "string" && typeof c.srs === "object")
  );
}
