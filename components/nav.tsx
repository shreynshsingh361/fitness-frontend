"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/steps", label: "Steps" },
  { href: "/friends", label: "Friends" },
  { href: "/groups", label: "Groups" },
  { href: "/workouts", label: "Workouts" },
  { href: "/nutrition", label: "Nutrition" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      {/* On smaller screens the brand and "Sign out" share the first row and the links
          get a second row that scrolls sideways. From lg up everything sits on one row. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-3">
        <span className="text-base font-bold tracking-tight text-emerald-600">FitTrack</span>

        <nav aria-label="Main" className="order-last flex w-full gap-1 overflow-x-auto [scrollbar-width:none] lg:order-none lg:w-auto lg:flex-1">
          {links.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">{user.name}</span>
          <Button variant="secondary" onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
