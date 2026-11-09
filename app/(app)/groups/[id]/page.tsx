import { Suspense } from "react";
import { GroupView } from "./group-view";

// The group's id is only known when someone opens the page, so reading it from the
// URL needs a Suspense boundary (a rule of Next.js with cacheComponents on).
export default function GroupPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <GroupView />
    </Suspense>
  );
}
