import Anthropic from "@anthropic-ai/sdk";
import { Router, type Response } from "express";
import { ExplainRequestSchema, GenerateRequestSchema } from "../shared/schema.js";
import { GenerationError, MODEL, type StudyAI } from "./claude.js";

function sendError(res: Response, err: unknown) {
  if (err instanceof GenerationError) {
    return res.status(502).json({ error: err.message });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return res.status(401).json({
      error: "The server has no valid Anthropic API key. Set ANTHROPIC_API_KEY in .env and restart.",
    });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: "Rate limited by the Claude API. Wait a moment and retry." });
  }
  if (err instanceof Anthropic.BadRequestError) {
    return res.status(400).json({ error: `Claude API rejected the request: ${err.message}` });
  }
  if (err instanceof Anthropic.APIError) {
    return res.status(502).json({ error: "The Claude API had a problem. Please try again." });
  }
  // The SDK throws a plain Error when it can find no credentials at all.
  if (err instanceof Error && /api[_ ]?key|credential/i.test(err.message)) {
    return res.status(401).json({
      error: "No Anthropic API key found. Copy .env.example to .env, add your key and restart.",
    });
  }
  console.error(err);
  return res.status(500).json({ error: "Something went wrong on the server." });
}

export function createApi(ai: StudyAI): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, model: MODEL });
  });

  router.post("/generate", async (req, res) => {
    const body = GenerateRequestSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: body.error.issues[0]?.message ?? "Invalid request" });
    }
    try {
      res.json(await ai.generateDeck(body.data));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post("/explain", async (req, res) => {
    const body = ExplainRequestSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: body.error.issues[0]?.message ?? "Invalid request" });
    }
    try {
      res.json({ explanation: await ai.explain(body.data) });
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}
