"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, ErrorBanner, Field, Skeleton, inputClass } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { useApiData } from "@/lib/hooks";
import type { Group } from "@/lib/types";

export default function GroupsPage() {
  const router = useRouter();
  const groups = useApiData("groups", () => api<{ items: Group[] }>("/groups"));

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const group = await api<Group>("/groups", { method: "POST", body: { name, description } });
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setCreateError(messageOf(err));
      setCreating(false);
    }
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoining(true);
    setJoinError(null);
    // People may paste the whole invite link, so keep only the code at its end.
    const inviteCode = code.trim().split("/").pop() ?? "";
    try {
      const group = await api<Group>("/groups/join", { method: "POST", body: { code: inviteCode } });
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setJoinError(messageOf(err));
      setJoining(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Groups</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card title="Your groups">
            <ErrorBanner message={groups.error} />
            {!groups.data && !groups.error && <Skeleton className="h-24" />}
            {groups.data && groups.data.items.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You are not in a group yet. Create one for your office, family or gym, or join with an invite link.
                There is nothing to start or stop: the leaderboards just run.
              </p>
            )}
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {groups.data?.items.map((g) => (
                <li key={g.id}>
                  <Link href={`/groups/${g.id}`} className="block py-3 hover:opacity-80">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatNumber(g.member_count)} {g.member_count === 1 ? "member" : "members"}
                      {g.my_role === "admin" && " · you are an admin"}
                      {g.mystery_mode && " · mystery mode"}
                      {g.challenge_start &&
                        g.challenge_end &&
                        ` · challenge ${formatShortDate(g.challenge_start)} to ${formatShortDate(g.challenge_end)}`}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Create a group">
            <form onSubmit={create} className="space-y-3">
              <ErrorBanner message={createError} />
              <Field label="Name">
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Office walkers"
                  required
                />
              </Field>
              <Field label="Description (optional)">
                <input
                  className={inputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </Field>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create group"}
              </Button>
            </form>
          </Card>

          <Card title="Join a group">
            <form onSubmit={join} className="space-y-3">
              <ErrorBanner message={joinError} />
              <Field label="Invite link or code">
                <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} required />
              </Field>
              <Button type="submit" variant="secondary" disabled={joining}>
                {joining ? "Joining…" : "Join"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
