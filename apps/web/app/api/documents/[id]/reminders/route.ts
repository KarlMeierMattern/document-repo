import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    due_date?: string;
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  }
  if (!body.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) {
    return NextResponse.json({ error: "invalid_due_date" }, { status: 400 });
  }

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1);
  if (!doc || doc.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [created] = await db
    .insert(schema.reminders)
    .values({
      documentId: id,
      reminderType: "custom_date",
      title: title.slice(0, 200),
      dueDate: body.due_date,
      status: "pending",
    })
    .returning();

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);

  return NextResponse.json({ ok: true, reminder: created });
}
