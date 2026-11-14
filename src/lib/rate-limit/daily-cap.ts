/** Default number of brand-new topic cases the whole site may generate per New York day. */
export const DEFAULT_GENERATION_DAILY_CAP = 40;

/**
 * Global daily cap on new topic generations (env GENERATION_DAILY_CAP), a budget guard on top of
 * the per-IP limit. 0 stops new generations; cached topics always stay open.
 */
export function generationDailyCap(env: Record<string, string | undefined> = process.env): number {
  const raw = env.GENERATION_DAILY_CAP?.trim();
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_GENERATION_DAILY_CAP;
  return Number(raw);
}
