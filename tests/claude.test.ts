import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { createClaudeAI, GenerationError, MODEL } from "../server/claude";

// Runs the real SDK against a fake Messages API, so the request we send and the
// way we read the response are both checked without network access or a key.
function fakeClient(reply: { text: string; stop_reason?: string }) {
  const requests: Record<string, unknown>[] = [];
  const fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: MODEL,
        content: [{ type: "text", text: reply.text }],
        stop_reason: reply.stop_reason ?? "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  return { client: new Anthropic({ apiKey: "test-key", fetch, maxRetries: 0 }), requests };
}

const validDeck = {
  title: "Cells",
  summary: "Basics.",
  cards: [{ front: "What is a cell?", back: "The unit of life.", topic: "Cells" }],
  quiz: [{ question: "Q?", choices: ["a", "b", "c", "d"], answerIndex: 0, explanation: "E", topic: "Cells" }],
};

describe("createClaudeAI", () => {
  it("asks for structured JSON and returns the parsed deck", async () => {
    const { client, requests } = fakeClient({ text: JSON.stringify(validDeck) });
    const deck = await createClaudeAI(client).generateDeck({ notes: "Cells…", cardCount: 1, quizCount: 1 });

    expect(deck).toEqual(validDeck);
    const body = requests[0]!;
    expect(body.model).toBe(MODEL);
    expect(body.fallbacks).toBe("default");
    expect(body.output_config).toMatchObject({ effort: "medium", format: { type: "json_schema" } });
  });

  it("rejects output that doesn't match the schema", async () => {
    const { client } = fakeClient({ text: JSON.stringify({ ...validDeck, cards: [] }) });
    await expect(createClaudeAI(client).generateDeck({ notes: "x", cardCount: 1, quizCount: 0 })).rejects.toThrow(
      GenerationError,
    );
  });

  it("reports truncated responses", async () => {
    const { client } = fakeClient({ text: '{"title": "Cel', stop_reason: "max_tokens" });
    await expect(createClaudeAI(client).generateDeck({ notes: "x", cardCount: 40, quizCount: 0 })).rejects.toThrow(
      /fewer cards/,
    );
  });

  it("returns the explanation text", async () => {
    const { client } = fakeClient({ text: "  Think of it like a battery.  " });
    expect(await createClaudeAI(client).explain({ front: "Q", back: "A" })).toBe("Think of it like a battery.");
  });
});
