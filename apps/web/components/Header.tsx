import { signOut } from "@/lib/auth";
import Link from "next/link";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-2 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Documents
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-3 text-sm sm:w-auto sm:gap-4">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/documents" className="hover:underline">
            All
          </Link>
          {email && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <button className="text-muted-fg hover:text-fg">Sign out</button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
