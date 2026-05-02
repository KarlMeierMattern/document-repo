import { Header } from "@/components/Header";
import { DocumentDetail } from "@/components/DocumentDetail";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { presignGet } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");
  const { id } = await params;

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1);
  if (!doc || doc.ownerEmail !== session.user.email) notFound();

  const fields = await db
    .select()
    .from(schema.documentFields)
    .where(eq(schema.documentFields.documentId, id));

  const reminders = await db
    .select()
    .from(schema.reminders)
    .where(eq(schema.reminders.documentId, id));

  const previewUrl = doc.r2Key
    ? await presignGet({ key: doc.r2Key, expiresIn: 300 })
    : null;

  return (
    <>
      <Header email={session.user.email} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <DocumentDetail
          doc={doc}
          fields={fields}
          reminders={reminders}
          previewUrl={previewUrl}
        />
      </main>
    </>
  );
}
