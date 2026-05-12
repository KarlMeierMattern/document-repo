import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    due_date?: string;
  };
  if (
    body.status !== undefined &&
    body.status !== "dismissed" &&
    body.status !== "pending"
  ) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  if (
    body.due_date !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)
  ) {
    return NextResponse.json({ error: "invalid_due_date" }, { status: 400 });
  }

  // Verify ownership via the joined document
  const [r] = await db
    .select({
      reminderId: schema.reminders.id,
      ownerEmail: schema.documents.ownerEmail,
    })
    .from(schema.reminders)
    .innerJoin(
      schema.documents,
      eq(schema.documents.id, schema.reminders.documentId)
    )
    .where(eq(schema.reminders.id, id))
    .limit(1);

  if (!r || r.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updates: Partial<typeof schema.reminders.$inferInsert> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.due_date !== undefined) updates.dueDate = body.due_date;

  await db
    .update(schema.reminders)
    .set(updates)
    .where(eq(schema.reminders.id, id));
  return NextResponse.json({ ok: true });
}
