import type { GenerateEvent } from "@/app/api/cases/generate/route";
import type { CaseSummary, PlayView } from "@/lib/case/view";
import type { Rank } from "@/lib/game/rank";

import { ensurePlayerToken, forgetPlayerToken } from "./player";

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

/** Sends a request as this device's player; on an unknown token it starts a fresh player once and retries. */
async function send(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  let response: Response;
  try {
    const token = await ensurePlayerToken();
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    });
  } catch {
    throw new ApiError(0, "network", NETWORK_MESSAGE);
  }
  if (response.status === 401 && !retried) {
    forgetPlayerToken();
    return send(url, init, true);
  }
  return response;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await send(url, init);
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

export interface Me {
  player: { id: string; nickname: string; avatar: string };
  streak: number;
  rank: Rank;
  topicCases: { created: number; free: number };
  today: { slug: string; status: "not_started" | "in_progress" | "solved" | "failed"; score: number | null } | null;
}

export interface LeaderboardEntryView {
  rank: number;
  nickname: string;
  avatar: string;
  score: number;
  solved: boolean;
  durationMs: number;
  isYou: boolean;
}

export interface LeaderboardResponse {
  case: CaseSummary;
  entries: LeaderboardEntryView[];
  you: LeaderboardEntryView | null;
  total: number;
}

export const api = {
  me: () => request<Me>("/api/players/me"),
  today: () => request<{ view: PlayView }>("/api/cases/today"),
  leaderboard: (slug: string) => request<LeaderboardResponse>(`/api/cases/${slug}/leaderboard`),
  startPlay: (caseSlug: string) => request<PlayResponse>("/api/plays", { method: "POST", body: JSON.stringify({ caseSlug }) }),
  getPlay: (playId: string) => request<PlayResponse>(`/api/plays/${playId}`),
  open: (playId: string, clueId: string) =>
    request<PlayResponse>(`/api/plays/${playId}/actions`, { method: "POST", body: JSON.stringify({ type: "open", clueId }) }),
  accuse: (playId: string, hypothesisId: string) =>
    request<PlayResponse>(`/api/plays/${playId}/actions`, { method: "POST", body: JSON.stringify({ type: "accuse", hypothesisId }) }),
};

/** Starts a topic generation and calls `onEvent` for each NDJSON event as it arrives. */
export async function generateCase(topic: string, onEvent: (event: GenerateEvent) => void): Promise<void> {
  const response = await send("/api/cases/generate", { method: "POST", body: JSON.stringify({ topic }) });
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
