import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-bg p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-2 text-sm text-muted-fg">
          Sign in with the allowlisted Google account to continue.
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-fg text-bg px-4 py-3 text-sm font-medium hover:opacity-90 transition"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
