// Dates are sent to the API as "YYYY-MM-DD" in the USER'S local time zone.
// "Today" depends on where the user is, and the server cannot know that.

/** Local calendar date as YYYY-MM-DD. */
export function formatLocalDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Today in the user's time zone. Only call this in effects, event handlers or useToday(). */
export function todayLocal(): string {
  return formatLocalDate(new Date());
}

/** A YYYY-MM-DD date moved by some days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/** "2026-11-07" -> "7 Nov". Read as local time, so it cannot slip to the day before. */
export function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "2026-11-07" -> "Sat" */
export function formatWeekday(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

/** A chat or inbox time: "14:05" today, otherwise with the date. */
export function formatMoment(iso: string, today: string | null): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return formatLocalDate(d) === today ? time : `${formatShortDate(formatLocalDate(d))}, ${time}`;
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
