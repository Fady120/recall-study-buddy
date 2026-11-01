import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApi } from "../server/api";
import { buildDeckContent, GenerationError, type StudyAI } from "../server/claude";

const deck = {
  title: "Cells",
  summary: "Basics of cells.",
  cards: [{ front: "What is a cell?", back: "The basic unit of life.", topic: "Cells" }],
  quiz: [],
};

function appWith(ai: Partial<StudyAI>) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createApi({
      generateDeck: vi.fn(async () => deck),
      explain: vi.fn(async () => "An analogy."),
      ...ai,
    }),
  );
  return app;
}

describe("POST /api/generate", () => {
  it("returns the generated deck and passes defaults through", async () => {
    const generateDeck = vi.fn(async () => deck);
    const res = await request(appWith({ generateDeck })).post("/api/generate").send({ notes: "Cells are…" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Cells");
    expect(generateDeck).toHaveBeenCalledWith(expect.objectContaining({ cardCount: 15, quizCount: 6 }));
  });

  it("rejects requests with no material", async () => {
    const res = await request(appWith({})).post("/api/generate").send({ cardCount: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/notes or a PDF/);
  });

  it("rejects out-of-range card counts", async () => {
    const res = await request(appWith({})).post("/api/generate").send({ notes: "x", cardCount: 500 });
    expect(res.status).toBe(400);
  });

  it("turns generation failures into readable errors", async () => {
    const res = await request(
      appWith({
        generateDeck: async () => {
          throw new GenerationError("The response was cut off.");
        },
      }),
    )
      .post("/api/generate")
      .send({ notes: "x" });
    expect(res.status).toBe(502);
    expect(res.body.error).toBe("The response was cut off.");
  });
});

describe("POST /api/explain", () => {
  it("returns an explanation", async () => {
    const res = await request(appWith({})).post("/api/explain").send({ front: "Q", back: "A" });
    expect(res.status).toBe(200);
    expect(res.body.explanation).toBe("An analogy.");
  });
});

describe("buildDeckContent", () => {
  it("puts the PDF before the instructions and mentions both sources", () => {
    const content = buildDeckContent({ notes: "extra", pdfBase64: "AAAA", cardCount: 10, quizCount: 3 });
    expect(content[0]?.type).toBe("document");
    const text = content[1]?.type === "text" ? content[1].text : "";
    expect(text).toContain("<notes>");
    expect(text).toContain("exactly 10 flashcards and 3 quiz questions");
    expect(text).toContain("attached document and the notes");
  });
});
