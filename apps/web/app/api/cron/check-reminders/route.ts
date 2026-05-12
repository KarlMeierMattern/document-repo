import { db, schema } from "@/lib/db";
import { sendDigest } from "@/lib/email";
import { reminderDigest } from "@/lib/queries";
import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron hits this daily.
 * Auth: Vercel attaches `Authorization: Bearer ${CRON_SECRET}` automatically
 * when the cron job is registered with that secret in vercel.json + env.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!cronSecret || !ownerEmail) {
    return NextResponse.json(
      { error: "missing_env", detail: "CRON_SECRET or OWNER_EMAIL not set" },
      { status: 500 }
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const items = await reminderDigest(ownerEmail, 30);
  if (items.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no_pending" });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://${req.headers.get("host") ?? "localhost:3000"}`;

  const flat = items.map(({ reminder }) => ({
    id: reminder.id,
    title: reminder.title,
    dueDate: reminder.dueDate,
    reminderType: reminder.reminderType,
  }));

  await sendDigest({ to: ownerEmail, items: flat, baseUrl });

  // Record when the email fired without changing status — reminders stay
  // pending and continue appearing in the digest until the user dismisses them.
  const ids = flat.map((r) => r.id);
  await db
    .update(schema.reminders)
    .set({ sentAt: new Date() })
    .where(inArray(schema.reminders.id, ids));

  return NextResponse.json({ ok: true, sent: ids.length });
}

// Also accept POST so it can be triggered manually with curl
export const POST = GET;
