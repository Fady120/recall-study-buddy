import { useEffect, useState } from "react";
import { explainCard } from "../lib/api";
import { studyQueue, type Card, type Deck } from "../lib/deck";
import { href } from "../lib/router";
import { previewInterval, review, type Grade } from "../lib/srs";
import { ProgressBar } from "./ProgressBar";

const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: "again", label: "Again", key: "1" },
  { grade: "hard", label: "Hard", key: "2" },
  { grade: "good", label: "Good", key: "3" },
  { grade: "easy", label: "Easy", key: "4" },
];

export function Study({ deck, onSave }: { deck: Deck; onSave: (deck: Deck) => void }) {
  // The queue is fixed when the session starts; cards marked "Again" go to the back of it.
  const [queue, setQueue] = useState<Card[]>(() => studyQueue(deck));
  const [startSize] = useState(queue.length);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [explanation, setExplanation] = useState<{ cardId: string; text: string } | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState("");

  const current = queue[0];
  // Always grade against the latest saved state of the card.
  const live = current && (deck.cards.find((c) => c.id === current.id) ?? current);

  function grade(g: Grade) {
    if (!live) return;
    const updated = { ...live, srs: review(live.srs, g) };
    onSave({ ...deck, cards: deck.cards.map((c) => (c.id === live.id ? updated : c)) });
    setQueue((q) => (g === "again" ? [...q.slice(1), updated] : q.slice(1)));
    setReviewed((n) => n + 1);
    setFlipped(false);
    setExplainError("");
  }

  async function explain() {
    if (!live) return;
    setExplaining(true);
    setExplainError("");
    try {
      const text = await explainCard({ front: live.front, back: live.back, deckTitle: deck.title });
      setExplanation({ cardId: live.id, text });
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : String(err));
    } finally {
      setExplaining(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped) {
        const match = GRADES.find((g) => g.key === e.key);
        if (match) grade(match.grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!live) {
    return (
      <section className="narrow center">
        <div className="done">
          <div className="done-mark" aria-hidden>
            ✓
          </div>
          <h1>Session complete</h1>
          <p className="muted">
            {reviewed > 0 ? `You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}.` : "Nothing is due right now."}{" "}
            Come back when more cards are due.
          </p>
          <div className="actions centered">
            <a className="button primary" href={href({ name: "deck", id: deck.id })}>
              Back to deck
            </a>
            {deck.quiz.length > 0 && (
              <a className="button" href={href({ name: "quiz", id: deck.id })}>
                Take the quiz
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  // "Again" puts a card back in the queue, so progress only moves on cards that are finished.
  const done = startSize - queue.length;
  return (
    <section className="narrow">
      <div className="session-head">
        <a className="back" href={href({ name: "deck", id: deck.id })}>
          ← {deck.title}
        </a>
        <span className="muted">{queue.length} left</span>
      </div>
      <ProgressBar value={startSize ? (done / startSize) * 100 : 0} />

      <button
        className={`flashcard${flipped ? " flipped" : ""}`}
        onClick={() => setFlipped(true)}
        aria-label={flipped ? "Card answer" : "Show answer"}
      >
        <span className="topic-tag">{live.topic}</span>
        <p className="flash-q">{live.front}</p>
        {flipped ? (
          <p className="flash-a">{live.back}</p>
        ) : (
          <span className="hint">Think of your answer, then tap or press Space</span>
        )}
      </button>

      {flipped && (
        <>
          <div className="grades">
            {GRADES.map(({ grade: g, label, key }) => (
              <button key={g} className={`grade ${g}`} onClick={() => grade(g)}>
                <strong>{label}</strong>
                <span>
                  {previewInterval(live.srs, g)} · {key}
                </span>
              </button>
            ))}
          </div>

          <div className="explain">
            {explanation?.cardId === live.id ? (
              <div className="explanation">
                <strong>Another way to think about it</strong>
                <p>{explanation.text}</p>
              </div>
            ) : (
              <button className="button ghost small" onClick={explain} disabled={explaining}>
                {explaining ? (
                  <>
                    <span className="spinner" aria-hidden /> Asking Claude…
                  </>
                ) : (
                  "✨ Explain it differently"
                )}
              </button>
            )}
            {explainError && <p className="error">{explainError}</p>}
          </div>
        </>
      )}
    </section>
  );
}
