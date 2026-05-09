import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
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

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .limit(1);
  if (!doc || doc.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!doc.r2Key) {
    return NextResponse.json(
      { error: "no_object", detail: "R2 upload has not completed" },
      { status: 409 }
    );
  }

  // Allow caller to request high-quality reprocess
  const url = new URL(req.url);
  const model = url.searchParams.get("model") ?? undefined;

  const processorUrl = process.env.PROCESSOR_URL;
  const processorSecret = process.env.PROCESSOR_SECRET;
  if (!processorUrl || !processorSecret) {
    return NextResponse.json(
      { error: "processor_not_configured" },
      { status: 500 }
    );
  }

  // Mark processing optimistically; processor is also responsible for state.
  await db
    .update(schema.documents)
    .set({ status: "processing", error: null })
    .where(eq(schema.documents.id, id));

  // Fire-and-forget: we don't await processing, just kicks the job.
  // Processor writes status when finished. Browser polls /api/documents/[id].
  const res = await fetch(processorUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-processor-secret": processorSecret,
    },
    body: JSON.stringify({
      document_id: doc.id,
      r2_key: doc.r2Key,
      mime_type: doc.mimeType,
      model,
    }),
    // Don't block this route on processor latency; Cloud Run will keep running.
    // But we still want to surface immediate errors (auth, network) to the user.
    signal: AbortSignal.timeout(15_000),
  }).catch((e) => {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
  });

  if (!res.ok && res.status !== 200 && res.status !== 202) {
    // Roll status back so user can retry
    await db
      .update(schema.documents)
      .set({ status: "failed", error: `processor returned ${res.status}` })
      .where(eq(schema.documents.id, id));
    return NextResponse.json(
      { error: "processor_error", status: res.status },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, status: "processing" });
}
