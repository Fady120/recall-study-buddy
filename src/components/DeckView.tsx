import { deckStats, studyQueue, topics, type Deck } from "../lib/deck";
import { href, navigate } from "../lib/router";
import { cardStatus } from "../lib/srs";
import { ProgressBar } from "./ProgressBar";

interface Props {
  deck: Deck;
  onSave: (deck: Deck) => void;
  onDelete: (id: string) => void;
}

export function DeckView({ deck, onSave, onDelete }: Props) {
  const stats = deckStats(deck);
  const queue = studyQueue(deck);
  const lastQuiz = deck.quizHistory.at(-1);

  function exportDeck() {
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.title.replace(/[^\w-]+/g, "-").toLowerCase()}.recall.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function removeCard(id: string) {
    onSave({ ...deck, cards: deck.cards.filter((c) => c.id !== id) });
  }

  return (
    <section>
      <a className="back" href={href({ name: "library" })}>
        ← All decks
      </a>
      <h1>{deck.title}</h1>
      <p className="lead">{deck.summary}</p>

      <div className="stat-row">
        <Stat value={stats.due} label="Due now" accent />
        <Stat value={stats.new} label="New" />
        <Stat value={stats.learning} label="Learning" />
        <Stat value={stats.mastered} label="Mastered" />
      </div>
      <ProgressBar value={stats.mastery} label={`${stats.mastery}% mastered`} />

      <div className="actions">
        <a
          className={`button primary${queue.length === 0 ? " disabled" : ""}`}
          href={queue.length ? href({ name: "study", id: deck.id }) : undefined}
          aria-disabled={queue.length === 0}
        >
          {queue.length ? `Study ${queue.length} card${queue.length === 1 ? "" : "s"}` : "Nothing due"}
        </a>
        {deck.quiz.length > 0 && (
          <a className="button" href={href({ name: "quiz", id: deck.id })}>
            Take quiz ({deck.quiz.length})
          </a>
        )}
        <button className="button ghost" onClick={exportDeck}>
          Export
        </button>
        <button
          className="button ghost danger"
          onClick={() => {
            if (confirm(`Delete "${deck.title}"? This can't be undone.`)) {
              onDelete(deck.id);
              navigate({ name: "library" });
            }
          }}
        >
          Delete
        </button>
      </div>
      {lastQuiz && (
        <p className="muted">
          Last quiz: {lastQuiz.score}/{lastQuiz.total} on {new Date(lastQuiz.at).toLocaleDateString()}
        </p>
      )}

      {topics(deck).map((topic) => (
        <div key={topic} className="topic">
          <h2>{topic}</h2>
          <ul className="card-list">
            {deck.cards
              .filter((c) => c.topic === topic)
              .map((card) => {
                const status = cardStatus(card.srs);
                return (
                  <li key={card.id}>
                    <div>
                      <p className="q">{card.front}</p>
                      <p className="a">{card.back}</p>
                    </div>
                    <div className="card-side">
                      <span className={`pill ${status}`}>{status}</span>
                      <button className="link danger" onClick={() => removeCard(card.id)} aria-label="Remove card">
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className={`stat${accent ? " accent" : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
