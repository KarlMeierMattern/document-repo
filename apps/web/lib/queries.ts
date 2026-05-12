import { db, schema } from "@/lib/db";
import { and, count, desc, eq, gte, inArray, lte, min, sql } from "drizzle-orm";

export async function recentDocuments(ownerEmail: string, limit = 10) {
  const docs = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.ownerEmail, ownerEmail))
    .orderBy(desc(schema.documents.createdAt))
    .limit(limit);

  if (docs.length === 0) return [];

  const docIds = docs.map((d) => d.id);
  const reminderRows = await db
    .select({
      documentId: schema.reminders.documentId,
      earliestDue: min(schema.reminders.dueDate),
    })
    .from(schema.reminders)
    .where(
      and(
        eq(schema.reminders.status, "pending"),
        inArray(schema.reminders.documentId, docIds),
      )
    )
    .groupBy(schema.reminders.documentId);

  const reminderMap = new Map(reminderRows.map((r) => [r.documentId, r.earliestDue]));
  return docs.map((d) => ({ ...d, nearestReminder: reminderMap.get(d.id) ?? null }));
}

export async function upcomingReminders(ownerEmail: string, days = 30) {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return db
    .select({
      reminder: schema.reminders,
      document: schema.documents,
    })
    .from(schema.reminders)
    .innerJoin(
      schema.documents,
      eq(schema.documents.id, schema.reminders.documentId)
    )
    .where(
      and(
        eq(schema.documents.ownerEmail, ownerEmail),
        eq(schema.reminders.status, "pending"),
        gte(schema.reminders.dueDate, today),
        lte(schema.reminders.dueDate, horizon)
      )
    )
    .orderBy(schema.reminders.dueDate);
}

export async function countsByType(ownerEmail: string) {
  return db
    .select({
      docType: schema.documents.docType,
      count: count(),
    })
    .from(schema.documents)
    .where(eq(schema.documents.ownerEmail, ownerEmail))
    .groupBy(schema.documents.docType);
}

export async function reminderDigest(ownerEmail: string, days = 30) {
  // Same query as upcomingReminders but used by the cron handler.
  return upcomingReminders(ownerEmail, days);
}

export async function listDocuments(opts: {
  ownerEmail: string;
  docType?: string | null;
  search?: string | null;
  limit?: number;
}) {
  const { ownerEmail, docType, search, limit = 100 } = opts;
  const filters = [eq(schema.documents.ownerEmail, ownerEmail)];
  if (docType) filters.push(eq(schema.documents.docType, docType));
  if (search) {
    filters.push(
      sql`(${schema.documents.originalFilename} ILIKE ${"%" + search + "%"})`
    );
  }
  const docs = await db
    .select()
    .from(schema.documents)
    .where(and(...filters))
    .orderBy(desc(schema.documents.createdAt))
    .limit(limit);

  if (docs.length === 0) return [];

  const docIds = docs.map((d) => d.id);
  const reminderRows = await db
    .select({
      documentId: schema.reminders.documentId,
      earliestDue: min(schema.reminders.dueDate),
    })
    .from(schema.reminders)
    .where(
      and(
        eq(schema.reminders.status, "pending"),
        inArray(schema.reminders.documentId, docIds),
      )
    )
    .groupBy(schema.reminders.documentId);

  const reminderMap = new Map(reminderRows.map((r) => [r.documentId, r.earliestDue]));
  return docs.map((d) => ({ ...d, nearestReminder: reminderMap.get(d.id) ?? null }));
}
