/** Daily cases change at midnight in New York. */
export const DAILY_TIME_ZONE = "America/New_York";

/** The calendar date in New York as YYYY-MM-DD. */
export function todayDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
