import { useEffect } from "react";
import { DeckView } from "./components/DeckView";
import { Library } from "./components/Library";
import { NewDeck } from "./components/NewDeck";
import { Quiz } from "./components/Quiz";
import { Study } from "./components/Study";
import { href, useRoute } from "./lib/router";
import { useDecks } from "./lib/storage";

export function App() {
  const route = useRoute();
  const { decks, saveDeck, deleteDeck } = useDecks();
  const deck = "id" in route ? decks.find((d) => d.id === route.id) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

  let page;
  if (route.name === "new") page = <NewDeck onCreate={saveDeck} />;
  else if ("id" in route && !deck) page = <NotFound />;
  else if (route.name === "deck" && deck) page = <DeckView deck={deck} onSave={saveDeck} onDelete={deleteDeck} />;
  else if (route.name === "study" && deck) page = <Study deck={deck} onSave={saveDeck} />;
  else if (route.name === "quiz" && deck) page = <Quiz deck={deck} onSave={saveDeck} />;
  else page = <Library decks={decks} onImport={saveDeck} />;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={href({ name: "library" })}>
          <span className="brand-mark" aria-hidden>
            ◆
          </span>
          Recall
        </a>
        <a className="button primary small" href={href({ name: "new" })}>
          + New deck
        </a>
      </header>
      <main>{page}</main>
      <footer className="footer">Built with Claude · Your decks stay in this browser</footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="empty">
      <h2>Deck not found</h2>
      <p>It may have been deleted.</p>
      <a className="button" href={href({ name: "library" })}>
        Back to library
      </a>
    </div>
  );
}
