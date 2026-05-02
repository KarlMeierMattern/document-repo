import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const docType = url.searchParams.get("type");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

  const where = docType
    ? eq(schema.documents.docType, docType)
    : undefined;

  const rows = await db
    .select()
    .from(schema.documents)
    .where(where)
    .orderBy(desc(schema.documents.createdAt))
    .limit(limit);

  return NextResponse.json({ documents: rows });
}
