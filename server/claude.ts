import Anthropic from "@anthropic-ai/sdk";
import {
  GeneratedDeckJsonSchema,
  GeneratedDeckSchema,
  type ExplainRequest,
  type GeneratedDeck,
  type GenerateRequest,
} from "../shared/schema.js";

export const MODEL = process.env.RECALL_MODEL ?? "claude-opus-5-5";

/** Thrown when Claude's answer can't be used; the message is safe to show users. */
export class GenerationError extends Error {}

export interface StudyAI {
  generateDeck(req: GenerateRequest & { cardCount: number; quizCount: number }): Promise<GeneratedDeck>;
  explain(req: ExplainRequest): Promise<string>;
}

const DECK_SYSTEM = `You turn study material into flashcards and a practice quiz.

Write cards the way a strong tutor would:
- One idea per card. The front asks a specific question; the back answers it in 1-3 sentences.
- Prefer "why" and "how" questions over trivia, and cover the most important ideas first.
- Use only facts found in the material. Do not invent details it does not contain.
- Give every card a short topic label, and reuse labels so related cards group together.

For the quiz, write multiple-choice questions with 4 choices and exactly one correct answer.
Make wrong choices plausible misconceptions, not jokes. Reuse the card topic labels.`;

const EXPLAIN_SYSTEM = `You are a patient tutor. A student keeps forgetting a flashcard.
Explain the answer a different way than the card does: use an analogy, a concrete example,
or a memory hook. Keep it under 120 words. Plain text, no headings.`;

function firstText(content: Anthropic.Beta.BetaContentBlock[]): string {
  const block = content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
  return block?.text ?? "";
}

function checkStop(message: Anthropic.Beta.BetaMessage) {
  if (message.stop_reason === "refusal") {
    throw new GenerationError("Claude declined to process this material. Try different notes.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new GenerationError("The response was cut off. Try asking for fewer cards.");
  }
}

export function buildDeckContent(req: GenerateRequest & { cardCount: number; quizCount: number }) {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (req.pdfBase64) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: req.pdfBase64 },
    });
  }
  const parts = [];
  if (req.notes?.trim()) parts.push(`<notes>\n${req.notes.trim()}\n</notes>`);
  parts.push(
    `Create exactly ${req.cardCount} flashcards and ${req.quizCount} quiz questions from ` +
      (req.pdfBase64 ? "the attached document" : "the notes above") +
      (req.pdfBase64 && req.notes?.trim() ? " and the notes" : "") +
      ".",
  );
  if (req.focus?.trim()) parts.push(`Focus especially on: ${req.focus.trim()}`);
  content.push({ type: "text", text: parts.join("\n\n") });
  return content;
}

export function createClaudeAI(injected?: Anthropic): StudyAI {
  let client = injected;
  function getClient(): Anthropic {
    // Created lazily so the server can start (and serve the demo deck) without credentials.
    client ??= new Anthropic();
    return client;
  }

  return {
    async generateDeck(req) {
      const message = await getClient().beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        // If a safety classifier declines, the API retries on a recommended model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
          effort: "medium",
          format: { type: "json_schema", schema: GeneratedDeckJsonSchema },
        },
        system: DECK_SYSTEM,
        messages: [{ role: "user", content: buildDeckContent(req) }],
      });
      checkStop(message);

      let json: unknown;
      try {
        json = JSON.parse(firstText(message.content));
      } catch {
        throw new GenerationError("Claude returned an unreadable deck. Please try again.");
      }
      const parsed = GeneratedDeckSchema.safeParse(json);
      if (!parsed.success) {
        throw new GenerationError("Claude returned a deck in an unexpected shape. Please try again.");
      }
      return parsed.data;
    },

    async explain(req) {
      const message = await getClient().beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: EXPLAIN_SYSTEM,
        messages: [
          {
            role: "user",
            content:
              (req.deckTitle ? `Subject: ${req.deckTitle}\n` : "") +
              `Card question: ${req.front}\nCard answer: ${req.back}`,
          },
        ],
      });
      checkStop(message);
      const text = firstText(message.content).trim();
      if (!text) throw new GenerationError("Claude returned an empty explanation.");
      return text;
    },
  };
}
