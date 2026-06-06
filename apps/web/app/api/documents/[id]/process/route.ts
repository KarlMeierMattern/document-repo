import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const TRANSIENT_STATUSES = new Set([502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const timeoutMsRaw = parseInt(
    process.env.PROCESSOR_TRIGGER_TIMEOUT_MS ?? "120000",
    10
  );
  const timeoutMs =
    Number.isFinite(timeoutMsRaw) && timeoutMsRaw >= 5000 ? timeoutMsRaw : 120000;

  const payload = JSON.stringify({
    document_id: doc.id,
    r2_key: doc.r2Key,
    mime_type: doc.mimeType,
    model,
  });

  let res: Response | null = null;
  let networkError: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    networkError = null;
    res = null;
    try {
      res = await fetch(processorUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-processor-secret": processorSecret,
        },
        body: payload,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      networkError = String(e);
    }

    if (!res && networkError) {
      if (attempt < 2) {
        await sleep(500);
        continue;
      }
      await db
        .update(schema.documents)
        .set({ status: "failed", error: `processor network error: ${networkError}` })
        .where(eq(schema.documents.id, id));
      return NextResponse.json(
        { error: "processor_network_error", detail: networkError },
        { status: 502 }
      );
    }

    if (res && TRANSIENT_STATUSES.has(res.status) && attempt < 2) {
      await sleep(500);
      continue;
    }
    break;
  }

  if (!res) {
    await db
      .update(schema.documents)
      .set({ status: "failed", error: "processor request failed before response" })
      .where(eq(schema.documents.id, id));
    return NextResponse.json(
      { error: "processor_network_error", detail: "no response from processor" },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 500);
    // Roll status back so user can retry
    await db
      .update(schema.documents)
      .set({
        status: "failed",
        error: detail
          ? `processor returned ${res.status}: ${detail}`
          : `processor returned ${res.status}`,
      })
      .where(eq(schema.documents.id, id));
    return NextResponse.json(
      { error: "processor_error", status: res.status, detail },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, status: "processing" });
}
