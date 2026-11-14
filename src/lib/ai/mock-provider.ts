import "server-only";

import { AiProviderError } from "./errors";
import type { AiCompletion, AiProvider } from "./types";

export type MockBehavior =
  | { kind: "succeed"; output?: string }
  | { kind: "fail"; status: number }
  | { kind: "network" }
  | { kind: "hang" };

/** Deterministic provider for tests and local development; never calls the network. */
export function createMockProvider(
  behavior: MockBehavior = { kind: "succeed" },
  name = "mock",
): AiProvider {
  return {
    name,
    async complete(request, signal) {
      switch (behavior.kind) {
        case "succeed":
          return { text: behavior.output ?? `[mock] ${request.prompt}` };
        case "fail":
          throw new AiProviderError(name, behavior.status, `${name} returned ${behavior.status}`);
        case "network":
          throw new TypeError("fetch failed");
        case "hang":
          return new Promise<AiCompletion>((_, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          });
      }
    },
  };
}
