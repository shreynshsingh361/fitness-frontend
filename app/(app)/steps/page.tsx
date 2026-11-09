"use client";

import Link from "next/link";
import { Card, ErrorBanner, ProgressBar, Skeleton, Stat } from "@/components/ui";
import { WeekChart } from "@/components/week-chart";
import { api } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { formatNumber, fraction } from "@/lib/format";
import { useApiData, useToday } from "@/lib/hooks";
import type { Achievement, StepsDay, StepsHistory, StepsStats } from "@/lib/types";

const SOURCE_NAMES: Record<string, string> = {
  phone: "Phone",
  apple_health: "Apple Health",
  health_connect: "Health Connect",
  fitbit: "Fitbit",
  garmin: "Garmin",
  samsung: "Samsung",
};

export default function StepsPage() {
  const today = useToday();
  const day = useApiData(today ? `steps-day:${today}` : null, () => api<StepsDay>(`/steps/today?date=${today}`));
  const history = useApiData(today ? `steps-history:${today}` : null, () =>
    api<StepsHistory>(`/steps/history?to=${today}`),
  );
  const stats = useApiData(today ? `steps-stats:${today}` : null, () => api<StepsStats>(`/steps/stats?date=${today}`));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Steps</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Today">
            <ErrorBanner message={day.error} />
            {!day.data && !day.error && <Skeleton className="h-36" />}
            {day.data && (
              <div className="space-y-4">
                <div>
                  <div className="text-5xl font-bold tracking-tight tabular-nums">{formatNumber(day.data.steps)}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    of {formatNumber(day.data.goal)} steps
                    {day.data.goal_met ? " · goal reached ✓" : ` · ${formatNumber(day.data.goal - day.data.steps)} to go`}
                  </div>
                </div>
                <ProgressBar label="Steps compared with goal" value={fraction(day.data.steps, day.data.goal)} />
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Distance" value={`${day.data.distance_km} km`} hint="estimated" />
                  <Stat label="Calories" value={formatNumber(day.data.calories)} hint="estimated" />
                  <Stat label="Streak" value={`${day.data.current_streak} d`} hint="at goal in a row" />
                </div>
                {day.data.sources.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    From{" "}
                    {day.data.sources
                      .map((s) => `${SOURCE_NAMES[s.source] ?? s.source} (${formatNumber(s.steps)})`)
                      .join(", ")}
                    . The highest counts, because two devices count the same walk.
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card title="Last 7 days">
            <ErrorBanner message={history.error} />
            {!history.data && !history.error && <Skeleton className="h-44" />}
            {history.data && (
              <div className="space-y-3">
                <WeekChart days={history.data.days} goal={history.data.goal} today={today} />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatNumber(history.data.total_steps)} steps in total, {formatNumber(history.data.average_steps)} a day
                  on average.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <StepSource />

          <Card title="Records">
            <ErrorBanner message={stats.error} />
            {!stats.data && !stats.error && <Skeleton className="h-28" />}
            {stats.data && <Records stats={stats.data} />}
          </Card>
        </div>
      </div>

      <Card title="Achievements">
        {!stats.data && !stats.error && <Skeleton className="h-40" />}
        {stats.data && <Achievements items={stats.data.achievements} />}
      </Card>
    </div>
  );
}

// Steps only ever come from a phone or watch, through the mobile app: nobody can type them
// in. A web page cannot read either, so here this just says where they come from.
function StepSource() {
  return (
    <Card title="Counting steps">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Steps are counted by your phone or watch. Open the Hxvy app on your iPhone or Android phone: it reads them
        from Apple Health or Health Connect. Steps cannot be typed in.
      </p>
    </Card>
  );
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function Records({ stats }: { stats: StepsStats }) {
  const rank = stats.country_rank;
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Longest streak" value={`${stats.longest_streak} days`} />
      <Row
        label="Best day"
        value={stats.best_day ? `${formatNumber(stats.best_day.steps)} (${formatShortDate(stats.best_day.date)})` : "None yet"}
      />
      <Row
        label="Best week"
        value={stats.best_week ? `${formatNumber(stats.best_week.steps)} (from ${formatShortDate(stats.best_week.from)})` : "None yet"}
      />
      <Row label="This week" value={`${formatNumber(stats.this_week.steps)}, goal on ${stats.this_week.days_goal_met} days`} />
      <Row label="All time" value={`${formatNumber(stats.lifetime_steps)} (${stats.lifetime_distance_km} km)`} />
      <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
        {rank ? (
          <p>
            You are <strong className="tabular-nums">#{formatNumber(rank.rank)}</strong> of{" "}
            {formatNumber(rank.total_users)} in {countryName(rank.country)} this week
            {rank.top_100 && " · top 100 ✓"}
          </p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">
            <Link href="/settings" className="font-medium text-emerald-600 hover:underline">
              Set your country
            </Link>{" "}
            to see your rank. Only you see your position.
          </p>
        )}
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}

const PERIODS: { period: Achievement["period"]; label: string }[] = [
  { period: "daily", label: "Today" },
  { period: "weekly", label: "This week" },
  { period: "all_time", label: "All time" },
];

function Achievements({ items }: { items: Achievement[] }) {
  return (
    <div className="space-y-4">
      {PERIODS.map(({ period, label }) => (
        <section key={period}>
          <h3 className="mb-2 text-sm font-semibold">{label}</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((a) => a.period === period)
              .map((a) => (
                <li
                  key={a.id}
                  className={`rounded-lg border p-3 text-sm ${
                    a.earned
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="font-medium">
                    {a.earned ? "✓ " : ""}
                    {a.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {a.description}
                    {a.earned && a.earned_on && period === "all_time" && ` · ${formatShortDate(a.earned_on)}`}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
