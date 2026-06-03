import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { Header } from "@/components/Header";
import { UpcomingReminders } from "@/components/UpcomingReminders";
import { UploadZone } from "@/components/UploadZone";
import { auth } from "@/lib/auth";
import { countsByType, recentDocuments, upcomingReminders } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");
  const email = session.user.email;

  const [recent, reminders, counts] = await Promise.all([
    recentDocuments(email, 10),
    upcomingReminders(email, 30),
    countsByType(email),
  ]);

  return (
    <>
      <Header email={email} />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-fg mb-2">
            Add documents
          </h2>
          <UploadZone />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-fg mb-2">
            Upcoming (next 30 days)
          </h2>
          <UpcomingReminders items={reminders} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-fg mb-2">
            Recent uploads
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-fg">No documents yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {recent.map((d) => (
                <li
                  key={d.id}
                  className="min-w-0 rounded-lg border border-border bg-bg p-3"
                >
                  <Link
                    href={`/documents/${d.id}`}
                    className="block min-w-0 hover:opacity-90"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={d.status} />
                      <span className="text-xs text-muted-fg">
                        {formatDate(d.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium truncate">
                      {d.originalFilename ?? d.id.slice(0, 8)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      {d.docType && (
                        <span className="text-xs text-muted-fg">
                          {d.docType.replace(/_/g, " ")}
                        </span>
                      )}
                      {d.nearestReminder && (
                        <span className="text-xs text-warning">
                          ⏰ {formatDate(d.nearestReminder)}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="mt-2 flex justify-end">
                    <DeleteDocumentButton id={d.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-fg mb-2">By type</h2>
          {counts.length === 0 ? (
            <p className="text-sm text-muted-fg">—</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {counts
                .filter((c) => c.docType)
                .map((c) => (
                  <li
                    key={c.docType}
                    className="rounded-full border border-border px-3 py-1 text-xs"
                  >
                    <span className="font-medium">
                      {c.docType?.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-fg ml-2">{c.count}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    uploaded: "bg-muted text-muted-fg",
    processing: "bg-warning/10 text-warning",
    processed: "bg-success/10 text-success",
    failed: "bg-danger/10 text-danger",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${styles[status] ?? "bg-muted"}`}
    >
      {status}
    </span>
  );
}
