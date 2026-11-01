import type { ExplainRequest, GeneratedDeck, GenerateRequest } from "../../shared/schema";

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the Recall server. Is `npm run dev` running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error) throw new Error(data.error);
    // No JSON error body means the dev proxy couldn't reach the API server.
    throw new Error(
      res.status === 502 || res.status === 504
        ? "Can't reach the Recall API server. Is `npm run dev` running?"
        : `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export function generateDeck(req: GenerateRequest) {
  return post<GeneratedDeck>("/generate", req);
}

export async function explainCard(req: ExplainRequest) {
  return (await post<{ explanation: string }>("/explain", req)).explanation;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
