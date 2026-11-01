import { deckFromGenerated, type Deck } from "./deck";

// A ready-made deck so new users (and reviewers without an API key) can try
// studying and quizzing straight away.
export function sampleDeck(): Deck {
  return deckFromGenerated({
    title: "How Spaced Repetition Works",
    summary:
      "The science behind this app: why we forget, why spacing reviews out beats cramming, and how the SM-2 algorithm decides when you see a card next.",
    cards: [
      {
        front: "What does the forgetting curve describe?",
        back: "How memory of new information decays over time: steeply at first, then more slowly, unless it is reviewed.",
        topic: "Forgetting",
      },
      {
        front: "Who first measured the forgetting curve, and how?",
        back: "Hermann Ebbinghaus in the 1880s, by memorizing lists of nonsense syllables and testing himself at different delays.",
        topic: "Forgetting",
      },
      {
        front: "What is the spacing effect?",
        back: "Reviews spread out over time produce stronger long-term memory than the same amount of study crammed together.",
        topic: "Spacing",
      },
      {
        front: "Why does each successful review let the next interval grow?",
        back: "Every successful recall makes the memory more stable, so it takes longer to fade to the point of being forgotten.",
        topic: "Spacing",
      },
      {
        front: "What is active recall (the testing effect)?",
        back: "Retrieving an answer from memory strengthens it far more than re-reading it. Flashcards force retrieval.",
        topic: "Recall",
      },
      {
        front: "Why should you answer a card before flipping it?",
        back: "The effort of retrieval is what strengthens memory; peeking turns practice into passive re-reading.",
        topic: "Recall",
      },
      {
        front: "What does the 'ease factor' control in SM-2?",
        back: "How fast a card's interval grows. Easy cards get a higher ease and longer gaps; hard cards a lower one.",
        topic: "SM-2",
      },
      {
        front: "What happens to a card when you press 'Again' in SM-2?",
        back: "Its interval resets, its ease drops a little, and it comes back within minutes so you relearn it.",
        topic: "SM-2",
      },
      {
        front: "Why is cramming the night before an exam inefficient for long-term learning?",
        back: "It can pass a test the next day, but without spaced reviews most of it is forgotten within days.",
        topic: "Spacing",
      },
      {
        front: "What makes a good flashcard?",
        back: "One idea per card, a specific question, and a short answer you can check yourself against.",
        topic: "Recall",
      },
    ],
    quiz: [
      {
        question: "Which study plan leads to the best long-term retention?",
        choices: [
          "Reading the notes five times in one evening",
          "Testing yourself on the notes across several days",
          "Highlighting the key sentences",
          "Rewriting the notes neatly",
        ],
        answerIndex: 1,
        explanation:
          "It combines active recall and spacing. The other options are passive or massed practice, which feel productive but fade fast.",
        topic: "Spacing",
      },
      {
        question: "In SM-2, a card you answer easily several times in a row will…",
        choices: [
          "Be shown every day",
          "Be removed from the deck",
          "Be scheduled at longer and longer intervals",
          "Have its ease factor reset to 1.3",
        ],
        answerIndex: 2,
        explanation: "Each success multiplies the interval by the ease factor, so the gaps keep growing.",
        topic: "SM-2",
      },
      {
        question: "What did Ebbinghaus use to study memory?",
        choices: ["Lists of famous dates", "Nonsense syllables", "Photographs", "Poems"],
        answerIndex: 1,
        explanation:
          "Nonsense syllables have no prior meaning, so they measure pure memorization without existing knowledge helping.",
        topic: "Forgetting",
      },
      {
        question: "Why does flipping a flashcard before answering hurt learning?",
        choices: [
          "It makes the session longer",
          "It skips the act of retrieval that strengthens memory",
          "It changes the card's ease factor",
          "It doesn't hurt learning at all",
        ],
        answerIndex: 1,
        explanation: "Retrieval practice is the active ingredient. Without it you are only re-reading.",
        topic: "Recall",
      },
    ],
  });
}
