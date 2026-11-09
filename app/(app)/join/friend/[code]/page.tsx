import { Suspense } from "react";
import { FriendInvite } from "./friend-invite";

export default function JoinFriendPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <FriendInvite />
    </Suspense>
  );
}
