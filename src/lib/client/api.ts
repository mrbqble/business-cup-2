import type { GenerateEvent } from "@/app/api/cases/generate/route";
import type { PlayView } from "@/lib/case/view";

export type { GenerateEvent };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const NETWORK_MESSAGE = "We couldn't reach Daily Case. Check your connection and try again.";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError(0, "network", NETWORK_MESSAGE);
  }
  const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? "unknown", body?.message ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export interface PlayResponse {
  playId: string;
  view: PlayView;
}

export const api = {
  today: () => request<{ view: PlayView }>("/api/cases/today"),
  startPlay: (caseSlug: string) => request<PlayResponse>("/api/plays", { method: "POST", body: JSON.stringify({ caseSlug }) }),
  getPlay: (playId: string) => request<PlayResponse>(`/api/plays/${playId}`),
  open: (playId: string, clueId: string) =>
    request<PlayResponse>(`/api/plays/${playId}/actions`, { method: "POST", body: JSON.stringify({ type: "open", clueId }) }),
  accuse: (playId: string, hypothesisId: string) =>
    request<PlayResponse>(`/api/plays/${playId}/actions`, { method: "POST", body: JSON.stringify({ type: "accuse", hypothesisId }) }),
};

/** Starts a topic generation and calls `onEvent` for each NDJSON event as it arrives. */
export async function generateCase(topic: string, onEvent: (event: GenerateEvent) => void, signal?: AbortSignal): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/cases/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
      signal,
    });
  } catch {
    throw new ApiError(0, "network", NETWORK_MESSAGE);
  }
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new ApiError(response.status, body?.error ?? "unknown", body?.message ?? "Something went wrong. Please try again.");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as GenerateEvent);
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as GenerateEvent);
}
