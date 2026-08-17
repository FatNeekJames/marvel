import { boolean, doublePrecision, index, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const timelineEntries = pgTable(
  'timeline_entries',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    legacyKey: text('legacy_key').notNull(),
    dataset: text('dataset').notNull(),
    title: text('title').notNull(),
    universe: text('universe').notNull(),
    reality: text('reality').notNull(),
    note: text('note'),
    season: text('season'),
    episodes: text('episodes'),
    period: text('period'),
    yearStart: doublePrecision('year_start'),
    yearEnd: doublePrecision('year_end'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('timeline_entries_legacy_key_key').on(table.legacyKey),
    index('timeline_entries_dataset_reality_idx').on(table.dataset, table.reality),
    index('timeline_entries_title_idx').on(table.title)
  ]
);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    externalId: text('external_id').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('users_external_id_key').on(table.externalId)]
);

export const watchRecords = pgTable(
  'watch_records',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    entryId: text('entry_id').notNull().references(() => timelineEntries.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    watchedAt: timestamp('watched_at', { mode: 'date' }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.entryId] }),
    index('watch_records_entry_id_idx').on(table.entryId)
  ]
);

export const releaseQueueItems = pgTable(
  'release_queue_items',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    title: varchar('title', { length: 120 }).notNull(),
    completed: boolean('completed').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  (table) => [index('release_queue_items_user_id_created_at_idx').on(table.userId, table.createdAt)]
);
