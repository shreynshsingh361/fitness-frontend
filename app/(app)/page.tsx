"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, ErrorBanner, ProgressBar, Skeleton, Stat, WarningBanner } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { formatKg, formatNumber, fraction } from "@/lib/format";
import { useApiData, useToday } from "@/lib/hooks";
import type { Dashboard } from "@/lib/types";

// A rough daily reference for the water bar. The backend stores what you drank
// but has no water goal (yet), so this number lives only in the frontend.
const WATER_REFERENCE_ML = 2000;

export default function DashboardPage() {
  const session = useSession();
  const today = useToday();
  const [actionError, setActionError] = useState<string | null>(null);

  // ONE request. The gateway asks the workout, nutrition and activity services at
  // the same time and combines their answers.
  const { data, error, reload } = useApiData(today ? `dashboard:${today}` : null, () =>
    api<Dashboard>(`/dashboard?date=${today}`),
  );

  async function addWater(ml: number) {
    setActionError(null);
    try {
      await api("/water", { method: "POST", body: { amount_ml: ml, date: today } });
      reload();
    } catch (err) {
      setActionError(messageOf(err));
    }
  }

  const firstName = session?.user.name.split(" ")[0];
  const nutrition = data?.nutrition;
  const workouts = data?.workouts;
  const steps = data?.steps;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hi{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Here is your day at a glance.</p>
      </div>

      <ErrorBanner message={error ?? actionError} />
      {data && data.unavailable.length > 0 && (
        <WarningBanner>
          Some data is temporarily unavailable ({data.unavailable.join(", ")}). The rest of the dashboard still
          works.
        </WarningBanner>
      )}

      {!data && !error ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="sm:col-span-2"
            title="Steps today"
            action={
              <Link href="/steps" className="text-sm font-medium text-emerald-600 hover:underline">
                See details
              </Link>
            }
          >
            {steps ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <Stat label="Walked" value={formatNumber(steps.steps)} hint={`of ${formatNumber(steps.goal)} goal`} />
                  <div className="flex gap-6">
                    <Stat label="Distance" value={`${steps.distance_km} km`} />
                    <Stat label="Calories" value={formatNumber(steps.calories)} />
                    <Stat label="Streak" value={`${steps.current_streak} d`} />
                  </div>
                </div>
                <ProgressBar label="Steps compared with goal" value={fraction(steps.steps, steps.goal)} />
              </div>
            ) : (
              <Unavailable what="Steps" />
            )}
          </Card>

          <Card
            title="Calories today"
            action={
              <Link href="/nutrition" className="text-sm font-medium text-emerald-600 hover:underline">
                Log food
              </Link>
            }
          >
            {nutrition ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <Stat label="Eaten" value={formatNumber(nutrition.calories_eaten)} hint="kcal" />
                  <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                    of {formatNumber(nutrition.calories_goal)} goal
                  </div>
                </div>
                <ProgressBar
                  label="Calories eaten compared with goal"
                  value={fraction(nutrition.calories_eaten, nutrition.calories_goal)}
                  tone={nutrition.calories_eaten > nutrition.calories_goal ? "amber" : "emerald"}
                />
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {nutrition.calories_eaten > nutrition.calories_goal
                    ? `${formatNumber(nutrition.calories_eaten - nutrition.calories_goal)} kcal over your goal`
                    : `${formatNumber(nutrition.calories_goal - nutrition.calories_eaten)} kcal left`}
                </div>
              </div>
            ) : (
              <Unavailable what="Nutrition" />
            )}
          </Card>

          <Card title="Macros today">
            {nutrition ? (
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Protein" value={`${nutrition.protein_g} g`} />
                <Stat label="Carbs" value={`${nutrition.carbs_g} g`} />
                <Stat label="Fat" value={`${nutrition.fat_g} g`} />
              </div>
            ) : (
              <Unavailable what="Nutrition" />
            )}
          </Card>

          <Card title="Water today">
            {nutrition ? (
              <div className="space-y-3">
                <Stat label="Drunk" value={`${formatNumber(nutrition.water_ml)} ml`} />
                <ProgressBar
                  label="Water compared with a 2 litre reference"
                  value={fraction(nutrition.water_ml, WATER_REFERENCE_ML)}
                  tone="sky"
                />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => addWater(250)}>
                    +250 ml
                  </Button>
                  <Button variant="secondary" onClick={() => addWater(500)}>
                    +500 ml
                  </Button>
                </div>
              </div>
            ) : (
              <Unavailable what="Nutrition" />
            )}
          </Card>

          <Card
            title="Last 7 days of training"
            action={
              <Link href="/workouts" className="text-sm font-medium text-emerald-600 hover:underline">
                Log workout
              </Link>
            }
          >
            {workouts ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Workouts" value={workouts.workouts} />
                  <Stat label="Sets" value={workouts.total_sets} />
                  <Stat label="Volume" value={formatKg(Math.round(workouts.volume_kg))} hint="kg lifted" />
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {workouts.last_workout_at
                    ? `Last session: ${formatDay(workouts.last_workout_at)}`
                    : "No workouts logged this week yet."}
                </div>
              </div>
            ) : (
              <Unavailable what="Workouts" />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400">{what} data is unavailable right now.</p>;
}
