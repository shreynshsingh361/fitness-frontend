"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CopyLink } from "@/components/copy-link";
import { Segmented } from "@/components/segmented";
import { ErrorBanner, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useApiData, useOrigin } from "@/lib/hooks";
import type { Group } from "@/lib/types";
import { Board } from "./board";
import { Chat } from "./chat";
import { Members } from "./members";
import { GroupSettings } from "./group-settings";

type Tab = "board" | "chat" | "members" | "settings";

export function GroupView() {
  const { id } = useParams<{ id: string }>();
  const origin = useOrigin();
  const [tab, setTab] = useState<Tab>("board");
  const group = useApiData(`group:${id}`, () => api<Group>(`/groups/${id}`));

  if (group.error) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={group.error} />
        <Link href="/groups" className="text-sm font-medium text-emerald-600 hover:underline">
          Back to your groups
        </Link>
      </div>
    );
  }
  if (!group.data) return <Skeleton className="h-40" />;

  const g = group.data;
  const tabs: { value: Tab; label: string }[] = [
    { value: "board", label: "Leaderboard" },
    { value: "chat", label: "Chat" },
    { value: "members", label: `Members (${formatNumber(g.member_count)})` },
  ];
  if (g.my_role === "admin") tabs.push({ value: "settings", label: "Settings" });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/groups" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Groups
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{g.name}</h1>
        {g.description && <p className="text-sm text-slate-500 dark:text-slate-400">{g.description}</p>}
      </div>

      {origin && <CopyLink label="Group invite link" value={`${origin}/join/group/${g.invite_code}`} />}

      <Segmented label="Group sections" value={tab} onChange={setTab} options={tabs} />

      {tab === "board" && <Board group={g} />}
      {tab === "chat" && <Chat group={g} />}
      {tab === "members" && <Members group={g} onChanged={group.reload} />}
      {tab === "settings" && g.my_role === "admin" && <GroupSettings group={g} onChanged={group.reload} />}
    </div>
  );
}
