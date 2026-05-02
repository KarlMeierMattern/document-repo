import { signOut } from "@/lib/auth";
import Link from "next/link";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Documents
        </Link>
        <nav className="flex items-center gap-4 text-sm">
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
