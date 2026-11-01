import { useState } from "react";
import { applyQuizResult, type Deck } from "../lib/deck";
import { href } from "../lib/router";
import { ProgressBar } from "./ProgressBar";

export function Quiz({ deck, onSave }: { deck: Deck; onSave: (deck: Deck) => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [missedTopics, setMissedTopics] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = deck.quiz[index];

  function choose(i: number) {
    if (picked !== null || !question) return;
    setPicked(i);
    if (i === question.answerIndex) setScore((s) => s + 1);
    else setMissedTopics((t) => [...t, question.topic]);
  }

  function next() {
    if (index + 1 < deck.quiz.length) {
      setIndex(index + 1);
      setPicked(null);
      return;
    }
    onSave(applyQuizResult(deck, missedTopics, score));
    setFinished(true);
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setMissedTopics([]);
    setScore(0);
    setFinished(false);
  }

  if (finished || !question) {
    const total = deck.quiz.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const uniqueMissed = [...new Set(missedTopics)];
    return (
      <section className="narrow center">
        <div className="done">
          <div className="score-ring" style={{ ["--pct" as string]: pct }}>
            <span>{pct}%</span>
          </div>
          <h1>
            {score} of {total} correct
          </h1>
          {uniqueMissed.length > 0 ? (
            <p className="muted">
              Cards on <strong>{uniqueMissed.join(", ")}</strong> were added back to your review queue.
            </p>
          ) : (
            <p className="muted">Perfect score. Your spaced repetition is working.</p>
          )}
          <div className="actions centered">
            <a className="button primary" href={href({ name: "deck", id: deck.id })}>
              Back to deck
            </a>
            <button className="button" onClick={restart}>
              Retake quiz
            </button>
          </div>
        </div>
      </section>
    );
  }

  const answered = picked !== null;
  return (
    <section className="narrow">
      <div className="session-head">
        <a className="back" href={href({ name: "deck", id: deck.id })}>
          ← {deck.title}
        </a>
        <span className="muted">
          Question {index + 1} of {deck.quiz.length}
        </span>
      </div>
      <ProgressBar value={(index / deck.quiz.length) * 100} />

      <h2 className="quiz-q">{question.question}</h2>
      <div className="choices">
        {question.choices.map((choice, i) => {
          let state = "";
          if (answered && i === question.answerIndex) state = " correct";
          else if (answered && i === picked) state = " wrong";
          return (
            <button key={i} className={`choice${state}`} onClick={() => choose(i)} disabled={answered}>
              <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
              {choice}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`feedback ${picked === question.answerIndex ? "good" : "bad"}`}>
          <strong>{picked === question.answerIndex ? "Correct!" : "Not quite."}</strong>
          <p>{question.explanation}</p>
          <button className="button primary" onClick={next} autoFocus>
            {index + 1 < deck.quiz.length ? "Next question" : "See results"}
          </button>
        </div>
      )}
    </section>
  );
}
