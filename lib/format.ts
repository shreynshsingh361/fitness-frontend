/** 1234.5 -> "1,235" */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Weights: 60 -> "60", 62.5 -> "62.5" */
export function formatKg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Fraction 0..1 for a progress bar (never above 100%). */
export function fraction(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, Math.max(0, value / goal));
}
