import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { DocumentsSearch } from "@/components/DocumentsSearch";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { listDocuments } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DocumentsList({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");
  const sp = await searchParams;

  const docs = await listDocuments({
    ownerEmail: session.user.email,
    docType: sp.type ?? null,
    search: sp.q ?? null,
  });

  return (
    <>
      <Header email={session.user.email} />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <DocumentsSearch initialType={sp.type ?? ""} initialQ={sp.q ?? ""} />

        {docs.length === 0 ? (
          <p className="text-sm text-muted-fg">No documents match.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
            {docs.map((d) => (
              <li key={d.id} className="px-4 py-3 flex items-center gap-2">
                <Link
                  href={`/documents/${d.id}`}
                  className="flex-1 min-w-0 flex items-center justify-between gap-4 hover:opacity-90"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {d.originalFilename ?? d.id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-muted-fg">
                      {d.docType?.replace(/_/g, " ") ?? "—"} ·{" "}
                      {d.nearestReminder
                        ? `⏰ ${formatDate(d.nearestReminder)}`
                        : formatDate(d.createdAt)}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide bg-muted rounded-full px-2 py-0.5">
                    {d.status}
                  </span>
                </Link>
                <DeleteDocumentButton id={d.id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
