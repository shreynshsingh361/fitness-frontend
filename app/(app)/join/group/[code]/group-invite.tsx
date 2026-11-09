"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorBanner, Skeleton } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useApiData } from "@/lib/hooks";
import type { Group, GroupPreview } from "@/lib/types";

export function GroupInvite() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invite = useApiData(`group-invite:${code}`, () =>
    api<GroupPreview>(`/groups/invite/${encodeURIComponent(code)}`),
  );

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const group = await api<Group>("/groups/join", { method: "POST", body: { code } });
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  }

  const data = invite.data;
  return (
    <div className="mx-auto max-w-md">
      <Card title="Group invite">
        <div className="space-y-3">
          <ErrorBanner message={error ?? invite.error} />
          {!data && !invite.error && <Skeleton className="h-20" />}
          {data && (
            <>
              <div>
                <div className="text-lg font-semibold">{data.name}</div>
                {data.description && <p className="text-sm text-slate-500 dark:text-slate-400">{data.description}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatNumber(data.member_count)} {data.member_count === 1 ? "member" : "members"}
                </p>
              </div>
              {data.is_member ? (
                <Link href={`/groups/${data.id}`} className="block text-sm font-medium text-emerald-600 hover:underline">
                  You are in this group. Open it
                </Link>
              ) : (
                <>
                  <p className="text-sm">Everyone in the group will be able to see you and your steps on its leaderboards.</p>
                  <Button onClick={join} disabled={busy}>
                    {busy ? "Joining…" : "Join group"}
                  </Button>
                </>
              )}
            </>
          )}
          <Link href="/groups" className="block text-sm font-medium text-emerald-600 hover:underline">
            Go to Groups
          </Link>
        </div>
      </Card>
    </div>
  );
}
