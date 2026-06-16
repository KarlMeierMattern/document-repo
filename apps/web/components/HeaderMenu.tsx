"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function itemClass(active: boolean) {
  return [
    "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-accent/10 text-accent"
      : "text-fg hover:bg-muted",
  ].join(" ");
}

export function HeaderMenu({
  showSignOut,
  signOutAction,
}: {
  showSignOut: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onDashboard =
    pathname === "/documents" || pathname.startsWith("/documents/");

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-fg shadow-sm hover:bg-border/60 active:bg-border/80"
      >
        Menu
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-lg border border-border bg-bg p-1 shadow-lg"
        >
          <Link
            href="/documents"
            role="menuitem"
            className={itemClass(onDashboard)}
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          {showSignOut && (
            <form action={signOutAction} className="border-t border-border pt-1 mt-1">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
