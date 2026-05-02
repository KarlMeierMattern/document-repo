import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { buildR2Key, presignPut } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    filename?: string;
    contentType?: string;
    size?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { filename, contentType, size } = body;
  if (!contentType || !ACCEPTED.has(contentType.toLowerCase())) {
    return NextResponse.json(
      { error: "unsupported_content_type", accepted: [...ACCEPTED] },
      { status: 415 }
    );
  }
  if (typeof size !== "number" || size <= 0 || size > MAX_BYTES) {
    return NextResponse.json(
      { error: "invalid_size", maxBytes: MAX_BYTES },
      { status: 413 }
    );
  }

  const [doc] = await db
    .insert(schema.documents)
    .values({
      ownerEmail: session.user.email,
      r2Key: "", // filled after we have the id
      mimeType: contentType,
      originalFilename: filename ?? null,
      status: "uploaded",
    })
    .returning();

  const r2Key = buildR2Key({ documentId: doc.id, filename });
  await db
    .update(schema.documents)
    .set({ r2Key })
    .where(eq(schema.documents.id, doc.id));

  const uploadUrl = await presignPut({ key: r2Key, contentType });

  return NextResponse.json({
    documentId: doc.id,
    r2Key,
    uploadUrl,
  });
}
