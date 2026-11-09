"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorBanner, Field, ProgressBar, Skeleton, Stat, inputClass } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { formatNumber, fraction } from "@/lib/format";
import { useApiData, useToday } from "@/lib/hooks";
import { newId } from "@/lib/id";
import type { DiaryDay, DiaryEntry, Food, Goal, Meal, Page } from "@/lib/types";

const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

type Water = { date: string; water_ml: number };

export default function NutritionPage() {
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? today; // null until we know the user's local date

  const diary = useApiData(date ? `diary:${date}` : null, () => api<DiaryDay>(`/diary?date=${date}`));
  const goal = useApiData("goal", () => api<Goal>("/goals"));
  const water = useApiData(date ? `water:${date}` : null, () => api<Water>(`/water?date=${date}`));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Nutrition</h1>
        <Field label="Day">
          <input
            className={inputClass}
            type="date"
            value={date ?? ""}
            onChange={(e) => e.target.value && setPicked(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SummaryCard diary={diary.data} goal={goal.data} error={diary.error ?? goal.error} onGoalSaved={goal.reload} />
        <WaterCard date={date} water={water.data} error={water.error} onChanged={water.reload} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DiaryCard diary={diary.data} loading={diary.loading} onChanged={diary.reload} />
        </div>
        <div className="lg:col-span-2">
          <AddFoodCard date={date} onAdded={diary.reload} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calories + macros vs. the goal
// ---------------------------------------------------------------------------

function SummaryCard({
  diary,
  goal,
  error,
  onGoalSaved,
}: {
  diary: DiaryDay | undefined;
  goal: Goal | undefined;
  error: string | undefined;
  onGoalSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveGoal() {
    setSaveError(null);
    try {
      await api("/goals", { method: "PUT", body: { calories: Number(value) } });
      setEditing(false);
      onGoalSaved();
    } catch (err) {
      setSaveError(messageOf(err));
    }
  }

  const eaten = diary?.totals.calories ?? 0;
  const target = goal?.calories ?? 0;

  return (
    <Card
      title="Calories"
      action={
        goal && !editing ? (
          <button
            type="button"
            className="text-sm font-medium text-emerald-600 hover:underline"
            onClick={() => {
              setValue(String(goal.calories));
              setEditing(true);
            }}
          >
            Change goal
          </button>
        ) : undefined
      }
    >
      <ErrorBanner message={error ?? saveError} />
      {!diary || !goal ? (
        !error && <Skeleton className="h-28" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <Stat label="Eaten" value={formatNumber(eaten)} hint="kcal" />
            <div className="text-right text-sm text-slate-500 dark:text-slate-400">
              {editing ? (
                <span className="flex items-center gap-2">
                  <input
                    aria-label="Daily calorie goal"
                    className={`${inputClass} w-24`}
                    type="number"
                    min={500}
                    max={10000}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                  <Button onClick={saveGoal}>Save</Button>
                  <Button variant="secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </span>
              ) : (
                <>
                  goal {formatNumber(goal.calories)}
                  {goal.is_default && <span className="block text-xs">(default, change it to fit you)</span>}
                </>
              )}
            </div>
          </div>
          <ProgressBar
            label="Calories eaten compared with goal"
            value={fraction(eaten, target)}
            tone={eaten > target ? "amber" : "emerald"}
          />
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Protein" value={`${diary.totals.protein_g} g`} />
            <Stat label="Carbs" value={`${diary.totals.carbs_g} g`} />
            <Stat label="Fat" value={`${diary.totals.fat_g} g`} />
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

function WaterCard({
  date,
  water,
  error,
  onChanged,
}: {
  date: string | null;
  water: Water | undefined;
  error: string | undefined;
  onChanged: () => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setActionError(messageOf(err));
    }
  }

  return (
    <Card title="Water">
      <ErrorBanner message={error ?? actionError} />
      {!water ? (
        !error && <Skeleton className="h-28" />
      ) : (
        <div className="space-y-4">
          <Stat label="Drunk" value={`${formatNumber(water.water_ml)} ml`} />
          <ProgressBar label="Water compared with a 2 litre reference" value={fraction(water.water_ml, 2000)} tone="sky" />
          <div className="flex flex-wrap gap-2">
            {[250, 500].map((ml) => (
              <Button
                key={ml}
                variant="secondary"
                disabled={!date}
                onClick={() => run(() => api("/water", { method: "POST", body: { amount_ml: ml, date } }))}
              >
                +{ml} ml
              </Button>
            ))}
            <Button
              variant="danger"
              disabled={!date || water.water_ml === 0}
              onClick={() => run(() => api(`/water?date=${date}`, { method: "DELETE" }))}
            >
              Reset day
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Today's diary, grouped by meal
// ---------------------------------------------------------------------------

function DiaryCard({
  diary,
  loading,
  onChanged,
}: {
  diary: DiaryDay | undefined;
  loading: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function remove(entry: DiaryEntry) {
    setError(null);
    try {
      await api(`/diary/${entry.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return (
    <Card title="Food diary">
      <ErrorBanner message={error} />
      {loading && <Skeleton className="h-32" />}
      {diary && diary.entries.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing logged for this day yet.</p>
      )}
      <div className="space-y-5">
        {MEALS.map(({ id, label }) => {
          const entries = diary?.entries.filter((e) => e.meal === id) ?? [];
          if (entries.length === 0) return null;
          const subtotal = entries.reduce((sum, e) => sum + e.calories, 0);
          return (
            <section key={id}>
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">{label}</h3>
                <span className="text-xs tabular-nums text-slate-500">{formatNumber(subtotal)} kcal</span>
              </div>
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{e.food_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {e.servings} × {e.serving} · P {e.protein_g} · C {e.carbs_g} · F {e.fat_g}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular-nums">{formatNumber(e.calories)} kcal</span>
                      <button
                        type="button"
                        aria-label={`Remove ${e.food_name}`}
                        onClick={() => remove(e)}
                        className="rounded-md p-1 text-slate-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Search the food catalogue and add to the diary
// ---------------------------------------------------------------------------

function AddFoodCard({ date, onAdded }: { date: string | null; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(""); // the query after a short pause in typing
  const [meal, setMeal] = useState<Meal>("lunch");
  const [servings, setServings] = useState("1");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const foods = useApiData(`foods:${search}`, () =>
    api<Page<Food>>(`/foods?limit=8&search=${encodeURIComponent(search)}`),
  );

  async function add(food: Food) {
    if (!date) return;
    setError(null);
    setAddingId(food.id);
    try {
      await api("/diary", {
        method: "POST",
        body: {
          client_op_id: newId(),
          food_id: food.id,
          meal,
          servings: Number(servings),
          eaten_on: date,
        },
      });
      onAdded();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Card title="Add food">
      <div className="space-y-3">
        <ErrorBanner message={error ?? foods.error} />
        <Field label="Search foods">
          <input
            className={inputClass}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="egg, rice, dal…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Meal">
            <select className={inputClass} value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
              {MEALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Servings">
            <input
              className={inputClass}
              type="number"
              min={0.1}
              max={20}
              step="0.5"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </Field>
        </div>

        {!foods.data && !foods.error && <Skeleton className="h-24" />}
        {foods.data && foods.data.items.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No foods match “{search}”.</p>
        )}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {foods.data?.items.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{f.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {f.serving} · {f.calories} kcal
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={!date || addingId !== null}
                onClick={() => add(f)}
                aria-label={`Add ${f.name}`}
              >
                {addingId === f.id ? "…" : "Add"}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
