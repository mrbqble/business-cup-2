import { storage } from "./storage";

const TOKEN_KEY = "dailycase:token";

let creating: Promise<string> | null = null;

/** This device's player token, creating an anonymous player on first use (no sign-up). */
export function ensurePlayerToken(): Promise<string> {
  const saved = storage.get(TOKEN_KEY);
  if (saved) return Promise.resolve(saved);
  creating ??= fetch("/api/players", { method: "POST" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not start a player");
      const { token } = (await response.json()) as { token: string };
      storage.set(TOKEN_KEY, token);
      return token;
    })
    .finally(() => {
      creating = null;
    });
  return creating;
}

/** Drops a token the server no longer recognizes, so the next request creates a fresh player. */
export function forgetPlayerToken(): void {
  storage.remove(TOKEN_KEY);
}
