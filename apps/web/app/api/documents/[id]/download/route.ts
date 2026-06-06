import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { presignGet } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function safeFilename(input: string) {
  const cleaned = input
    .replace(/[\r\n]/g, " ")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
  return cleaned || "document";
}

function extensionForMime(mime: string | null | undefined) {
  if (!mime) return "";
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/heic") return ".heic";
  if (mime === "image/heif") return ".heif";
  return "";
}

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
  if (!doc || doc.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!doc.r2Key) {
    return NextResponse.json({ error: "no_object" }, { status: 409 });
  }

  const preferredName =
    doc.displayName || doc.originalFilename || `document-${doc.id.slice(0, 8)}`;
  let filename = safeFilename(preferredName);
  if (!filename.includes(".")) {
    const originalExt = doc.originalFilename?.includes(".")
      ? `.${doc.originalFilename.split(".").pop()!.toLowerCase()}`
      : "";
    filename = `${filename}${originalExt || extensionForMime(doc.mimeType)}`;
  }
  const signed = await presignGet({
    key: doc.r2Key,
    expiresIn: 300,
    responseContentDisposition: `attachment; filename="${filename}"`,
    responseContentType: doc.mimeType,
  });
  return NextResponse.redirect(signed, { status: 302 });
}
