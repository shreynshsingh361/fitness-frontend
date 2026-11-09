"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorBanner, Skeleton } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useApiData } from "@/lib/hooks";
import type { Group, Member, Page } from "@/lib/types";

const PAGE_SIZE = 50;

export function Members({ group, onChanged }: { group: Group; onChanged: () => void }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const members = useApiData(`members:${group.id}:${page}`, () =>
    api<Page<Member>>(`/groups/${group.id}/members?page=${page}&limit=${PAGE_SIZE}`),
  );

  async function run(action: () => Promise<unknown>, done?: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      if (done) setNotice(done);
      members.reload();
      onChanged();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function remove(m: Member) {
    if (!window.confirm(`Remove ${m.name}? They will not be able to rejoin with the invite link.`)) return;
    return run(() => api(`/groups/${group.id}/members/${m.user_id}`, { method: "DELETE" }), `${m.name} was removed.`);
  }

  function setRole(m: Member, role: "admin" | "member") {
    return run(() => api(`/groups/${group.id}/members/${m.user_id}`, { method: "PATCH", body: { role } }));
  }

  function hide(m: Member) {
    return run(
      () => api(`/friends/${m.user_id}/hide`, { method: "POST" }),
      `${m.name} is hidden. You can undo this in Settings.`,
    );
  }

  async function leave() {
    if (!window.confirm(`Leave ${group.name}?`)) return;
    setError(null);
    try {
      await api(`/groups/${group.id}/leave`, { method: "POST" });
      router.push("/groups");
    } catch (err) {
      setError(messageOf(err));
    }
  }

  const pages = members.data ? Math.max(1, Math.ceil(members.data.total / members.data.limit)) : 1;

  return (
    <Card
      title="Members"
      action={
        <Button variant="secondary" onClick={leave}>
          Leave group
        </Button>
      }
    >
      <div className="space-y-3">
        <ErrorBanner message={error ?? members.error} />
        {notice && (
          <p role="status" className="text-sm font-medium text-emerald-600">
            {notice}
          </p>
        )}
        {!members.data && !members.error && <Skeleton className="h-32" />}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {members.data?.items.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{m.name}</span>
                {m.is_me && <span className="text-slate-500 dark:text-slate-400"> (you)</span>}
                {m.role === "admin" && <span className="text-slate-500 dark:text-slate-400"> · admin</span>}
              </div>
              {!m.is_me && (
                <div className="flex flex-wrap gap-1">
                  <Button variant="secondary" onClick={() => hide(m)} aria-label={`Hide ${m.name}`}>
                    Hide
                  </Button>
                  {group.my_role === "admin" && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => setRole(m, m.role === "admin" ? "member" : "admin")}
                        aria-label={`${m.role === "admin" ? "Remove admin from" : "Make admin"} ${m.name}`}
                      >
                        {m.role === "admin" ? "Remove admin" : "Make admin"}
                      </Button>
                      <Button variant="danger" onClick={() => remove(m)} aria-label={`Remove ${m.name}`}>
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-slate-500 dark:text-slate-400">
              Page {page} of {pages}
            </span>
            <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
