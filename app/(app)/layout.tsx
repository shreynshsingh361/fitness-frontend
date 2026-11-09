"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Nav } from "@/components/nav";
import { rememberReturnPath, useSession } from "@/lib/auth";

// Every page inside the (app) folder is behind this layout, so none of them
// can be seen without a session. This guard only protects the SCREENS; the
// real protection is the gateway, which refuses API calls without a valid token.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session === null) {
      rememberReturnPath(window.location.pathname);
      router.replace("/login");
    }
  }, [session, router]);

  // undefined = still checking localStorage, null = redirecting to /login
  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading…</div>
    );
  }

  return (
    <>
      <Nav user={session.user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
