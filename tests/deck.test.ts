import { describe, expect, it } from "vitest";
import { GeneratedDeckSchema, GenerateRequestSchema } from "../shared/schema";
import { applyQuizResult, deckFromGenerated, deckStats, NEW_CARDS_PER_SESSION, studyQueue } from "../src/lib/deck";
import { sampleDeck } from "../src/lib/sampleDeck";
import { DAY, review } from "../src/lib/srs";

const NOW = Date.UTC(2026, 0, 1);

function deckWith(n: number) {
  return deckFromGenerated(
    {
      title: "T",
      summary: "S",
      cards: Array.from({ length: n }, (_, i) => ({ front: `Q${i}`, back: `A${i}`, topic: i % 2 ? "Odd" : "Even" })),
      quiz: [],
    },
    NOW,
  );
}

describe("deck helpers", () => {
  it("starts every card as new and due", () => {
    const stats = deckStats(deckWith(5), NOW);
    expect(stats).toMatchObject({ total: 5, new: 5, due: 5, mastered: 0, mastery: 0 });
  });

  it("limits new cards per session but always includes due reviews", () => {
    const deck = deckWith(30);
    deck.cards[0] = { ...deck.cards[0]!, srs: review(deck.cards[0]!.srs, "good", NOW - 3 * DAY) };
    const queue = studyQueue(deck, NOW);
    expect(queue[0]!.id).toBe(deck.cards[0]!.id);
    expect(queue.length).toBe(1 + NEW_CARDS_PER_SESSION);
  });

  it("sends cards on missed quiz topics back into review", () => {
    let deck = deckWith(4);
    deck = { ...deck, cards: deck.cards.map((c) => ({ ...c, srs: review(c.srs, "easy", NOW) })) };
    expect(deckStats(deck, NOW).due).toBe(0);

    const after = applyQuizResult(deck, ["odd"], 1, NOW);
    expect(after.cards.filter((c) => c.srs.due <= NOW).map((c) => c.topic)).toEqual(["Odd", "Odd"]);
    expect(after.quizHistory).toHaveLength(1);
  });

  it("ships a valid sample deck", () => {
    const deck = sampleDeck();
    expect(deck.cards.length).toBeGreaterThan(5);
    for (const q of deck.quiz) expect(q.answerIndex).toBeLessThan(q.choices.length);
  });
});

describe("schemas", () => {
  it("rejects quiz answers that point outside the choices", () => {
    const result = GeneratedDeckSchema.safeParse({
      title: "T",
      summary: "S",
      cards: [{ front: "Q", back: "A", topic: "X" }],
      quiz: [{ question: "Q", choices: ["a", "b"], answerIndex: 2, explanation: "E", topic: "X" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires notes or a PDF and fills in defaults", () => {
    expect(GenerateRequestSchema.safeParse({ notes: "   " }).success).toBe(false);
    const ok = GenerateRequestSchema.parse({ notes: "Photosynthesis…" });
    expect(ok).toMatchObject({ cardCount: 15, quizCount: 6 });
  });
});
