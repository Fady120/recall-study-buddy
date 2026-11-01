import { useState, type FormEvent } from "react";
import { MAX_PDF_BYTES } from "../../shared/schema";
import { fileToBase64, generateDeck } from "../lib/api";
import { deckFromGenerated, type Deck } from "../lib/deck";
import { navigate } from "../lib/router";

const TEXT_TYPES = /\.(txt|md|markdown|csv)$/i;

export function NewDeck({ onCreate }: { onCreate: (deck: Deck) => void }) {
  const [notes, setNotes] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [focus, setFocus] = useState("");
  const [cardCount, setCardCount] = useState(15);
  const [quizCount, setQuizCount] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function pickFile(file: File) {
    setError("");
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      if (file.size > MAX_PDF_BYTES) return setError("That PDF is over 20 MB. Try a smaller one.");
      setPdf(file);
    } else if (file.type.startsWith("text/") || TEXT_TYPES.test(file.name)) {
      setNotes(await file.text());
    } else {
      setError("Use a PDF or a text file (.txt, .md).");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!notes.trim() && !pdf) return setError("Paste some notes or add a PDF first.");
    setBusy(true);
    setError("");
    try {
      const generated = await generateDeck({
        notes: notes.trim() || undefined,
        pdfBase64: pdf ? await fileToBase64(pdf) : undefined,
        focus: focus.trim() || undefined,
        cardCount,
        quizCount,
      });
      const deck = deckFromGenerated(generated);
      onCreate(deck);
      navigate({ name: "deck", id: deck.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="narrow">
      <h1>New deck</h1>
      <p className="muted">Claude reads your material and writes flashcards and a quiz from it.</p>

      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            placeholder="Paste lecture notes, a textbook section, an article…"
            disabled={busy}
          />
          <span className="hint">{notes.length.toLocaleString()} characters</span>
        </label>

        <div
          className={`dropzone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) pickFile(file);
          }}
        >
          {pdf ? (
            <div className="file-chip">
              📄 {pdf.name} <span className="muted">({(pdf.size / 1024 / 1024).toFixed(1)} MB)</span>
              <button type="button" className="link" onClick={() => setPdf(null)} disabled={busy}>
                Remove
              </button>
            </div>
          ) : (
            <label className="dropzone-label">
              Drop a PDF or text file here, or <span className="link">browse</span>
              <input
                type="file"
                accept="application/pdf,.pdf,.txt,.md,text/plain,text/markdown"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <label className="field">
          <span>Focus (optional)</span>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. definitions and formulas for the midterm"
            maxLength={500}
            disabled={busy}
          />
        </label>

        <div className="row">
          <label className="field">
            <span>Flashcards: {cardCount}</span>
            <input
              type="range"
              min={3}
              max={40}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Quiz questions: {quizCount}</span>
            <input
              type="range"
              min={0}
              max={20}
              value={quizCount}
              onChange={(e) => setQuizCount(Number(e.target.value))}
              disabled={busy}
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="button primary large" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden /> Claude is reading your material…
            </>
          ) : (
            "Generate deck"
          )}
        </button>
        {busy && <p className="hint center">This usually takes 20-60 seconds, longer for big PDFs.</p>}
      </form>
    </section>
  );
}
