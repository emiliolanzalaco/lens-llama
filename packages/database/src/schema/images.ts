import { pgTable, uuid, text, varchar, decimal, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const images = pgTable(
  'images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encryptedCid: text('encrypted_cid').notNull(),
    watermarkedCid: text('watermarked_cid').notNull(),
    encryptionKey: text('encryption_key').notNull(), // Encrypted with MASTER_ENCRYPTION_KEY
    photographerAddress: varchar('photographer_address', { length: 42 }).notNull(),
    photographerUsername: varchar('photographer_username', { length: 255 }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    tags: text('tags').array().notNull().default([]),
    priceUsdc: decimal('price_usdc', { precision: 10, scale: 2 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    photographerIdx: index('photographer_idx').on(table.photographerAddress),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
  })
);

export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
