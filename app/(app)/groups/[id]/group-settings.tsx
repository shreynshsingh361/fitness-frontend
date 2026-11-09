"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, ErrorBanner, Field, inputClass } from "@/components/ui";
import { api, downloadFile, messageOf } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import type { Group } from "@/lib/types";

type Switchable = "mystery_mode" | "chat_enabled" | "taunts_enabled";

const SWITCHES: { field: Switchable; label: string; help: string }[] = [
  {
    field: "mystery_mode",
    label: "Mystery mode",
    help: "Members see ranks but not other people's steps until the day has ended everywhere. Reports leave those days out too.",
  },
  { field: "chat_enabled", label: "Group chat", help: "Turning this off also hides the existing messages." },
  { field: "taunts_enabled", label: "Taunts", help: "Cheers always stay on." },
];

export function GroupSettings({ group, onChanged }: { group: Group; onChanged: () => void }) {
  const router = useRouter();
  const today = useToday();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [start, setStart] = useState(group.challenge_start ?? "");
  const [end, setEnd] = useState(group.challenge_end ?? "");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(done);
      onChanged();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return run(() => api(`/groups/${group.id}`, { method: "PATCH", body: { name, description } }), "Saved.");
  }

  function saveChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return run(
      () => api(`/groups/${group.id}/challenge`, { method: "PUT", body: { start, end } }),
      `Challenge set: ${formatShortDate(start)} to ${formatShortDate(end)}.`,
    );
  }

  function clearChallenge() {
    setStart("");
    setEnd("");
    return run(() => api(`/groups/${group.id}/challenge`, { method: "DELETE" }), "Challenge cleared.");
  }

  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const query = new URLSearchParams();
    if (reportFrom) query.set("from", reportFrom);
    if (reportTo) query.set("to", reportTo);
    try {
      await downloadFile(`/groups/${group.id}/report.csv?${query}`, "steps-report.csv");
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function deleteGroup() {
    if (!window.confirm(`Delete ${group.name} and its chat for everyone? This cannot be undone.`)) return;
    try {
      await api(`/groups/${group.id}`, { method: "DELETE" });
      router.push("/groups");
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      {notice && (
        <p role="status" className="text-sm font-medium text-emerald-600">
          {notice}
        </p>
      )}

      <Card title="Rules">
        <div className="space-y-4">
          {SWITCHES.map(({ field, label, help }) => (
            <label key={field} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-emerald-600"
                checked={group[field]}
                onChange={(e) =>
                  run(
                    () => api(`/groups/${group.id}`, { method: "PATCH", body: { [field]: e.target.checked } }),
                    `${label} turned ${e.target.checked ? "on" : "off"}.`,
                  )
                }
              />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{help}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Fixed-date challenge">
        <form onSubmit={saveChallenge} className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            From 1 day to 1 year. The group carries on afterwards, and the results stay visible until you change or clear it.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <input className={inputClass} type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </Field>
            <Field label="End">
              <input className={inputClass} type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Set challenge</Button>
            {group.challenge_start && (
              <Button variant="secondary" onClick={clearChallenge}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Download a report">
        <form onSubmit={report} className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A CSV with each member&apos;s totals. Leave the dates empty for the challenge dates, or else this month.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input
                className={inputClass}
                type="date"
                value={reportFrom}
                max={today ?? undefined}
                onChange={(e) => setReportFrom(e.target.value)}
              />
            </Field>
            <Field label="To">
              <input
                className={inputClass}
                type="date"
                value={reportTo}
                max={today ?? undefined}
                onChange={(e) => setReportTo(e.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            Download CSV
          </Button>
        </form>
      </Card>

      <Card title="Group details">
        <form onSubmit={saveDetails} className="space-y-3">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </Field>
          <Field label="Description">
            <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </Field>
          <Button type="submit">Save</Button>
        </form>
      </Card>

      <Card title="Delete group">
        <Button variant="danger" onClick={deleteGroup}>
          Delete this group
        </Button>
      </Card>
    </div>
  );
}
