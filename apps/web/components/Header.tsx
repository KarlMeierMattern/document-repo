import { signOut } from "@/lib/auth";
import Link from "next/link";
import { HeaderMenu } from "./HeaderMenu";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/sign-in" });
}

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/dashboard" className="min-w-0 truncate font-semibold tracking-tight">
          Documents
        </Link>
        <HeaderMenu showSignOut={!!email} signOutAction={handleSignOut} />
      </div>
    </header>
  );
}
