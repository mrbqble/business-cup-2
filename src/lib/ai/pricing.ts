import type { AiUsage } from "./types";

/** USD per million tokens (Anthropic list prices; cache writes at the 5-minute rate of 1.25x input). */
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

/** Estimated cost of the given calls in USD, or null when a model has no known price. */
export function estimateCostUsd(usages: readonly (AiUsage | undefined)[]): number | null {
  let total = 0;
  for (const usage of usages) {
    const price = usage && PRICES[usage.model];
    if (!usage || !price) return null;
    total +=
      (usage.inputTokens * price.input +
        usage.outputTokens * price.output +
        usage.cacheReadTokens * price.cacheRead +
        usage.cacheWriteTokens * price.cacheWrite) /
      1_000_000;
  }
  return total;
}
