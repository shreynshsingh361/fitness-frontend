import { Suspense } from "react";
import { GroupInvite } from "./group-invite";

export default function JoinGroupPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <GroupInvite />
    </Suspense>
  );
}
