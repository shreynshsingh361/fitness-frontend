"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button, Card, ErrorBanner, Field, Skeleton, inputClass } from "@/components/ui";
import { ApiError, api, messageOf } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatKg, formatNumber } from "@/lib/format";
import { useApiData } from "@/lib/hooks";
import { newId } from "@/lib/id";
import type { Exercise, NewWorkout, Page, PersonalRecord, Workout } from "@/lib/types";

export default function WorkoutsPage() {
  const exercises = useApiData("exercises", () => api<Page<Exercise>>("/exercises?limit=100"));
  const workouts = useApiData("workouts", () => api<Page<Workout>>("/workouts?limit=20"));
  const records = useApiData("records", () => api<{ items: PersonalRecord[] }>("/records"));

  function reloadAll() {
    workouts.reload();
    records.reload();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <LogWorkoutCard exercises={exercises.data?.items ?? []} loadError={exercises.error} onSaved={reloadAll} />

        <Card title="History">
          <ErrorBanner message={workouts.error} />
          {!workouts.data && !workouts.error && <Skeleton className="h-24" />}
          {workouts.data && workouts.data.items.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No workouts yet. Log your first one above.
            </p>
          )}
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {workouts.data?.items.map((w) => (
              <WorkoutItem key={w.id} workout={w} onDeleted={reloadAll} />
            ))}
          </ul>
          {workouts.data && workouts.data.total > workouts.data.items.length && (
            <p className="mt-3 text-xs text-slate-500">
              Showing the latest {workouts.data.items.length} of {workouts.data.total} workouts.
            </p>
          )}
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card title="Personal records">
          <ErrorBanner message={records.error} />
          {!records.data && !records.error && <Skeleton className="h-24" />}
          {records.data && records.data.items.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your heaviest set for each exercise will show up here.
            </p>
          )}
          <ul className="space-y-2">
            {records.data?.items.map((r) => (
              <li key={r.exercise_id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{r.exercise_name}</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-400">
                  {formatKg(r.weight_kg)} kg × {r.reps}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Log a workout
// ---------------------------------------------------------------------------

type Row = { id: number; exerciseId: string; reps: string; weight: string };

function LogWorkoutCard({
  exercises,
  loadError,
  onSaved,
}: {
  exercises: Exercise[];
  loadError: string | undefined;
  onSaved: () => void;
}) {
  const nextRowId = useRef(1);
  // Identifies THIS save attempt. If the request fails in a way where the server
  // may have saved it anyway (network drop, 5xx), we retry with the same id and
  // the server returns the existing workout instead of creating a duplicate.
  const opId = useRef<string | null>(null);

  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([{ id: 0, exerciseId: "", reps: "", weight: "" }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group the exercises by muscle group for the <select>.
  const groups = new Map<string, Exercise[]>();
  for (const e of exercises) groups.set(e.muscle_group, [...(groups.get(e.muscle_group) ?? []), e]);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const last = rows[rows.length - 1]; // a new set starts as a copy of the previous one
    const id = nextRowId.current++;
    setRows([...rows, { id, exerciseId: last?.exerciseId ?? "", reps: last?.reps ?? "", weight: last?.weight ?? "" }]);
  }

  function removeRow(id: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const sets = rows.map((r) => ({
      exercise_id: r.exerciseId,
      reps: Number(r.reps),
      weight_kg: Number(r.weight || 0),
    }));
    if (sets.some((s) => !s.exercise_id || !Number.isInteger(s.reps) || s.reps < 1)) {
      setError("Every set needs an exercise and a whole number of reps (at least 1).");
      return;
    }

    opId.current ??= newId();
    const body: NewWorkout = {
      client_op_id: opId.current,
      name: name.trim() || "Workout",
      notes: notes.trim(),
      started_at: new Date().toISOString(),
      duration_minutes: Math.max(0, Math.round(Number(duration) || 0)),
      sets,
    };

    setSaving(true);
    try {
      await api<Workout>("/workouts", { method: "POST", body });
      opId.current = null; // done: the next workout is a new operation
      setName("");
      setDuration("");
      setNotes("");
      setRows([{ id: nextRowId.current++, exerciseId: "", reps: "", weight: "" }]);
      setSaved(true);
      onSaved();
    } catch (err) {
      // A 4xx means the server rejected it and saved nothing, so the next try is
      // a fresh operation. Anything else might have been saved: keep the id.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) opId.current = null;
      setError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Log a workout">
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorBanner message={error ?? loadError} />
        {saved && (
          <p role="status" className="text-sm font-medium text-emerald-600">
            Workout saved ✓
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name" className="sm:col-span-2">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Push day"
              maxLength={100}
            />
          </Field>
          <Field label="Duration (min)">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={1440}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="45"
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Sets</legend>
          {rows.map((row, index) => (
            // flex-wrap: on a wide card one set is one line; on a phone the exercise
            // gets its own line and reps / weight / remove wrap beneath it.
            <div key={row.id} className="flex flex-wrap items-center gap-2">
              <span className="w-4 shrink-0 text-xs tabular-nums text-slate-400">{index + 1}</span>
              <select
                aria-label={`Exercise for set ${index + 1}`}
                className={`${inputClass} min-w-0 flex-1 basis-44`}
                value={row.exerciseId}
                onChange={(e) => updateRow(row.id, { exerciseId: e.target.value })}
              >
                <option value="">Choose exercise…</option>
                {[...groups.entries()].map(([group, list]) => (
                  <optgroup key={group} label={group[0].toUpperCase() + group.slice(1)}>
                    {list.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {/* inputClass is w-full, so the width is set on a wrapper instead */}
              <div className="w-20 shrink-0">
                <input
                  aria-label={`Reps for set ${index + 1}`}
                  className={inputClass}
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="reps"
                  value={row.reps}
                  onChange={(e) => updateRow(row.id, { reps: e.target.value })}
                />
              </div>
              <div className="w-24 shrink-0">
                <input
                  aria-label={`Weight in kilograms for set ${index + 1}`}
                  className={inputClass}
                  type="number"
                  min={0}
                  max={1000}
                  step="0.5"
                  placeholder="kg"
                  value={row.weight}
                  onChange={(e) => updateRow(row.id, { weight: e.target.value })}
                />
              </div>
              <button
                type="button"
                aria-label={`Remove set ${index + 1}`}
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="shrink-0 rounded-md p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
          <Button variant="secondary" onClick={addRow}>
            + Add set
          </Button>
        </fieldset>

        <Field label="Notes (optional)">
          <textarea
            className={inputClass}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
          />
        </Field>

        <Button type="submit" disabled={saving || exercises.length === 0}>
          {saving ? "Saving…" : "Save workout"}
        </Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// One workout in the history list (click to see its sets)
// ---------------------------------------------------------------------------

function WorkoutItem({ workout, onDeleted }: { workout: Workout; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The list only has counts. The sets are loaded when you open the workout.
  const detail = useApiData(open ? `workout:${workout.id}` : null, () => api<Workout>(`/workouts/${workout.id}`));

  async function remove() {
    if (!window.confirm(`Delete "${workout.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await api(`/workouts/${workout.id}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(messageOf(err));
      setDeleting(false);
    }
  }

  // Sets arrive in order; group them by exercise for display.
  const byExercise = new Map<string, { reps: number; weight_kg: number }[]>();
  for (const s of detail.data?.sets ?? []) {
    byExercise.set(s.exercise_name, [...(byExercise.get(s.exercise_name) ?? []), s]);
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <div className="font-medium">{workout.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {formatDateTime(workout.started_at)} · {workout.set_count} sets · {formatNumber(workout.volume_kg)} kg
            volume
            {workout.duration_minutes > 0 && ` · ${workout.duration_minutes} min`}
          </div>
        </button>
        <Button variant="danger" onClick={remove} disabled={deleting} aria-label={`Delete ${workout.name}`}>
          {deleting ? "…" : "Delete"}
        </Button>
      </div>

      {error && (
        <div className="mt-2">
          <ErrorBanner message={error} />
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
          <ErrorBanner message={detail.error} />
          {detail.loading && <Skeleton className="h-10" />}
          {[...byExercise.entries()].map(([exercise, sets]) => (
            <div key={exercise}>
              <div className="font-medium">{exercise}</div>
              <div className="tabular-nums text-slate-600 dark:text-slate-400">
                {sets.map((s) => `${s.reps} × ${formatKg(s.weight_kg)} kg`).join("  ·  ")}
              </div>
            </div>
          ))}
          {detail.data?.notes && (
            <p className="border-t border-slate-200 pt-2 text-slate-600 dark:border-slate-800 dark:text-slate-400">
              {detail.data.notes}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
