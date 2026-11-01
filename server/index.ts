import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createApi } from "./api.js";
import { createClaudeAI } from "./claude.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../dist");
// `--port` wins so the dev script can pin the port the Vite proxy expects,
// even when the environment sets PORT for the front end.
const { values } = parseArgs({ options: { port: { type: "string" } }, strict: false });
const port = Number(values.port ?? process.env.PORT ?? 8787);

const app = express();
// PDFs arrive base64-encoded in the JSON body.
app.use(express.json({ limit: "30mb" }));
app.use("/api", createApi(createClaudeAI()));

// In production the server also hosts the built front end.
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(port, () => {
  console.log(`Recall API listening on http://localhost:${port}`);
});
