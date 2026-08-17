CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "timeline_entries" (
  "id" TEXT NOT NULL,
  "legacy_key" TEXT NOT NULL,
  "dataset" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "universe" TEXT NOT NULL,
  "reality" TEXT NOT NULL,
  "note" TEXT,
  "season" TEXT,
  "episodes" TEXT,
  "period" TEXT,
  "year_start" DOUBLE PRECISION,
  "year_end" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "timeline_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "watch_records" (
  "user_id" TEXT NOT NULL,
  "entry_id" TEXT NOT NULL,
  "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "watch_records_pkey" PRIMARY KEY ("user_id", "entry_id")
);

CREATE TABLE "release_queue_items" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "release_queue_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timeline_entries_legacy_key_key" ON "timeline_entries"("legacy_key");
CREATE INDEX "timeline_entries_dataset_reality_idx" ON "timeline_entries"("dataset", "reality");
CREATE INDEX "timeline_entries_title_idx" ON "timeline_entries"("title");
CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");
CREATE INDEX "watch_records_entry_id_idx" ON "watch_records"("entry_id");
CREATE INDEX "release_queue_items_user_id_created_at_idx" ON "release_queue_items"("user_id", "created_at");

ALTER TABLE "watch_records" ADD CONSTRAINT "watch_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watch_records" ADD CONSTRAINT "watch_records_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "timeline_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "release_queue_items" ADD CONSTRAINT "release_queue_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
