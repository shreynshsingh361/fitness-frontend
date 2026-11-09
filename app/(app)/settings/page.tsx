"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, ErrorBanner, Field, Skeleton, inputClass } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { deleteAccount, useSession } from "@/lib/auth";
import { useApiData } from "@/lib/hooks";
import type { HiddenUser, StepSettings } from "@/lib/types";

// Only used to show your own rank; nothing else depends on it.
const COUNTRIES: [string, string][] = [
  ["AU", "Australia"],
  ["BD", "Bangladesh"],
  ["BR", "Brazil"],
  ["CA", "Canada"],
  ["DE", "Germany"],
  ["ES", "Spain"],
  ["FR", "France"],
  ["GB", "United Kingdom"],
  ["ID", "Indonesia"],
  ["IN", "India"],
  ["IT", "Italy"],
  ["JP", "Japan"],
  ["MX", "Mexico"],
  ["NG", "Nigeria"],
  ["NL", "Netherlands"],
  ["NP", "Nepal"],
  ["PK", "Pakistan"],
  ["SG", "Singapore"],
  ["AE", "United Arab Emirates"],
  ["US", "United States"],
  ["ZA", "South Africa"],
];

export default function SettingsPage() {
  const session = useSession();
  const settings = useApiData("step-settings", () => api<StepSettings>("/steps/settings"));
  const hidden = useApiData("hidden", () => api<{ items: HiddenUser[] }>("/friends/hidden"));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card title="Step goal and country">
        <ErrorBanner message={settings.error} />
        {!settings.data && !settings.error && <Skeleton className="h-24" />}
        {settings.data && <GoalForm initial={settings.data} onSaved={settings.reload} />}
      </Card>

      <HiddenCard items={hidden.data?.items} error={hidden.error} onChanged={hidden.reload} />

      <Card title="Account">
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Signed in as {session?.user.email}.</p>
        <DeleteAccount />
      </Card>
    </div>
  );
}

function GoalForm({ initial, onSaved }: { initial: StepSettings; onSaved: () => void }) {
  const [goal, setGoal] = useState(String(initial.daily_goal));
  const [country, setCountry] = useState(initial.country ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api("/steps/settings", { method: "PUT", body: { daily_goal: Number(goal), country } });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  const known = COUNTRIES.some(([code]) => code === country);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorBanner message={error} />
      {saved && (
        <p role="status" className="text-sm font-medium text-emerald-600">
          Saved ✓
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Daily step goal">
          <input
            className={inputClass}
            type="number"
            min={1000}
            max={100000}
            step={500}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
          />
        </Field>
        <Field label="Country (optional)">
          <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Not set</option>
            {!known && country && <option value={country}>{country}</option>}
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        The country is only used to show you your own rank. Nobody else sees it.
      </p>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function HiddenCard({
  items,
  error,
  onChanged,
}: {
  items: HiddenUser[] | undefined;
  error: string | undefined;
  onChanged: () => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);

  async function unhide(person: HiddenUser) {
    setActionError(null);
    try {
      await api(`/friends/${person.user_id}/hide`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setActionError(messageOf(err));
    }
  }

  return (
    <Card title="Hidden people">
      <div className="space-y-2">
        <ErrorBanner message={error ?? actionError} />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          You and anyone hidden here stop seeing each other everywhere: boards, member lists and chat. They are not told.
        </p>
        {!items && !error && <Skeleton className="h-10" />}
        {items && items.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Nobody is hidden.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {items?.map((person) => (
            <li key={person.user_id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">{person.name}</span>
              <Button variant="secondary" onClick={() => unhide(person)} aria-label={`Unhide ${person.name}`}>
                Unhide
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Delete your account and all your data? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password); // on success the guard sends us to the login page
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorBanner message={error} />
      <p className="text-sm">
        This permanently deletes your login, steps, workouts, food diary, friends, group memberships and chat messages.
        It cannot be undone.
      </p>
      <Field label="Your password">
        <input
          className={inputClass}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={busy}>
          {busy ? "Deleting…" : "Delete everything"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
