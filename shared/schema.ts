import { z } from "zod";

// What Claude returns for a new deck. The server validates the model output
// against this, and the client trusts it after that.
export const GeneratedCardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  topic: z.string().min(1),
});

export const GeneratedQuizQuestionSchema = z
  .object({
    question: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(6),
    answerIndex: z.number().int().nonnegative(),
    explanation: z.string().min(1),
    topic: z.string().min(1),
  })
  .refine((q) => q.answerIndex < q.choices.length, {
    message: "answerIndex must point at one of the choices",
    path: ["answerIndex"],
  });

export const GeneratedDeckSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  cards: z.array(GeneratedCardSchema).min(1),
  quiz: z.array(GeneratedQuizQuestionSchema),
});

export type GeneratedCard = z.infer<typeof GeneratedCardSchema>;
export type GeneratedQuizQuestion = z.infer<typeof GeneratedQuizQuestionSchema>;
export type GeneratedDeck = z.infer<typeof GeneratedDeckSchema>;

// The same shape as JSON Schema, for the API's structured outputs. Kept by hand
// because structured outputs only accept a subset of JSON Schema keywords.
const cardJson = {
  type: "object",
  additionalProperties: false,
  required: ["front", "back", "topic"],
  properties: {
    front: { type: "string", description: "A single, specific question or prompt." },
    back: { type: "string", description: "A concise, correct answer (1-3 sentences)." },
    topic: { type: "string", description: "Short topic label, 1-4 words." },
  },
} as const;

const quizJson = {
  type: "object",
  additionalProperties: false,
  required: ["question", "choices", "answerIndex", "explanation", "topic"],
  properties: {
    question: { type: "string" },
    choices: { type: "array", items: { type: "string" } },
    answerIndex: { type: "integer", description: "Zero-based index of the correct choice." },
    explanation: { type: "string", description: "Why the answer is right and the others are wrong." },
    topic: { type: "string", description: "Must match the topic of the cards it tests." },
  },
} as const;

export const GeneratedDeckJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "cards", "quiz"],
  properties: {
    title: { type: "string" },
    summary: { type: "string", description: "2-3 sentence overview of the material." },
    cards: { type: "array", items: cardJson },
    quiz: { type: "array", items: quizJson },
  },
} as const;

// Request bodies the API accepts.
export const MAX_NOTES_CHARS = 200_000;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export const GenerateRequestSchema = z
  .object({
    notes: z.string().max(MAX_NOTES_CHARS).optional(),
    pdfBase64: z
      .string()
      // base64 is 4 chars per 3 bytes
      .max(Math.ceil(MAX_PDF_BYTES / 3) * 4)
      .optional(),
    focus: z.string().max(500).optional(),
    cardCount: z.number().int().min(3).max(40).default(15),
    quizCount: z.number().int().min(0).max(20).default(6),
  })
  .refine((r) => Boolean(r.notes?.trim()) || Boolean(r.pdfBase64), {
    message: "Provide notes or a PDF",
  });

export type GenerateRequest = z.input<typeof GenerateRequestSchema>;

export const ExplainRequestSchema = z.object({
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(4000),
  deckTitle: z.string().max(200).optional(),
});

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;
