"use client";

import { useState } from "react";
import { CopyLink } from "@/components/copy-link";
import { Segmented } from "@/components/segmented";
import { Button, Card, ErrorBanner, Skeleton, WarningBanner } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { formatMoment } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { useApiData, useOrigin, useToday } from "@/lib/hooks";
import type { BoardRow, FriendsBoard, Nudge } from "@/lib/types";

type Period = "day" | "week";

export default function FriendsPage() {
  const today = useToday();
  const origin = useOrigin();
  const [period, setPeriod] = useState<Period>("day");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invite = useApiData("friend-invite", () => api<{ code: string }>("/friends/invite"));
  const board = useApiData(today ? `friends:${period}:${today}` : null, () =>
    api<FriendsBoard>(`/friends?period=${period}&date=${today}`),
  );
  const nudges = useApiData("nudges", () => api<{ unread: number; items: Nudge[] }>("/nudges"));

  async function run(action: () => Promise<unknown>, done: string, reload: boolean) {
    setNotice(null);
    setError(null);
    try {
      await action();
      setNotice(done);
      if (reload) board.reload();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  function nudge(row: BoardRow, kind: "cheer" | "taunt") {
    const label = kind === "cheer" ? "Cheer" : "Taunt";
    return run(
      () => api("/nudges", { method: "POST", body: { to_user_id: row.user_id, kind } }),
      `${label} sent to ${row.name}.`,
      false,
    );
  }

  function hide(row: BoardRow) {
    return run(
      () => api(`/friends/${row.user_id}/hide`, { method: "POST" }),
      `${row.name} is hidden. You can undo this in Settings.`,
      true,
    );
  }

  function remove(row: BoardRow) {
    if (!window.confirm(`Remove ${row.name} from your friends?`)) return;
    return run(() => api(`/friends/${row.user_id}`, { method: "DELETE" }), `${row.name} was removed.`, true);
  }

  async function markRead() {
    try {
      await api("/nudges/read", { method: "POST" });
      nudges.reload();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Friends</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card
            title="Leaderboard"
            action={
              <Segmented
                label="Period"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: "day", label: "Today" },
                  { value: "week", label: "This week" },
                ]}
              />
            }
          >
            <div className="space-y-3">
              <ErrorBanner message={error ?? board.error} />
              {notice && (
                <p role="status" className="text-sm font-medium text-emerald-600">
                  {notice}
                </p>
              )}
              {board.data && !board.data.steps_available && (
                <WarningBanner>Step counts are temporarily unavailable, so everyone shows 0 for now.</WarningBanner>
              )}
              {!board.data && !board.error && <Skeleton className="h-40" />}
              <ol className="divide-y divide-slate-200 dark:divide-slate-800">
                {board.data?.items.map((row) => (
                  <li key={row.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <span className="w-7 text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                      {row.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {row.name}
                        {row.is_me && <span className="font-normal text-slate-500 dark:text-slate-400"> (you)</span>}
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">{formatNumber(row.steps)}</span>
                    {!row.is_me && (
                      <div className="flex w-full flex-wrap justify-end gap-1 sm:w-auto">
                        <Button variant="secondary" onClick={() => nudge(row, "cheer")} aria-label={`Cheer ${row.name}`}>
                          👏 Cheer
                        </Button>
                        <Button variant="secondary" onClick={() => nudge(row, "taunt")} aria-label={`Taunt ${row.name}`}>
                          😜 Taunt
                        </Button>
                        <Button variant="secondary" onClick={() => hide(row)} aria-label={`Hide ${row.name}`}>
                          Hide
                        </Button>
                        <Button variant="danger" onClick={() => remove(row)} aria-label={`Remove ${row.name}`}>
                          Remove
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Invite a friend">
            <div className="space-y-2">
              <ErrorBanner message={invite.error} />
              {invite.data && origin ? (
                <CopyLink label="Your invite link" value={`${origin}/join/friend/${invite.data.code}`} />
              ) : (
                !invite.error && <Skeleton className="h-10" />
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nobody sees your steps by default. Only people who accept this link become friends and can see you.
              </p>
            </div>
          </Card>

          <Card
            title="Cheers and taunts"
            action={
              nudges.data && nudges.data.unread > 0 ? (
                <Button variant="secondary" onClick={markRead}>
                  Mark {nudges.data.unread} as read
                </Button>
              ) : undefined
            }
          >
            <ErrorBanner message={nudges.error} />
            {nudges.data && nudges.data.items.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nothing yet.</p>
            )}
            <ul className="space-y-2">
              {nudges.data?.items.map((n) => (
                <li key={n.id} className="text-sm">
                  <span className={n.read ? "" : "font-semibold"}>
                    {n.kind === "cheer" ? "👏" : "😜"} {n.from_name} {n.kind === "cheer" ? "cheered you on" : "taunted you"}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {n.group_name ? `${n.group_name} · ` : ""}
                    {formatMoment(n.created_at, today)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
