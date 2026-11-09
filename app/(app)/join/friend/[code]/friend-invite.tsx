"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorBanner, Skeleton } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { useApiData } from "@/lib/hooks";

type Preview = { inviter_name: string; is_self: boolean; already_friends: boolean };

export function FriendInvite() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invite = useApiData(`friend-invite:${code}`, () => api<Preview>(`/friends/invite/${encodeURIComponent(code)}`));

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await api("/friends/accept", { method: "POST", body: { code } });
      router.push("/friends");
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  }

  const data = invite.data;
  return (
    <div className="mx-auto max-w-md">
      <Card title="Friend invite">
        <div className="space-y-3">
          <ErrorBanner message={error ?? invite.error} />
          {!data && !invite.error && <Skeleton className="h-16" />}
          {data?.is_self && <p className="text-sm">This is your own invite link. Send it to a friend!</p>}
          {data?.already_friends && <p className="text-sm">You and {data.inviter_name} are already friends.</p>}
          {data && !data.is_self && !data.already_friends && (
            <>
              <p className="text-sm">
                <strong>{data.inviter_name}</strong> invited you to be friends. You will see each other&apos;s steps on
                the friends board.
              </p>
              <Button onClick={accept} disabled={busy}>
                {busy ? "Accepting…" : "Accept"}
              </Button>
            </>
          )}
          <Link href="/friends" className="block text-sm font-medium text-emerald-600 hover:underline">
            Go to Friends
          </Link>
        </div>
      </Card>
    </div>
  );
}
