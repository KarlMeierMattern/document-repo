import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { presignGet } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1);
  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (doc.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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

  return NextResponse.json({
    document: doc,
    fields,
    reminders,
    previewUrl,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1);
  if (!doc || doc.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db.delete(schema.documents).where(eq(schema.documents.id, id));
  // Note: R2 object is intentionally left in place; an optional lifecycle
  // rule can clean up `raw/` orphans later.
  return NextResponse.json({ ok: true });
}
