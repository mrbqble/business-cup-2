/** The calendar day before a YYYY-MM-DD date key. */
export function previousDateKey(dateKey: string): string {
  const day = new Date(`${dateKey}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

/**
 * Consecutive days, ending today or yesterday, on which the player finished that day's daily case.
 * A streak that ended yesterday is still alive until today's case is missed.
 */
export function currentStreak(finishedDays: Iterable<string>, today: string): number {
  const days = new Set(finishedDays);
  let day = days.has(today) ? today : previousDateKey(today);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = previousDateKey(day);
  }
  return streak;
}
