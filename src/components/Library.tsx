import { useRef, useState } from "react";
import { deckStats, makeId, type Deck } from "../lib/deck";
import { href } from "../lib/router";
import { isDeck } from "../lib/storage";
import { ProgressBar } from "./ProgressBar";

export function Library({ decks, onImport }: { decks: Deck[]; onImport: (deck: Deck) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const totalDue = decks.reduce((sum, d) => sum + deckStats(d).due, 0);

  async function importFile(file: File) {
    setImportError("");
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isDeck(data)) throw new Error();
      // New id, so importing the same file twice gives two decks rather than overwriting.
      onImport({ ...data, id: makeId() });
    } catch {
      setImportError("That file isn't a Recall deck export.");
    }
  }

  return (
    <section>
      <div className="hero">
        <h1>Turn any notes into a study plan.</h1>
        <p>
          Paste notes or drop in a PDF. Claude writes flashcards and a practice quiz, and spaced repetition tells you
          exactly what to review each day.
        </p>
        {decks.length > 0 && (
          <p className="due-summary">
            {totalDue > 0 ? (
              <>
                <strong>{totalDue}</strong> card{totalDue === 1 ? "" : "s"} due for review
              </>
            ) : (
              "You're all caught up. Nice work."
            )}
          </p>
        )}
      </div>

      <div className="section-head">
        <h2>Your decks</h2>
        <button className="button ghost small" onClick={() => fileInput.current?.click()}>
          Import deck
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {importError && <p className="error">{importError}</p>}

      {decks.length === 0 ? (
        <div className="empty">
          <p>No decks yet.</p>
          <a className="button primary" href={href({ name: "new" })}>
            Create your first deck
          </a>
        </div>
      ) : (
        <div className="deck-grid">
          {decks.map((deck) => {
            const stats = deckStats(deck);
            return (
              <a key={deck.id} className="deck-card" href={href({ name: "deck", id: deck.id })}>
                <h3>{deck.title}</h3>
                <p className="muted clamp">{deck.summary}</p>
                <ProgressBar value={stats.mastery} label={`${stats.mastery}% mastered`} />
                <div className="deck-meta">
                  <span>{stats.total} cards</span>
                  {stats.due > 0 ? <span className="badge">{stats.due} due</span> : <span className="muted">Up to date</span>}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
