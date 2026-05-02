import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
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

  const body = (await req.json().catch(() => ({}))) as { context?: string };
  const ctx = typeof body.context === "string" ? body.context.slice(0, 5000) : "";

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1);
  if (!doc || doc.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db
    .update(schema.documents)
    .set({ userContext: ctx })
    .where(eq(schema.documents.id, id));
  return NextResponse.json({ ok: true });
}
