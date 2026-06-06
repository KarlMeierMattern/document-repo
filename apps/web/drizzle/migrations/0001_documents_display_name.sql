-- Add editable display name for dashboard/listing cards
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "display_name" text;
