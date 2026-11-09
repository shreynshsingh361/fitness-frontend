import { formatShortDate, formatWeekday } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { StepsHistoryDay } from "@/lib/types";

/**
 * Daily steps as bars with the goal as a dashed line. One series, so no legend: the
 * card's title names it. Exact numbers appear on hover, and the same data opens as a
 * real table for keyboard and screen-reader users (the bars themselves are hidden from them).
 */
export function WeekChart({ days, goal, today }: { days: StepsHistoryDay[]; goal: number; today: string | null }) {
  const top = Math.max(goal, ...days.map((d) => d.steps)) * 1.1;
  const goalPercent = (goal / top) * 100;

  return (
    <figure>
      <div className="relative h-44" aria-hidden="true">
        <div
          className="absolute inset-x-0 border-t border-dashed border-slate-400 dark:border-slate-500"
          style={{ bottom: `${goalPercent}%` }}
        >
          <span className="absolute -top-5 right-0 text-xs text-slate-500 dark:text-slate-400">
            Goal {formatNumber(goal)}
          </span>
        </div>
        <div className="absolute inset-0 flex items-end border-b border-slate-200 dark:border-slate-800">
          {days.map((d) => (
            // The whole column is the hover target, not just the thin bar.
            <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-7 rounded-t bg-emerald-600 transition group-hover:opacity-80"
                style={{ height: d.steps > 0 ? `max(2px, ${(d.steps / top) * 100}%)` : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs whitespace-nowrap shadow-sm group-hover:block dark:border-slate-700 dark:bg-slate-950">
                <div className="font-semibold tabular-nums">{formatNumber(d.steps)} steps</div>
                <div className="text-slate-500 dark:text-slate-400">
                  {formatShortDate(d.date)} · {d.goal_met ? "goal reached" : "below goal"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1 flex" aria-hidden="true">
        {days.map((d) => (
          <div
            key={d.date}
            className={`flex-1 text-center text-xs ${
              d.date === today ? "font-semibold" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {formatWeekday(d.date)}
          </div>
        ))}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-500 dark:text-slate-400">Show as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Steps</th>
              <th className="py-1 font-medium">Goal</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td className="py-0.5">{formatShortDate(d.date)}</td>
                <td className="py-0.5">{formatNumber(d.steps)}</td>
                <td className="py-0.5">{d.goal_met ? "reached" : "not reached"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
