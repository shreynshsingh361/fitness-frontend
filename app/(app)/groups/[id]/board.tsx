"use client";

import { useState } from "react";
import { Segmented } from "@/components/segmented";
import { Button, Card, ErrorBanner, Skeleton, WarningBanner } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { useApiData, useToday } from "@/lib/hooks";
import type { Group, Leaderboard, LeaderboardRow, Period } from "@/lib/types";

const PAGE_SIZE = 50;

function stepsText(row: LeaderboardRow): string {
  if (row.steps === null) return "🎭 Hidden";
  return row.steps_hidden ? `${formatNumber(row.steps)}+` : formatNumber(row.steps);
}

export function Board({ group }: { group: Group }) {
  const today = useToday();
  const [period, setPeriod] = useState<Period>(group.challenge_start ? "challenge" : "day");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If an admin cleared the challenge, fall back to today's board.
  const shown: Period = period === "challenge" && !group.challenge_start ? "day" : period;

  const board = useApiData(today ? `board:${group.id}:${shown}:${today}:${page}` : null, () =>
    api<Leaderboard>(`/groups/${group.id}/leaderboard?period=${shown}&date=${today}&page=${page}&limit=${PAGE_SIZE}`),
  );

  const options: { value: Period; label: string }[] = [
    { value: "day", label: "Today" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];
  if (group.challenge_start) options.unshift({ value: "challenge", label: "Challenge" });

  async function nudge(row: LeaderboardRow, kind: "cheer" | "taunt") {
    setNotice(null);
    setError(null);
    try {
      await api("/nudges", { method: "POST", body: { to_user_id: row.user_id, kind, group_id: group.id } });
      setNotice(`${kind === "cheer" ? "Cheer" : "Taunt"} sent to ${row.name}.`);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  const data = board.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const meOnPage = data?.items.some((row) => row.is_me);

  return (
    <Card
      title={data ? `${formatShortDate(data.from)}${data.from === data.to ? "" : ` to ${formatShortDate(data.to)}`}` : "Leaderboard"}
      action={
        <Segmented
          label="Period"
          value={shown}
          onChange={(value) => {
            setPeriod(value);
            setPage(1);
          }}
          options={options}
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
        {data?.mystery_active && (
          <WarningBanner>
            🎭 Mystery mode is on: ranks show, but other people&apos;s steps stay hidden until the day has ended everywhere
            {data.revealed_through ? ` (counts shown up to ${formatShortDate(data.revealed_through)})` : ""}.
          </WarningBanner>
        )}
        {!data && !board.error && <Skeleton className="h-40" />}

        <ol className="divide-y divide-slate-200 dark:divide-slate-800">
          {data?.items.map((row) => (
            <Row key={row.user_id} row={row} group={group} onNudge={nudge} />
          ))}
        </ol>

        {data?.me && !meOnPage && (
          <div className="border-t-2 border-slate-300 pt-1 dark:border-slate-700">
            <Row row={data.me} group={group} onNudge={nudge} />
          </div>
        )}

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

function Row({
  row,
  group,
  onNudge,
}: {
  row: LeaderboardRow;
  group: Group;
  onNudge: (row: LeaderboardRow, kind: "cheer" | "taunt") => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span className="w-7 text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">{row.rank}</span>
      {/* The basis keeps room for the name: on a phone the buttons wrap below instead of squeezing it. */}
      <div className={`min-w-0 flex-1 basis-32 truncate ${row.is_me ? "font-semibold" : "font-medium"}`}>
        {row.name}
        {row.is_me && <span className="font-normal text-slate-500 dark:text-slate-400"> (you)</span>}
      </div>
      <span className="font-semibold tabular-nums">{stepsText(row)}</span>
      {!row.is_me && (
        <div className="ml-auto flex gap-1">
          <Button variant="secondary" onClick={() => onNudge(row, "cheer")} aria-label={`Cheer ${row.name}`}>
            👏
          </Button>
          {group.taunts_enabled && (
            <Button variant="secondary" onClick={() => onNudge(row, "taunt")} aria-label={`Taunt ${row.name}`}>
              😜
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
