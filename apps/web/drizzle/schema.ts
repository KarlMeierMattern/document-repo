import {
  pgTable,
  uuid,
  text,
  timestamp,
  real,
  date,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerEmail: text("owner_email").notNull(),
  r2Key: text("r2_key").notNull(),
  mimeType: text("mime_type").notNull(),
  originalFilename: text("original_filename"),
  docType: text("doc_type"),
  status: text("status").notNull().default("uploaded"),
  userContext: text("user_context"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const documentFields = pgTable(
  "document_fields",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    valueType: text("value_type").notNull().default("string"),
    confidence: real("confidence"),
  },
  (t) => ({
    docIdx: index("document_fields_document_id_idx").on(t.documentId),
  })
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    reminderType: text("reminder_type").notNull(),
    title: text("title").notNull(),
    dueDate: date("due_date").notNull(),
    status: text("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => ({
    statusDueIdx: index("reminders_status_due_idx").on(t.status, t.dueDate),
  })
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentField = typeof documentFields.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;

export const DOC_TYPES = [
  "warranty",
  "prescription",
  "lab_result",
  "insurance_card",
  "invoice",
  "receipt",
  "vehicle_registration",
  "vaccination_record",
  "id_document",
  "dna_report",
  "medical_record",
  "photo",
  "generic",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_STATUS = [
  "uploaded",
  "processing",
  "processed",
  "failed",
] as const;
export type DocStatus = (typeof DOC_STATUS)[number];

export const REMINDER_STATUS = ["pending", "sent", "dismissed"] as const;
export type ReminderStatus = (typeof REMINDER_STATUS)[number];
