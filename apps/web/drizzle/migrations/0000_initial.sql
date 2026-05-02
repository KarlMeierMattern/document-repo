-- Initial schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_email" text NOT NULL,
  "r2_key" text NOT NULL,
  "mime_type" text NOT NULL,
  "original_filename" text,
  "doc_type" text,
  "status" text DEFAULT 'uploaded' NOT NULL,
  "user_context" text,
  "error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "processed_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "document_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "value_type" text DEFAULT 'string' NOT NULL,
  "confidence" real
);

CREATE INDEX IF NOT EXISTS "document_fields_document_id_idx" ON "document_fields" ("document_id");

CREATE TABLE IF NOT EXISTS "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "reminder_type" text NOT NULL,
  "title" text NOT NULL,
  "due_date" date NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "sent_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "reminders_status_due_idx" ON "reminders" ("status", "due_date");
