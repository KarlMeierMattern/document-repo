import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id, fieldId } = await params;
  const body = (await req.json().catch(() => ({}))) as { value?: string };
  if (typeof body.value !== "string") {
    return NextResponse.json({ error: "value_required" }, { status: 400 });
  }

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1);
  if (!doc || doc.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db
    .update(schema.documentFields)
    .set({ value: body.value.slice(0, 2000) })
    .where(
      and(
        eq(schema.documentFields.id, fieldId),
        eq(schema.documentFields.documentId, id)
      )
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id, fieldId } = await params;

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1);
  if (!doc || doc.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db
    .delete(schema.documentFields)
    .where(
      and(
        eq(schema.documentFields.id, fieldId),
        eq(schema.documentFields.documentId, id)
      )
    );
  return NextResponse.json({ ok: true });
}
